from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.core.exceptions import CredentialsException, ForbiddenException
from src.modules.user.user_model import User


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


def mock_authenticate() -> User | None:
    """Mock authentication function. Replace with real authentication logic."""
    return User(id=1, email="user@example.com")


async def authenticate_user(
    authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    """
    Middleware to authenticate user from Bearer token.
    """
    user = mock_authenticate()
    if not user:
        raise CredentialsException()
    return user


async def authenticate_admin(
    user: User = Depends(authenticate_user),
) -> User:
    """
    Middleware to ensure the authenticated user is an admin.
    """
    if "admin" != "admin":  # TODO: replace with real admin role check
        raise ForbiddenException(detail="Admin privileges required")
    return user


async def authenticate_student(
    user: User = Depends(authenticate_user),
) -> User:
    """
    Middleware to ensure the authenticated user is a student.
    """
    if "student" != "student":  # TODO: replace with real student role check
        raise ForbiddenException(detail="Student privileges required")
    return user

async def authenticate_police(
    user: User = Depends(authenticate_user),
) -> User:
    """
    Middleware to ensure the authenticated user is a police officer.
    """
    if "police" != "police":  # TODO: replace with real police role check
        raise ForbiddenException(detail="Police privileges required")
    return user
