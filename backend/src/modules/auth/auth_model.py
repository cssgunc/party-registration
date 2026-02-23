from pydantic import AwareDatetime, BaseModel, EmailStr


class AccountAccessTokenPayload(BaseModel):
    """JWT payload for account access tokens."""

    sub: str  # "account"
    id: int
    email: str
    first_name: str
    last_name: str
    pid: str
    onyen: str
    role: str
    exp: AwareDatetime
    iat: AwareDatetime


class PoliceAccessTokenPayload(BaseModel):
    """JWT payload for police access tokens."""

    sub: str  # "police"
    email: str
    exp: AwareDatetime
    iat: AwareDatetime


class RefreshTokenPayload(BaseModel):
    """JWT payload for refresh tokens."""

    jti: str
    sub: str  # str(account_id) or "police"
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
