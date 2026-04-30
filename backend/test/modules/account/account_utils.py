from typing import Literal, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import (
    AccountData,
    AccountDto,
    AccountStatus,
    AggregateAccountDto,
)
from src.modules.account.invite_token_entity import InviteTokenEntity
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import PoliceAccountDto
from test.utils.resource_test_utils import ResourceTestUtils


class AccountOverrides(TypedDict, total=False):
    email: str
    first_name: str
    last_name: str
    pid: str
    onyen: str
    role: Literal["admin", "staff", "student"]


class AccountTestUtils(
    ResourceTestUtils[
        AccountEntity,
        AccountData,
        AccountDto,
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
            "onyen": f"faccount{count}laccount{count}",
            "role": roles[count % len(roles)].value,
        }

    def assert_aggregate_matches(
        self,
        resource1: AggregateAccountDto | None,
        resource2: (
            AccountEntity
            | AccountDto
            | PoliceEntity
            | PoliceAccountDto
            | InviteTokenEntity
            | AggregateAccountDto
            | None
        ),
    ) -> None:
        """Assert that an aggregate row matches an account, police record, invite, or DTO."""
        assert resource1 is not None, "First aggregate resource is None"
        assert resource2 is not None, "Second aggregate resource is None"

        if isinstance(resource2, (AccountEntity, AccountDto)):
            expected = AggregateAccountDto(
                source_id=resource2.id,
                email=resource2.email,
                role=resource2.role.value,
                status=AccountStatus.ACTIVE,
                first_name=resource2.first_name,
                last_name=resource2.last_name,
                onyen=resource2.onyen,
                pid=resource2.pid,
            )
        elif isinstance(resource2, (PoliceEntity, PoliceAccountDto)):
            expected = AggregateAccountDto(
                source_id=resource2.id,
                email=resource2.email,
                role=resource2.role.value,
                status=AccountStatus.ACTIVE if resource2.is_verified else AccountStatus.UNVERIFIED,
                first_name=None,
                last_name=None,
                onyen=None,
                pid=None,
            )
        elif isinstance(resource2, InviteTokenEntity):
            expected = AggregateAccountDto(
                source_id=resource2.id,
                email=resource2.email,
                role=resource2.role.value,
                status=AccountStatus.INVITED,
                first_name=None,
                last_name=None,
                onyen=None,
                pid=None,
            )
        else:
            expected = resource2

        assert resource1.model_dump() == expected.model_dump()

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: AccountOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_dict(self, **overrides: Unpack[AccountOverrides]) -> dict:
        return await super().next_dict(**overrides)

    @override
    async def next_data(self, **overrides: Unpack[AccountOverrides]) -> AccountData:
        return await super().next_data(**overrides)

    @override
    async def next_entity(self, **overrides: Unpack[AccountOverrides]) -> AccountEntity:
        return await super().next_entity(**overrides)

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[AccountOverrides]
    ) -> list[AccountEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[AccountOverrides]) -> AccountEntity:
        return await super().create_one(**overrides)
