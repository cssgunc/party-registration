from fastapi import APIRouter, Depends, Query

from .notification_model import ResubscribeDto, SubscriptionStatusDto, UnsubscribeDto
from .notification_service import NotificationService

notification_router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@notification_router.post("/unsubscribe", status_code=204)
async def unsubscribe(
    body: UnsubscribeDto,
    notification_service: NotificationService = Depends(),
) -> None:
    """
    Unsubscribe an email from party notifications using a signed token.

    The token is embedded in the notification management link sent in emails.
    Idempotent: unsubscribing an already-unsubscribed email is a no-op.
    """
    email = notification_service.decode_token(body.token)
    await notification_service.unsubscribe(email)


@notification_router.post("/unsubscribe/one-click", status_code=204)
async def unsubscribe_one_click(
    token: str = Query(...),
    notification_service: NotificationService = Depends(),
) -> None:
    """
    RFC 8058 one-click unsubscribe. Mail clients POST to this URL directly.
    Token is passed as a query parameter; body is ignored.
    """
    email = notification_service.decode_token(token)
    await notification_service.unsubscribe(email)


@notification_router.post("/resubscribe", status_code=204)
async def resubscribe(
    body: ResubscribeDto,
    notification_service: NotificationService = Depends(),
) -> None:
    """
    Resubscribe an email to party notifications using a signed token.
    Idempotent: resubscribing an already-subscribed email is a no-op.
    """
    email = notification_service.decode_token(body.token)
    await notification_service.resubscribe(email)


@notification_router.get("/subscription-status")
async def subscription_status(
    token: str = Query(...),
    notification_service: NotificationService = Depends(),
) -> SubscriptionStatusDto:
    """
    Return the subscription status for the email encoded in the token.
    Used by the frontend notification management page on load.
    """
    email = notification_service.decode_token(token)
    unsubscribed = await notification_service.is_unsubscribed(email)
    return SubscriptionStatusDto(is_subscribed=(not unsubscribed))
