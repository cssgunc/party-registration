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

        if payload.role not in roles:
            raise ForbiddenException(detail="Insufficient privileges")

        return AuthPrincipal(
            id=int(payload.sub),
            role=Role(payload.role),
            principal_type=payload.principal_type,
        )

    return _authenticate


authenticate_user = authenticate_by_role("student", "staff", "admin", "officer", "police_admin")
authenticate_admin = authenticate_by_role("admin")
authenticate_staff_or_admin = authenticate_by_role("staff", "admin")
authenticate_student_or_admin = authenticate_by_role("student", "admin")
authenticate_student = authenticate_by_role("student")
authenticate_police_or_admin = authenticate_by_role("officer", "police_admin", "admin")
authenticate_police_staff_or_admin = authenticate_by_role(
    "officer", "police_admin", "staff", "admin"
)
authenticate_police_admin_or_admin = authenticate_by_role("police_admin", "admin")
