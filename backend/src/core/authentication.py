from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.core.exceptions import CredentialsException, ForbiddenException
from src.modules.account.account_model import Account, AccountRole


class HTTPBearer401(HTTPBearer):
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )


bearer_scheme = HTTPBearer401()


def mock_authenticate(role: AccountRole) -> Account | None:
    """Mock authentication function. Replace with real authentication logic."""
    role_to_id = {
        AccountRole.STUDENT: 1,
        AccountRole.ADMIN: 2,
        AccountRole.POLICE: 3,
    }
    return Account(
        id=role_to_id[role],
        email="user@example.com",
        password="hashed_password",
        role=role,
    )


async def authenticate_user(
    authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> Account:
    """
    Middleware to authenticate user from Bearer token.
    Expects token to be one of: "student", "admin", "police" for mock authentication.
    """
    token = authorization.credentials.lower()

    role_map = {
        "student": AccountRole.STUDENT,
        "admin": AccountRole.ADMIN,
        "police": AccountRole.POLICE,
    }

    if token not in role_map:
        raise CredentialsException()

    user = mock_authenticate(role_map[token])
    if not user:
        raise CredentialsException()
    return user


async def authenticate_admin(
    user: Account = Depends(authenticate_user),
) -> Account:
    """
    Middleware to ensure the authenticated user is an admin.
    """
    admin = mock_authenticate(AccountRole.ADMIN)
    if not admin or user.role != AccountRole.ADMIN:
        raise ForbiddenException(detail="Admin privileges required")
    return admin


async def authenticate_student(
    user: Account = Depends(authenticate_user),
) -> Account:
    """
    Middleware to ensure the authenticated user is a student.
    """
    student = mock_authenticate(AccountRole.STUDENT)
    if not student or user.role != AccountRole.STUDENT:
        raise ForbiddenException(detail="Student privileges required")
    return student


async def authenticate_police(
    user: Account = Depends(authenticate_user),
) -> Account:
    """
    Middleware to ensure the authenticated user is a police officer.
    """
    police = mock_authenticate(AccountRole.POLICE)
    if not police or user.role != AccountRole.POLICE:
        raise ForbiddenException(detail="Police privileges required")
    return police
