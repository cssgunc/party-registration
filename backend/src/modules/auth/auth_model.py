from typing import Literal

from pydantic import AwareDatetime, BaseModel, EmailStr
from src.modules.account.account_model import AccountDto, Role, StringRole
from src.modules.police.police_model import PoliceAccountDto


class AccessTokenPayload(BaseModel):
    """JWT payload for short-lived access tokens.

    ``sub`` is ``str(account.id)`` per RFC 7519 §4.1.2, which requires the
    subject claim to be a string.  Convert to ``int`` at the boundary when
    constructing an `AuthPrincipal`.
    """

    sub: str
    role: StringRole
    exp: AwareDatetime
    iat: AwareDatetime

    @property
    def principal_type(self) -> Literal["account", "police"]:
        """Return ``"police"`` for officer/police_admin roles, ``"account"`` otherwise."""
        return "police" if self.role in {"officer", "police_admin"} else "account"


class AuthPrincipal(BaseModel):
    """Minimal authenticated principal derived from a decoded access token.

    Passed as a dependency into route handlers that need the caller's identity
    without fetching a full account row from the database.
    """

    id: int
    role: Role
    principal_type: Literal["account", "police"]


class RefreshTokenPayload(BaseModel):
    """JWT payload for long-lived refresh tokens.

    ``jti`` is a UUID stored as a SHA-256 hash in the ``refresh_tokens`` table
    for server-side revocation.  ``sub`` mirrors the access token convention:
    ``str(account_id)`` for UNC accounts or ``str(police_id)`` for police.
    """

    jti: str
    sub: str
    exp: AwareDatetime
    iat: AwareDatetime


class AccessTokenDto(BaseModel):
    """Response DTO carrying a newly issued access token and its expiry."""

    access_token: str
    access_token_expires: AwareDatetime


class RefreshTokenDto(BaseModel):
    """Request DTO carrying a refresh token (used for token refresh and logout)."""

    refresh_token: str


class TokensDto(BaseModel):
    """Response DTO carrying a full access/refresh token pair after login or exchange."""

    refresh_token: str
    refresh_token_expires: AwareDatetime
    access_token: str
    access_token_expires: AwareDatetime


class PoliceCredentialsDto(BaseModel):
    """Request DTO for police email/password login."""

    email: EmailStr
    password: str


class VerifyEmailDto(BaseModel):
    """Request DTO carrying the one-time token from a police verification email."""

    token: str


class RetryVerificationDto(BaseModel):
    """Request DTO for re-sending a police verification email."""

    email: EmailStr


class AccountMeDto(AccountDto):
    """``/me`` response shape for UNC account principals (student, staff, admin)."""

    principal_type: Literal["account"] = "account"


class PoliceMeDto(PoliceAccountDto):
    """``/me`` response shape for police principals (officer, police_admin)."""

    principal_type: Literal["police"] = "police"


CurrentPrincipalDto = AccountMeDto | PoliceMeDto
