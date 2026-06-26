from typing import Any

from fastapi import APIRouter, Depends, Query
from src.core.exceptions import error_response

from .notification_model import ResubscribeDto, SubscriptionStatusDto, UnsubscribeDto
from .notification_service import NotificationService

notification_router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Shared OpenAPI error responses for all routes that accept a signed token.
_TOKEN_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: error_response("Token is malformed or has an invalid signature"),
}


@notification_router.post(
    "/unsubscribe",
    status_code=204,
    summary="Unsubscribe an email from notifications",
    responses=_TOKEN_RESPONSES,
)
async def unsubscribe(
    body: UnsubscribeDto,
    notification_service: NotificationService = Depends(),
) -> None:
    """Unsubscribe an email from party notifications using a signed token.

    The token is embedded in the notification management link sent in emails.
    Idempotent: unsubscribing an already-unsubscribed email is a no-op.

    Raises:
        UnsubscribeTokenInvalidException: If the token is malformed or the
            HMAC signature does not match.
    """
    email = notification_service.decode_token(body.token)
    await notification_service.unsubscribe(email)


@notification_router.post(
    "/unsubscribe/one-click",
    status_code=204,
    summary="One-click unsubscribe (RFC 8058)",
    responses=_TOKEN_RESPONSES,
)
async def unsubscribe_one_click(
    token: str = Query(...),
    notification_service: NotificationService = Depends(),
) -> None:
    """Handle an RFC 8058 one-click unsubscribe request from a mail client.

    Mail clients POST to this URL directly; the signed token is passed as a
    query parameter and the request body is ignored. Idempotent.

    Raises:
        UnsubscribeTokenInvalidException: If the token is malformed or the
            HMAC signature does not match.
    """
    email = notification_service.decode_token(token)
    await notification_service.unsubscribe(email)


@notification_router.post(
    "/resubscribe",
    status_code=204,
    summary="Resubscribe an email to notifications",
    responses=_TOKEN_RESPONSES,
)
async def resubscribe(
    body: ResubscribeDto,
    notification_service: NotificationService = Depends(),
) -> None:
    """Resubscribe an email to party notifications using a signed token.

    Idempotent: resubscribing an already-subscribed email is a no-op.

    Raises:
        UnsubscribeTokenInvalidException: If the token is malformed or the
            HMAC signature does not match.
    """
    email = notification_service.decode_token(body.token)
    await notification_service.resubscribe(email)


@notification_router.get(
    "/subscription-status",
    summary="Get subscription status for a token",
    responses=_TOKEN_RESPONSES,
)
async def subscription_status(
    token: str = Query(...),
    notification_service: NotificationService = Depends(),
) -> SubscriptionStatusDto:
    """Return the subscription status for the email encoded in the token.

    Used by the frontend notification management page on load to determine
    whether to show an unsubscribe or resubscribe option.

    Raises:
        UnsubscribeTokenInvalidException: If the token is malformed or the
            HMAC signature does not match.
    """
    email = notification_service.decode_token(token)
    unsubscribed = await notification_service.is_unsubscribed(email)
    return SubscriptionStatusDto(is_subscribed=(not unsubscribed))
