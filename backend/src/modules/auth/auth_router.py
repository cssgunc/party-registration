from fastapi import APIRouter, Depends, Header, Response, status
from src.core.authentication import authenticate_by_role, authenticate_user
from src.core.config import env
from src.core.exceptions import error_response
from src.modules.account.account_model import AccountData
from src.modules.account.account_service import AccountService
from src.modules.auth.auth_model import (
    AccessTokenDto,
    AccountMeDto,
    AuthPrincipal,
    CurrentPrincipalDto,
    PoliceCredentialsDto,
    PoliceMeDto,
    RefreshTokenDto,
    RetryVerificationDto,
    TokensDto,
    VerifyEmailDto,
)
from src.modules.auth.auth_service import AuthService, InvalidInternalSecretException
from src.modules.police.police_model import ForgotPasswordDto, PoliceSignupDto, ResetPasswordDto
from src.modules.police.police_service import PoliceService

# Shared OpenAPI error responses for endpoints protected by the internal API secret.
_INTERNAL_SECRET_RESPONSE = {
    403: error_response("X-Internal-Secret header is missing or invalid"),
}


def no_store_response(response: Response) -> None:
    """Set Cache-Control: no-store on every auth response to prevent token caching."""
    response.headers["Cache-Control"] = "no-store"


router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"],
    dependencies=[Depends(no_store_response)],
)


def verify_internal_secret(
    x_internal_secret: str = Header(..., alias="X-Internal-Secret"),
) -> None:
    """Verify the internal API secret supplied in the ``X-Internal-Secret`` header.

    Raises:
        InvalidInternalSecretException: If the header value does not match the
            configured ``INTERNAL_API_SECRET``.
    """
    if x_internal_secret != env.INTERNAL_API_SECRET:
        raise InvalidInternalSecretException()


@router.post(
    "/exchange",
    summary="Exchange SAML account data for a token pair",
    responses={
        **_INTERNAL_SECRET_RESPONSE,
        400: error_response("Both account_id and police_id were provided to token creation"),
        409: error_response("Account already exists with a conflicting email, onyen, or PID"),
    },
)
async def exchange_account_data_for_tokens(
    data: AccountData,
    auth_service: AuthService = Depends(),
    _: None = Depends(verify_internal_secret),
) -> TokensDto:
    """Provision or update a UNC account from SAML data, then return JWT tokens.

    Called by the Next.js server immediately after a successful SAML SSO callback.
    The account is upserted (keyed on PID) and any pending invite is resolved.
    A student entity row is ensured for STUDENT-role accounts.

    Requires ``X-Internal-Secret`` header — the Next.js backend sends this to
    prevent direct external calls to the endpoint.

    Raises:
        InvalidInternalSecretException: If the internal secret header is wrong.
        BadRequestException: If both ``account_id`` and ``police_id`` are
            supplied simultaneously during token creation (internal logic error).
        ConflictException: If the upsert hits a unique-key conflict on email,
            onyen, or PID that cannot be resolved.
    """
    account = await auth_service.provision_saml_account(data)
    return await auth_service.exchange_for_tokens(account)


@router.post(
    "/police/signup",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sign up as a police officer",
    responses={
        400: error_response("Email is not a valid CHPD domain address"),
        409: error_response("Email is already registered to a verified police account"),
    },
)
async def police_signup(
    data: PoliceSignupDto,
    police_service: PoliceService = Depends(),
) -> None:
    """Register a new police officer account and send a verification email.

    The email must belong to the configured CHPD domain (``env.CHPD_EMAIL_DOMAIN``).
    After signing up, the officer must verify their email before logging in.

    Raises:
        BadRequestException: If the email domain is not the CHPD domain.
        PoliceConflictException: If the email is already used by a verified account.
    """
    await police_service.signup_police(data.email, data.password)


@router.post(
    "/police/retry-verification",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Resend the email verification link",
)
async def police_retry_verification(
    data: RetryVerificationDto,
    police_service: PoliceService = Depends(),
) -> None:
    """Resend the verification email to a police officer.

    Always returns 204 regardless of whether the email is registered, to
    prevent user enumeration.
    """
    await police_service.retry_verification(data.email)


@router.post(
    "/police/verify",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Verify a police officer's email address",
    responses={
        400: error_response("Verification token is invalid or has expired"),
    },
)
async def police_verify_email(
    data: VerifyEmailDto,
    police_service: PoliceService = Depends(),
) -> None:
    """Verify a police officer's email using the token from the verification email.

    Raises:
        BadRequestException: If the token is not found in the DB or has expired.
    """
    await police_service.verify_police_email(data.token)


