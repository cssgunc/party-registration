from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.core.exceptions import CredentialsException, ForbiddenException
from src.modules.account.account_model import Role, StringRole
from src.modules.auth.auth_model import AuthPrincipal
from src.modules.auth.auth_service import AuthService


class HTTPBearer401(HTTPBearer):
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except Exception as e:
            raise CredentialsException() from e


bearer_scheme = HTTPBearer401()


def authenticate_by_role(*roles: StringRole):
    """
    Middleware factory to ensure the authenticated user has one of the specified roles.
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
