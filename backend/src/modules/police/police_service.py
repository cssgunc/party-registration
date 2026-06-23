import secrets
from datetime import UTC, datetime, timedelta
from typing import ClassVar
from urllib.parse import urljoin

from fastapi import Depends
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    CredentialsException,
    ForbiddenException,
    NotFoundException,
)
from src.core.utils.bcrypt_utils import hash_password, verify_password
from src.core.utils.email_utils import EmailService
from src.core.utils.excel_utils import export_to_excel
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
)
from src.modules.auth.refresh_token_entity import RefreshTokenEntity
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import (
    PaginatedPoliceResponse,
    PoliceAccountDto,
    PoliceRole,
)

_POLICE_QUERY_FIELDS = QueryFieldSet(
    fields={
        "id": PoliceEntity.id,
        "email": PoliceEntity.email,
        "role": PoliceEntity.role,
        "is_verified": PoliceEntity.is_verified,
    },
    default_sort=SortParam(field="email", order=SortOrder.ASC),
)


class PoliceNotFoundException(NotFoundException):
    """Raised when no police account exists for the requested ID (HTTP 404)."""

    def __init__(self, police_id: int):
        super().__init__(f"Police account with ID {police_id} not found")


class PoliceConflictException(ConflictException):
    """Raised when a police account with the given email already exists (HTTP 409)."""

    def __init__(self, email: str):
        super().__init__(f"Police account with email {email} already exists")


