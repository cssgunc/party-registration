from typing import Literal, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import Account, AccountData
from test.utils.resource_test_utils import ResourceTestUtils


class AccountDict(TypedDict, total=False):
    email: str
    first_name: str
    last_name: str
    pid: str
    role: Literal["admin", "staff", "student"]


class AccountTestUtils(
    ResourceTestUtils[
        AccountEntity,
        AccountData,
        Account,
    ]
):
    def __init__(self, session: AsyncSession):
        super().__init__(
            session,
            entity_class=AccountEntity,
            data_class=AccountData,
        )

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict:
        roles = list(AccountRole)
        return {
            "email": f"account-{count}@unc.edu",
            "first_name": f"FAccount{count}",
            "last_name": f"LAccount{count}",
            "pid": str(730000000 + count),
            "role": roles[count % len(roles)].value,
        }

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: AccountDict | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_dict(self, **overrides: Unpack[AccountDict]) -> dict:
        return await super().next_dict(**overrides)

    @override
    async def next_data(self, **overrides: Unpack[AccountDict]) -> AccountData:
        return await super().next_data(**overrides)

    @override
    async def next_entity(self, **overrides: Unpack[AccountDict]) -> AccountEntity:
        return await super().next_entity(**overrides)

    @override
    async def create_many(self, *, i: int, **overrides: Unpack[AccountDict]) -> list[AccountEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[AccountDict]) -> AccountEntity:
        return await super().create_one(**overrides)
