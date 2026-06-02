from pydantic import BaseModel


class UnsubscribeDto(BaseModel):
    token: str


class ResubscribeDto(BaseModel):
    token: str


class SubscriptionStatusDto(BaseModel):
    is_subscribed: bool
