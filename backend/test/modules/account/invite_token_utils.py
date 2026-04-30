from datetime import UTC, datetime, timedelta
from typing import TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.modules.account.account_model import CreateInviteDto, InviteTokenRole
from src.modules.account.invite_token_entity import InviteTokenEntity
from test.utils.resource_test_utils import ResourceTestUtils


class InviteTokenOverrides(TypedDict, total=False):
    email: str
    role: InviteTokenRole
    expires_at: datetime


class InviteTokenTestUtils(
    ResourceTestUtils[
        InviteTokenEntity,
        CreateInviteDto,
    ]
):
    def __init__(self, session: AsyncSession):
        super().__init__(
            session,
            entity_class=InviteTokenEntity,
            data_class=CreateInviteDto,
        )

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict:
        return {
            "email": f"invite-{count}@unc.edu",
            "role": InviteTokenRole.STAFF,
            "expires_at": datetime.now(UTC) + timedelta(hours=env.INVITE_TOKEN_EXPIRY_HOURS),
        }

    @override
    async def next_entity(self, **overrides: Unpack[InviteTokenOverrides]) -> InviteTokenEntity:
        data = self.get_or_default(overrides)

        self.count += 1
        return InviteTokenEntity(
            email=data["email"],
            role=data["role"],
            expires_at=data["expires_at"],
        )

    async def create_expired(
        self,
        *,
        email: str | None = None,
        role: InviteTokenRole = InviteTokenRole.STAFF,
    ) -> InviteTokenEntity:
        overrides: InviteTokenOverrides = {
            "role": role,
            "expires_at": datetime.now(UTC) - timedelta(hours=1),
        }
        if email is not None:
            overrides["email"] = email
        return await self.create_one(**overrides)

    @staticmethod
    def assert_matches(
        resource1: InviteTokenEntity | None,
        resource2: InviteTokenEntity | None = None,
        **expected: Unpack[InviteTokenOverrides],
    ) -> None:
        assert resource1 is not None, "First invite token resource is None"

        if resource2 is not None:
            assert isinstance(resource1, InviteTokenEntity), (
                "First resource must be InviteTokenEntity"
            )
            assert isinstance(resource2, InviteTokenEntity), (
                "Second resource must be InviteTokenEntity"
            )
            assert resource1.email == resource2.email
            assert resource1.role == resource2.role
            assert resource1.expires_at == resource2.expires_at
            return

        assert isinstance(resource1, InviteTokenEntity), "Resource must be InviteTokenEntity"
        for field, value in expected.items():
            assert getattr(resource1, field) == value, (
                f"Expected invite token {field}={value!r}, got {getattr(resource1, field)!r}"
            )

    @staticmethod
    def assert_token_deleted(
        entity: InviteTokenEntity, all_tokens: list[InviteTokenEntity]
    ) -> None:
        ids = [t.id for t in all_tokens]
        assert entity.id not in ids, f"Invite token {entity.id} should have been deleted"

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: InviteTokenOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_dict(self, **overrides: Unpack[InviteTokenOverrides]) -> dict:
        return await super().next_dict(**overrides)

    @override
    async def next_data(self, **overrides: Unpack[InviteTokenOverrides]) -> CreateInviteDto:
        data = await self.next_dict(**overrides)
        return CreateInviteDto(email=data["email"], role=data["role"])

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[InviteTokenOverrides]
    ) -> list[InviteTokenEntity]:
        return await super().create_many(i=i, **overrides)
