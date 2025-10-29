from typing import Self

from pydantic import BaseModel, EmailStr
from src.modules.account.account_entity import AccountEntity, AccountRole


class AccountData(BaseModel):
    email: EmailStr
    password: str
    role: AccountRole


class Account(BaseModel):
    id: int
    email: EmailStr
    password: str
    role: AccountRole

    @classmethod
    def from_entity(cls, account_entity: AccountEntity) -> Self:
        return cls(
            id=account_entity.id,
            email=account_entity.email,
            password=account_entity.hashed_password,
            role=AccountRole(account_entity.role.value),
        )