class PoliceService:
    """Business-logic layer for police account management, authentication, and email flows.

    Owns the database session, email dispatch, and the paginated-query helper.
    Injected per request via FastAPI ``Depends``.
    """

    QUERY_FIELDS: ClassVar[QueryFieldSet] = _POLICE_QUERY_FIELDS

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        email_service: EmailService = Depends(),
        query_service: QueryService = Depends(),
    ):
        self.session = session
        self.email_service = email_service
        self.query_service = query_service

    async def _get_police_entity_by_id(self, police_id: int) -> PoliceEntity:
        """Fetch a `PoliceEntity` by primary key, raising if not found.

        Raises:
            PoliceNotFoundException: If no account has the given ID.
        """
        result = await self.session.execute(
            select(PoliceEntity).where(PoliceEntity.id == police_id)
        )
        police = result.scalar_one_or_none()
        if police is None:
            raise PoliceNotFoundException(police_id)
        return police

    async def _find_police_entity_by_email(self, email: str) -> PoliceEntity | None:
        """Look up a `PoliceEntity` by email (case-insensitive); returns None if absent."""
        result = await self.session.execute(
            select(PoliceEntity).where(func.lower(PoliceEntity.email) == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_police_by_id(self, police_id: int) -> PoliceAccountDto:
        """Fetch a single police account by ID.

        Raises:
            PoliceNotFoundException: If no account has the given ID.
        """
        police = await self._get_police_entity_by_id(police_id)
        return police.to_dto()

    async def get_police_paginated(self, params: ListQueryParams) -> PaginatedPoliceResponse:
        """Get police accounts with server-side pagination, sorting, and filtering."""
        base_query = select(PoliceEntity)
        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            field_set=_POLICE_QUERY_FIELDS,
        )
        return PaginatedPoliceResponse(**result.model_dump())

    def export_police_to_excel(self, police_response: PaginatedPoliceResponse) -> bytes:
        """Render a police account list as an Excel workbook (.xlsx bytes)."""
        return export_to_excel(
            resource_name="Police Accounts",
            field_map={
                "Email": lambda p: p.email,
                "Role": lambda p: "Police Admin"
                if p.role == PoliceRole.POLICE_ADMIN
                else "Officer",
            },
            items=police_response.items,
        )

    async def signup_police(self, email: str, password: str) -> None:
        """Register a new police officer account and dispatch a verification email.

        If the email already belongs to an unverified account, the existing
        record's password and verification token are refreshed (idempotent
        re-signup). Verified accounts are never overwritten.

        Raises:
            BadRequestException: If the email is not on the configured CHPD domain.
            PoliceConflictException: If the email belongs to an already-verified account.
        """
        if not email.endswith(f"@{env.CHPD_EMAIL_DOMAIN}"):
            raise BadRequestException(f"CHPD email must use the @{env.CHPD_EMAIL_DOMAIN} domain")

        hashed_password = hash_password(password)
        police = PoliceEntity(
            email=email,
            hashed_password=hashed_password,
            role=PoliceRole.OFFICER,
            is_verified=False,
        )
        token = self._populate_verification_token(police)

        try:
            self.session.add(police)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            existing = await self._find_police_entity_by_email(email)
            if existing is None or existing.is_verified:
                raise PoliceConflictException(email) from e
            existing.hashed_password = hashed_password
            token = self._populate_verification_token(existing)
            self.session.add(existing)
            await self.session.commit()

        await self.send_verification_email(email, token)

    async def retry_verification(self, email: str) -> None:
        """Re-send the verification email for an unverified account.

        Silently succeeds when the email is unknown or the account is already
        verified, preventing user enumeration.
        """
        police = await self._find_police_entity_by_email(email)
        if police is None or police.is_verified:
            # To prevent user enumeration, we return success even if the email doesn't exist or is
            # already verified.
            return

        token = self._populate_verification_token(police)

        self.session.add(police)
        await self.session.commit()

        await self.send_verification_email(email, token)

    def _populate_verification_token(self, police: PoliceEntity) -> str:
        """Reset the verification token and expiry on a police entity; does not commit."""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(hours=env.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

        police.verification_token = token
        police.verification_token_expires_at = expires_at

        return token

    async def send_verification_email(self, to: str, token: str) -> None:
        """Send an account-verification email containing a one-time link."""
        verification_url = urljoin(str(env.FRONTEND_BASE_URL), f"/police/verify?token={token}")
        html = f"""
            <p>Welcome to PartySmart.</p>
            <p>Click the link below to verify your email address:</p>
            <p><a href="{verification_url}">{verification_url}</a></p>
            <p>This link will expire in {env.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.</p>
        """
        await self.email_service.send_email(to, "Verify your PartySmart account", html)

    async def verify_police_email(self, token: str) -> None:
        """Mark a police account as verified using the emailed token.

        Clears the token and expiry after a successful verification.

        Raises:
            BadRequestException: If the token is invalid or has expired.
        """
        result = await self.session.execute(
            select(PoliceEntity).where(PoliceEntity.verification_token == token)
        )
        police = result.scalar_one_or_none()
        if police is None:
            raise BadRequestException("Invalid verification token")

        if (
            police.verification_token_expires_at is None
            or police.verification_token_expires_at < datetime.now(UTC)
        ):
            raise BadRequestException("Verification token has expired")

        police.is_verified = True
        police.verification_token = None
        police.verification_token_expires_at = None
        self.session.add(police)
        await self.session.commit()

    async def update_police(
        self, police_id: int, email: str, role: PoliceRole, is_verified: bool | None = None
    ) -> PoliceAccountDto:
        """Update a police account's email, role, and optionally its verified status.

        Raises:
            PoliceNotFoundException: If no account has the given ID.
            PoliceConflictException: If the new email is already used by another account.
        """
        police = await self._get_police_entity_by_id(police_id)

        if email.lower() != police.email.lower():
            existing = await self._find_police_entity_by_email(email)
            if existing is not None:
                raise PoliceConflictException(email)

        police.email = email
        police.role = role
        if is_verified is not None:
            police.is_verified = is_verified

        try:
            self.session.add(police)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise PoliceConflictException(email) from e
        await self.session.refresh(police)
        return police.to_dto()

    async def delete_police(self, police_id: int) -> PoliceAccountDto:
        """Delete a police account and return its final state.

        Raises:
            PoliceNotFoundException: If no account has the given ID.
        """
        police = await self._get_police_entity_by_id(police_id)
        dto = police.to_dto()
        await self.session.delete(police)
        await self.session.commit()
        return dto

    async def verify_police_credentials(self, email: str, password: str) -> PoliceAccountDto:
        """Verify police credentials. Never reveals whether the account exists."""
        police = await self._find_police_entity_by_email(email)
        if police is None or not verify_password(password, police.hashed_password):
            raise CredentialsException()
        if not police.is_verified:
            raise ForbiddenException("EMAIL_NOT_VERIFIED")
        return police.to_dto()

    def _populate_password_reset_token(self, police: PoliceEntity) -> str:
        """Reset the password-reset token and expiry on a police entity; does not commit."""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(hours=env.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
        police.password_reset_token = token
        police.password_reset_token_expires_at = expires_at
        return token

    async def request_password_reset(self, email: str) -> None:
        """Generate a password-reset token and email it to the account holder.

        Silently succeeds when the email is unknown or the account is unverified,
        preventing user enumeration.
        """
        police = await self._find_police_entity_by_email(email)
        if police is None or not police.is_verified:
            # Silently succeed to prevent user enumeration.
            return

        token = self._populate_password_reset_token(police)
        self.session.add(police)
        await self.session.commit()

        await self.send_password_reset_email(email, token)

    async def reset_password(self, token: str, new_password: str) -> None:
        """Set a new password using a previously emailed reset token.

        Invalidates all active refresh tokens for the account after a successful
        reset. Clears the reset token and expiry on success.

        Raises:
            CredentialsException: If the token is invalid or has expired.
        """
        result = await self.session.execute(
            select(PoliceEntity).where(PoliceEntity.password_reset_token == token)
        )
        police = result.scalar_one_or_none()
        if police is None:
            raise CredentialsException()

        if (
            police.password_reset_token_expires_at is None
            or police.password_reset_token_expires_at < datetime.now(UTC)
        ):
            raise CredentialsException()

        police.hashed_password = hash_password(new_password)
        police.password_reset_token = None
        police.password_reset_token_expires_at = None
        self.session.add(police)

        await self.session.execute(
            delete(RefreshTokenEntity).where(RefreshTokenEntity.police_id == police.id)
        )

        await self.session.commit()

    async def send_password_reset_email(self, to: str, token: str) -> None:
        """Send a password-reset email containing a one-time link."""
        reset_url = urljoin(str(env.FRONTEND_BASE_URL), f"/police/reset-password?token={token}")
        html = f"""
            <p>We received a request to reset your PartySmart password.</p>
            <p>Click the link below to set a new password:</p>
            <p><a href="{reset_url}">{reset_url}</a></p>
            <p>This link will expire in {env.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s).</p>
            <p>If you did not request a password reset, you can ignore this email.</p>
        """
        await self.email_service.send_email(to, "Reset your PartySmart password", html)
