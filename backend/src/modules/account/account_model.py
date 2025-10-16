from enum import Enum
from typing import Self

from pydantic import BaseModel, EmailStr

from modules.account.account_entity import AccountEntity


class AccountRoleEnum(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"
    POLICE = "police"


class AccountData(BaseModel):
    email: EmailStr
    password: str
    role: AccountRoleEnum = AccountRoleEnum.STUDENT


class Account(BaseModel):
    id: int
    email: EmailStr
    role: AccountRoleEnum

    @classmethod
    def from_entity(cls, account_entity: AccountEntity) -> Self:
        return cls(
            id=account_entity.id,
            email=account_entity.email,
            role=AccountRoleEnum(account_entity.role.value),
        )
