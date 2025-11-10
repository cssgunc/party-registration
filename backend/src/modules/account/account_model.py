from typing import Self

from pydantic import BaseModel, EmailStr
from src.modules.account.account_entity import AccountEntity, AccountRole


class AccountData(BaseModel):
    """DTO for creating/updating an Account."""

    email: EmailStr
    first_name: str
    last_name: str
    role: AccountRole


class Account(BaseModel):
    """DTO for Account responses."""

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    role: AccountRole

    @classmethod
    def from_entity(cls, account_entity: AccountEntity) -> Self:
        return cls(
            id=account_entity.id,
            email=account_entity.email,
            first_name=account_entity.first_name,
            last_name=account_entity.last_name,
            role=AccountRole(account_entity.role.value),
        )
