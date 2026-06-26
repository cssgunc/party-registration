from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.core.exceptions import CredentialsException, ForbiddenException
from src.modules.account.account_model import Role, StringRole
from src.modules.auth.auth_model import AuthPrincipal
from src.modules.auth.auth_service import AuthService


class HTTPBearer401(HTTPBearer):
    """HTTPBearer variant that raises CredentialsException (401) instead of the default 403."""

    async def __call__(self, request: Request):
        """Extract and return the bearer credentials, raising 401 on any failure."""
        try:
            return await super().__call__(request)
        except Exception as e:
            raise CredentialsException() from e


bearer_scheme = HTTPBearer401()


def authenticate_by_role(*roles: StringRole):
    """Return a FastAPI dependency that validates the JWT and enforces role membership.

    Decodes the bearer token from the Authorization header and verifies that
    the caller's role is one of the allowed ``roles``. Pass no roles to skip
    the role check (authenticate any valid token).

    Args:
        *roles: Roles permitted to access the endpoint. If empty, any
            authenticated user is allowed.

    Returns:
        An async FastAPI dependency that resolves to the ``AuthPrincipal`` of
        the authenticated caller.

    Raises:
        CredentialsException: If the token is missing, invalid, or expired (401).
        ForbiddenException: If the caller's role is not in ``roles`` (403).
    """

    async def _authenticate(
        authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
        auth_service: AuthService = Depends(),
    ) -> AuthPrincipal:
        token = authorization.credentials
        payload = auth_service.decode_access_token(token)

        if roles and payload.role not in roles:
            raise ForbiddenException(detail="Insufficient privileges")

        return AuthPrincipal(
            id=int(payload.sub),
            role=Role(payload.role),
            principal_type=payload.principal_type,
        )

    return _authenticate


authenticate_user = authenticate_by_role()  # No role restriction, just authenticate and return
