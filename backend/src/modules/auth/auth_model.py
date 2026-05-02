from typing import Literal

from pydantic import AwareDatetime, BaseModel, EmailStr
from src.modules.account.account_model import AccountDto, Role, StringRole
from src.modules.police.police_model import PoliceAccountDto


class AccessTokenPayload(BaseModel):
    """JWT payload for access tokens.

    `sub` is `str(account.id)`. JWT spec (RFC 7519 §4.1.2) requires `sub` to be a
    string; convert to int at the boundary when using the authenticated principal.
    """

    sub: str
    role: StringRole
    exp: AwareDatetime
    iat: AwareDatetime

    @property
    def principal_type(self) -> Literal["account", "police"]:
        return "police" if self.role in {"officer", "police_admin"} else "account"


class AuthPrincipal(BaseModel):
    """Minimal authenticated principal derived from an access token."""

    id: int
    role: Role
    principal_type: Literal["account", "police"]


class RefreshTokenPayload(BaseModel):
    """JWT payload for refresh tokens."""

    jti: str
    sub: str  # str(account_id) or str(police_id)
    exp: AwareDatetime
    iat: AwareDatetime


class AccessTokenDto(BaseModel):
    """DTO for access token response."""

    access_token: str
    access_token_expires: AwareDatetime


class RefreshTokenDto(BaseModel):
    """DTO for refresh token input."""

    refresh_token: str


class TokensDto(BaseModel):
    """DTO for token pair response (access + refresh)."""

    refresh_token: str
    refresh_token_expires: AwareDatetime
    access_token: str
    access_token_expires: AwareDatetime


class PoliceCredentialsDto(BaseModel):
    """DTO for police login credentials."""

    email: EmailStr
    password: str


class VerifyEmailDto(BaseModel):
    """DTO for email verification."""

    token: str


class RetryVerificationDto(BaseModel):
    """DTO for retrying email verification."""

    email: EmailStr


class AccountMeDto(AccountDto):
    principal_type: Literal["account"] = "account"


class PoliceMeDto(PoliceAccountDto):
    principal_type: Literal["police"] = "police"


CurrentPrincipalDto = AccountMeDto | PoliceMeDto
