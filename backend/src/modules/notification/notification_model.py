from pydantic import BaseModel


class UnsubscribeDto(BaseModel):
    """Request body for the token-based unsubscribe endpoint."""

    token: str


class ResubscribeDto(BaseModel):
    """Request body for the token-based resubscribe endpoint."""

    token: str


class SubscriptionStatusDto(BaseModel):
    """Response indicating whether an email address is currently subscribed."""

    is_subscribed: bool
