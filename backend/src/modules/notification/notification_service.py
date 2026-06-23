import base64
import hashlib
import hmac
import logging
from html import escape
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import BadRequestException
from src.core.utils.email_utils import EmailService
from src.modules.party.party_model import PartyDto

from .email_unsubscribe_entity import EmailUnsubscribeEntity

logger = logging.getLogger(__name__)


class UnsubscribeTokenInvalidException(BadRequestException):
    """Raised when an unsubscribe token is missing, malformed, or has a bad signature (HTTP 400)."""

    def __init__(self, detail: str):
        super().__init__(detail=detail)


class NotificationService:
    """Service for email notification delivery and subscription management.

    Handles sending party registration confirmation emails to both contacts,
    building HMAC-signed subscription tokens, and persisting unsubscribe/resubscribe
    state. Injected per request via FastAPI ``Depends``.
    """

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        email_service: EmailService = Depends(),
    ):
        self.session = session
        self.email_service = email_service

    # ============================= Token helpers =============================

    def _make_token(self, email: str) -> str:
        """Build a URL-safe token encoding the email, signed with INTERNAL_API_SECRET.

        The token format is ``<base64url(email)>.<sha256-hmac-hex>``. The email
        is lowercased before encoding so tokens are case-insensitive and the
        signature can be verified independently of the original casing.
        """
        email_b64 = base64.urlsafe_b64encode(email.lower().encode()).decode()
        sig = hmac.new(
            env.INTERNAL_API_SECRET.encode(),
            email.lower().encode(),
            hashlib.sha256,
        ).hexdigest()
        return f"{email_b64}.{sig}"

    def decode_token(self, token: str) -> str:
        """Decode and verify a signed subscription token, returning the email.

        Splits on the first ``.``, base64url-decodes the email segment, then
        recomputes the HMAC and compares with a constant-time digest to prevent
        timing attacks.

        Raises:
            UnsubscribeTokenInvalidException: If the token cannot be split/decoded
                (malformed) or if the HMAC signature does not match (tampered).
        """
        try:
            email_b64, sig = token.split(".", 1)
            email = base64.urlsafe_b64decode(email_b64.encode()).decode()
        except Exception as e:
            raise UnsubscribeTokenInvalidException("Malformed token") from e

        expected_sig = hmac.new(
            env.INTERNAL_API_SECRET.encode(),
            email.lower().encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(sig, expected_sig):
            raise UnsubscribeTokenInvalidException("Invalid token signature")

        return email

    # ============================= Unsubscribe ===============================

    async def is_unsubscribed(self, email: str) -> bool:
        """Return True if the email is on the unsubscribe list."""
        result = await self.session.execute(
            select(EmailUnsubscribeEntity).where(EmailUnsubscribeEntity.email == email.lower())
        )
        return result.scalar_one_or_none() is not None

    async def unsubscribe(self, email: str) -> None:
        """Add email to the unsubscribe list. Idempotent."""
        try:
            self.session.add(EmailUnsubscribeEntity(email=email.lower()))
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()

    async def resubscribe(self, email: str) -> None:
        """Remove email from the unsubscribe list. Idempotent."""
        result = await self.session.execute(
            select(EmailUnsubscribeEntity).where(EmailUnsubscribeEntity.email == email.lower())
        )
        entity = result.scalar_one_or_none()
        if entity is not None:
            await self.session.delete(entity)
            await self.session.commit()

    # ============================= Notifications =============================

    def _management_url(self, email: str) -> str:
        """Build the frontend notification management URL for the given email."""
        token = self._make_token(email)
        return urljoin(str(env.FRONTEND_BASE_URL), f"/notifications?token={token}")

    def _one_click_unsubscribe_url(self, email: str) -> str:
        """Build the RFC 8058 one-click unsubscribe API URL for the given email."""
        token = self._make_token(email)
        return urljoin(
            str(env.API_BASE_URL),
            f"/api/notifications/unsubscribe/one-click?token={token}",
        )

    def _list_unsubscribe_headers(self, email: str) -> dict[str, str]:
        """Return the ``List-Unsubscribe`` and ``List-Unsubscribe-Post`` headers for RFC 8058."""
        return {
            "List-Unsubscribe": f"<{self._one_click_unsubscribe_url(email)}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }

    def _party_notification_html(
        self, party: PartyDto, recipient_name: str, email: str, *, is_contact_two: bool = False
    ) -> str:
        """Render the HTML body for a party registration confirmation email.

        All user-supplied strings are HTML-escaped. When ``is_contact_two`` is
        True, a secondary-contact notice is inserted to clarify the recipient's
        role in the registration.
        """
        dt = party.party_datetime.astimezone(ZoneInfo("America/New_York")).strftime(
            "%B %-d, %Y at %-I:%M %p %Z"
        )
        management_url = self._management_url(email)
        c1 = party.contact_one
        c2 = party.contact_two
        contact_two_notice = (
            """
            <p style="margin:0 0 16px 0;">
                <strong>Please note:</strong> You are listed as the
                <strong>secondary contact</strong>
                for this registration. Being listed as a secondary contact does not mean you are
                registered for Party Smart. If you wish to become a primary contact, you must
                complete the required course and registration process independently.
            </p>
            """
            if is_contact_two
            else ""
        )
        return f"""
            <p style="margin:0 0 12px 0;">Hi {escape(recipient_name)},</p>
            <p style="margin:0 0 16px 0;">
                A party registration has been submitted with you listed as a contact.
            </p>
            {contact_two_notice}
            <ul style="margin:0 0 16px 0;padding-left:20px;">
                <li><strong>Address:</strong> {escape(party.location.formatted_address)}</li>
                <li><strong>Date &amp; Time:</strong> {dt}</li>
                <li><strong>Contact One:</strong>
                    {escape(c1.first_name)} {escape(c1.last_name)} ({escape(c1.email)})</li>
                <li><strong>Contact Two:</strong>
                    {escape(c2.first_name)} {escape(c2.last_name)} ({escape(c2.email)})</li>
            </ul>
            <p style="margin:24px 0 0 0;font-size:12px;color:#6b7280;">
                <a href="{management_url}" style="color:#6b7280;">
                    Unsubscribe or manage your notifications here
                </a>
            </p>
        """

    async def _send_party_notification(
        self, party: PartyDto, email: str, first_name: str, *, is_contact_two: bool = False
    ) -> None:
        """Send a single party registration confirmation email.

        Attaches RFC 8058 ``List-Unsubscribe`` headers so mail clients can
        surface an unsubscribe action without the recipient opening the email.
        """
        html = self._party_notification_html(
            party, first_name, email, is_contact_two=is_contact_two
        )
        headers = self._list_unsubscribe_headers(email)
        await self.email_service.send_email(
            email, "Party registration confirmation", html, headers=headers
        )

    async def notify_party_created(self, party: PartyDto) -> None:
        """Send party notification emails to both contacts. Failures are logged, not raised."""
        recipients = [
            (party.contact_one.email, party.contact_one.first_name, False),
            (party.contact_two.email, party.contact_two.first_name, True),
        ]
        for email, first_name, is_contact_two in recipients:
            try:
                if await self.is_unsubscribed(email):
                    continue
                await self._send_party_notification(
                    party, email, first_name, is_contact_two=is_contact_two
                )
            except Exception:
                logger.exception("Failed to send party notification to %s", email)

    async def notify_contact_two_changed(self, party: PartyDto) -> None:
        """Notify the new contact_two when they are added to an existing party."""
        email = party.contact_two.email
        try:
            if await self.is_unsubscribed(email):
                return
            await self._send_party_notification(
                party, email, party.contact_two.first_name, is_contact_two=True
            )
        except Exception:
            logger.exception("Failed to send party notification to %s", email)
