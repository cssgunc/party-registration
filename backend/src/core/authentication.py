from typing import Literal

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.core.exceptions import CredentialsException, ForbiddenException
from src.modules.account.account_model import AccountDto, AccountRole
from src.modules.police.police_model import PoliceAccountDto

StringRole = Literal["student", "admin", "staff", "police"]


class HTTPBearer401(HTTPBearer):
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except Exception as e:
            raise CredentialsException() from e


bearer_scheme = HTTPBearer401()


def mock_authenticate(role: AccountRole) -> AccountDto | None:
    """Mock authentication function. Replace with real authentication logic."""
    role_to_id = {
        AccountRole.ADMIN: 1,
        AccountRole.STAFF: 2,
        AccountRole.STUDENT: 3,
    }
    role_to_pid = {
        AccountRole.STUDENT: "111111111",
        AccountRole.ADMIN: "222222222",
        AccountRole.STAFF: "333333333",
    }
    return AccountDto(
        id=role_to_id[role],
        email="user@example.com",
        first_name="Test",
        last_name="User",
        pid=role_to_pid[role],
        role=role,
    )


async def authenticate_user(
    authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AccountDto:
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


def authenticate_by_role(*roles: StringRole):
    """
    Middleware factory to ensure the authenticated user has one of the specified roles.
    """

    async def _authenticate(
        authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ) -> AccountDto | PoliceAccountDto:
        token = authorization.credentials.lower()

        # Check if police token and police is allowed
        if token == "police":
            if "police" in roles:
                return PoliceAccountDto(email="police@example.com")
            else:
                raise ForbiddenException(detail="Insufficient privileges")

        role_map = {
            "student": AccountRole.STUDENT,
            "admin": AccountRole.ADMIN,
            "staff": AccountRole.STAFF,
        }

        if token not in role_map:
            raise CredentialsException()

        user = mock_authenticate(role_map[token])
        if not user or user.role.value not in roles:
            raise ForbiddenException(detail="Insufficient privileges")
        return user

    return _authenticate


async def authenticate_admin(
    account: AccountDto | PoliceAccountDto = Depends(authenticate_by_role("admin")),
) -> AccountDto:
    if not isinstance(account, AccountDto):
        raise ForbiddenException(detail="Insufficient privileges")
    return account


async def authenticate_staff_or_admin(
    account: AccountDto | PoliceAccountDto = Depends(authenticate_by_role("staff", "admin")),
) -> AccountDto:
    if not isinstance(account, AccountDto):
        raise ForbiddenException(detail="Insufficient privileges")
    return account


async def authenticate_student_or_admin(
    account: AccountDto | PoliceAccountDto = Depends(authenticate_by_role("student", "admin")),
) -> AccountDto:
    if not isinstance(account, AccountDto):
        raise ForbiddenException(detail="Insufficient privileges")
    return account


async def authenticate_student(
    account: AccountDto | PoliceAccountDto = Depends(authenticate_by_role("student")),
) -> AccountDto:
    if not isinstance(account, AccountDto):
        raise ForbiddenException(detail="Insufficient privileges")
    return account


async def authenticate_police_or_admin(
    account: AccountDto | PoliceAccountDto = Depends(authenticate_by_role("police", "admin")),
) -> PoliceAccountDto | AccountDto:
    return account