@router.post(
    "/police/forgot-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Request a password reset email",
)
async def police_forgot_password(
    data: ForgotPasswordDto,
    police_service: PoliceService = Depends(),
) -> None:
    """Send a password-reset link to a police officer's email address.

    Always returns 204 regardless of whether the email exists, to prevent
    user enumeration.
    """
    await police_service.request_password_reset(data.email)


@router.post(
    "/police/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reset a police officer's password",
    responses={
        401: error_response("Reset token is invalid or has expired"),
    },
)
async def police_reset_password(
    data: ResetPasswordDto,
    police_service: PoliceService = Depends(),
) -> None:
    """Reset a police officer's password using a valid password-reset token.

    Raises:
        CredentialsException: If the reset token is invalid or has expired (HTTP 401).
    """
    await police_service.reset_password(data.token, data.password)


@router.post(
    "/police/login",
    summary="Log in as a police officer",
    responses={
        **_INTERNAL_SECRET_RESPONSE,
        401: error_response(
            "Invalid email or password — unknown email returns 401, not 404, "
            "to avoid revealing which accounts exist"
        ),
    },
)
async def police_login(
    credentials: PoliceCredentialsDto,
    police_service: PoliceService = Depends(),
    auth_service: AuthService = Depends(),
    _: None = Depends(verify_internal_secret),
) -> TokensDto:
    """Authenticate police credentials and return a JWT token pair.

    Called by the Next.js server for the police login flow.  An unknown email
    returns **401** (not 404) by design — the response must not reveal whether
    an account exists.  An unverified email returns **403**.

    Requires ``X-Internal-Secret`` header.

    Raises:
        InvalidInternalSecretException: If the internal secret header is wrong.
        CredentialsException: If the email/password combination is invalid (HTTP 401).
        ForbiddenException: If the email has not been verified yet (HTTP 403).
    """
    police = await police_service.verify_police_credentials(credentials.email, credentials.password)
    return await auth_service.exchange_for_tokens(police)


@router.post(
    "/refresh",
    summary="Refresh an access token",
    responses={
        **_INTERNAL_SECRET_RESPONSE,
        401: error_response("Refresh token is invalid or has expired"),
        404: error_response("The account or police user for this token was not found"),
    },
)
async def refresh_access_token(
    data: RefreshTokenDto,
    auth_service: AuthService = Depends(),
    _: None = Depends(verify_internal_secret),
) -> AccessTokenDto:
    """Issue a new access token using a valid refresh token.

    Called by the Next.js server when the short-lived access token expires.
    The refresh token is validated against the server-side allow-list (its hash
    must be present in the ``refresh_tokens`` table and must not be expired).

    Requires ``X-Internal-Secret`` header.

    Raises:
        InvalidInternalSecretException: If the internal secret header is wrong.
        InvalidRefreshTokenException: If the refresh token is invalid, expired,
            or has been revoked (HTTP 401).
        AccountNotFoundException / PoliceNotFoundException: If the token's subject
            no longer exists in the DB (HTTP 404).
    """
    return await auth_service.refresh_access_token(data.refresh_token)


@router.get(
    "/me",
    summary="Get the current authenticated principal",
)
async def get_current_principal(
    principal: AuthPrincipal = Depends(authenticate_user),
    account_service: AccountService = Depends(),
    police_service: PoliceService = Depends(),
) -> CurrentPrincipalDto:
    """Return the authenticated user's full profile.

    The response shape is discriminated on ``principal_type``:

    - **account**: returns an ``AccountMeDto`` (student, staff, or admin).
    - **police**: returns a ``PoliceMeDto`` (officer or police admin).
    """
    if principal.principal_type == "police":
        police = await police_service.get_police_by_id(principal.id)
        return PoliceMeDto(**police.model_dump())

    account = await account_service.get_account_by(id=principal.id)
    return AccountMeDto(**account.model_dump())


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log out by revoking the refresh token",
)
async def logout(
    data: RefreshTokenDto,
    auth_service: AuthService = Depends(),
    _=Depends(authenticate_by_role("student", "admin", "staff", "officer", "police_admin")),
) -> None:
    """Revoke a refresh token, preventing it from issuing new access tokens.

    The token's ``jti`` hash is removed from the ``refresh_tokens`` allow-list.
    Silently succeeds if the token is already invalid or expired — the net effect
    is the same. Requires a valid access token in the ``Authorization`` header.
    """
    await auth_service.revoke_refresh_token(data.refresh_token)
