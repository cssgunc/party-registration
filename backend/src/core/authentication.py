from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.core.exceptions import CredentialsException, ForbiddenException
from src.modules.account.account_model import Account, AccountRole
from src.modules.police.police_model import PoliceAccount


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
        AccountRole.STAFF: 3,
    }
    role_to_pid = {
        AccountRole.STUDENT: "111111111",
        AccountRole.ADMIN: "222222222",
        AccountRole.STAFF: "333333333",
    }
    return Account(
        id=role_to_id[role],
        email="user@example.com",
        first_name="Test",
        last_name="User",
        pid=role_to_pid[role],
        role=role,
    )


async def authenticate_user(
    authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> Account:
    """
    Middleware to authenticate user from Bearer token.
    Expects token to be one of: "student", "admin", "staff" for mock authentication.
    Note: Police authenticate separately via the police singleton table.
    """
    token = authorization.credentials.lower()

    role_map = {
        "student": AccountRole.STUDENT,
        "admin": AccountRole.ADMIN,
        "staff": AccountRole.STAFF,
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
    authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> PoliceAccount:
    """
    Middleware to ensure the authenticated user is a police officer.
    """
    token = authorization.credentials.lower()

    if token != "police":
        raise CredentialsException()

    return PoliceAccount(email="police@example.com")


async def authenticate_police_or_admin(
    authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> Account | PoliceAccount:
    """
    Middleware to ensure the authenticated user is either a police officer or admin.
    """
    token = authorization.credentials.lower()

    if token not in ("police", "admin"):
        raise ForbiddenException(detail="Police or admin privileges required")

    if token == "police":
        return PoliceAccount(email="police@example.com")
    
    account = mock_authenticate(AccountRole.ADMIN)
    if not account:
        raise CredentialsException()
    return account
