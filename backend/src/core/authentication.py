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


async def authenticate_user(
    authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AccountDto:
    """
    Middleware to authenticate user from Bearer token.
    Decodes JWT access token and validates it.
    Note: This only works for account tokens, not police tokens.
    """
    from src.modules.auth.auth_service import AuthService

    token = authorization.credentials
    payload = AuthService.decode_access_token(token)

    if payload.get("sub") != "account":
        raise CredentialsException()

    return AccountDto(
        id=payload.get("id", 0),
        email=payload["email"],
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        pid=payload["pid"],
        role=AccountRole(payload["role"]),
    )


def authenticate_by_role(*roles: StringRole):
    """
    Middleware factory to ensure the authenticated user has one of the specified roles.
    """

    async def _authenticate(
        authorization: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ) -> AccountDto | PoliceAccountDto:
        from src.modules.auth.auth_service import AuthService

        token = authorization.credentials
        payload = AuthService.decode_access_token(token)
        subject = payload.get("sub")

        if subject == "police":
            if "police" not in roles:
                raise ForbiddenException(detail="Insufficient privileges")
            return PoliceAccountDto(email=payload["email"])

        elif subject == "account":
            account = AccountDto(
                id=payload.get("id", 0),
                email=payload["email"],
                first_name=payload["first_name"],
                last_name=payload["last_name"],
                pid=payload["pid"],
                role=AccountRole(payload["role"]),
            )
            if account.role.value not in roles:
                raise ForbiddenException(detail="Insufficient privileges")
            return account

        else:
            raise CredentialsException()

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
