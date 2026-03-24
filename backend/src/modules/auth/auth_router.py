from fastapi import APIRouter, Depends, Header, status
from src.core.authentication import authenticate_by_role
from src.core.config import env
from src.core.exceptions import ForbiddenException, NotFoundException
from src.modules.account.account_model import AccountData, AccountRole
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
    if data.role == AccountRole.STUDENT:
        try:
            account = await account_service.get_account_by_onyen(data.onyen)
            account_entity = await account_service._get_account_entity_by_id(account.id)
            account_entity.first_name = data.first_name
            account_entity.last_name = data.last_name
            account_entity.email = data.email
            account_entity.pid = data.pid
            account_service.session.add(account_entity)
            await account_service.session.commit()
            await account_service.session.refresh(account_entity)
            account = account_entity.to_dto()
        except NotFoundException:
            account = await account_service.create_account(data)
    else:
        try:
            account = await account_service.get_account_by_onyen(data.onyen)
        except NotFoundException:
            raise ForbiddenException(detail="No matching account found") from None
        if account.role != data.role:
            raise ForbiddenException(detail="Role mismatch")

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
