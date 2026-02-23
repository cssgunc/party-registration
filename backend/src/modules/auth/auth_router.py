from fastapi import APIRouter, Depends, Header, status
from src.core.authentication import authenticate_by_role
from src.core.config import env
from src.modules.account.account_model import AccountData
from src.modules.account.account_service import AccountService
from src.modules.auth.auth_model import (
    AccessTokenDto,
    PoliceCredentialsDto,
    RefreshTokenDto,
    TokensDto,
)
from src.modules.auth.auth_service import AuthService, InvalidInternalSecretException
from src.modules.police.police_service import PoliceService

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def verify_internal_secret(
    x_internal_secret: str = Header(..., alias="X-Internal-Secret"),
) -> None:
    """
    Dependency function to verify the internal API secret.

    Args:
        x_internal_secret: The internal secret from the request header

    Raises:
        InvalidInternalSecretException: If secret is invalid
    """
    if x_internal_secret != env.INTERNAL_API_SECRET:
        raise InvalidInternalSecretException()


@router.post("/exchange")
async def exchange_account_data_for_tokens(
    data: AccountData,
    account_service: AccountService = Depends(),
    auth_service: AuthService = Depends(),
    _: None = Depends(verify_internal_secret),
) -> TokensDto:
    """
    Exchange SAML account data for JWT tokens.

    This endpoint is called by the Next.js server after SAML SSO callback.
    It creates or updates the account and returns a token pair.

    Requires internal API secret in X-Internal-Secret header.
    """
    # Get or create account by email
    try:
        account = await account_service.get_account_by_email(data.email)
        # Only update if data has changed
        if (
            account.first_name != data.first_name
            or account.last_name != data.last_name
            or account.pid != data.pid
            or account.onyen != data.onyen
            or account.role != data.role
        ):
            account = await account_service.update_account(account.id, data)
    except Exception:
        # Create new account
        account = await account_service.create_account(data)

    # Generate token pair
    return await auth_service.exchange_account_for_tokens(account)


@router.post("/police/login")
async def police_login(
    credentials: PoliceCredentialsDto,
    police_service: PoliceService = Depends(),
    auth_service: AuthService = Depends(),
    _: None = Depends(verify_internal_secret),
) -> TokensDto:
    """
    Authenticate police credentials and return JWT tokens.

    This endpoint is called by the Next.js server for police login.

    Requires internal API secret in X-Internal-Secret header.
    """
    # Verify credentials
    police = await police_service.verify_police_credentials(credentials.email, credentials.password)

    # Generate token pair
    police_dto = police.to_dto()
    return await auth_service.exchange_police_for_tokens(police_dto)


@router.post("/refresh")
async def refresh_access_token(
    data: RefreshTokenDto,
    auth_service: AuthService = Depends(),
    _: None = Depends(verify_internal_secret),
) -> AccessTokenDto:
    """
    Refresh an access token using a valid refresh token.

    This endpoint is called by the Next.js server when the access token expires.

    Requires internal API secret in X-Internal-Secret header.
    """
    return await auth_service.refresh_access_token(data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    data: RefreshTokenDto,
    auth_service: AuthService = Depends(),
    _=Depends(authenticate_by_role("student", "admin", "staff", "police")),
) -> None:
    """
    Logout by revoking the refresh token.

    This removes the refresh token from the database allow-list,
    preventing it from being used to generate new access tokens.

    Requires valid access token in Authorization header.
    """
    await auth_service.revoke_refresh_token(data.refresh_token)
