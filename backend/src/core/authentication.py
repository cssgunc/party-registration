from core.exceptions import CredentialsException
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from modules.user.user_model import User


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
