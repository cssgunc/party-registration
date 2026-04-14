from datetime import UTC, datetime, timedelta
from typing import Any, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.utils.bcrypt_utils import hash_password
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import (
    PoliceAccountDto,
    PoliceAccountUpdate,
    PoliceRole,
    PoliceSignupDto,
)
from test.utils.resource_test_utils import ResourceTestUtils


class PoliceUpdateOverrides(TypedDict, total=False):
    email: str
    password: str
    role: PoliceRole
    is_verified: bool
    verification_token: str | None
    verification_token_expires_at: datetime | None


class PoliceTestUtils(
    ResourceTestUtils[
        PoliceEntity,
        PoliceSignupDto,
        PoliceAccountDto,
    ]
):
    TEST_PASSWORD = "testpassword123"

    def __init__(self, session: AsyncSession):
        super().__init__(
            session,
            entity_class=PoliceEntity,
            data_class=PoliceSignupDto,
        )

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        return {
            "email": f"police{count}@unc.edu",
            "password": PoliceTestUtils.TEST_PASSWORD,
            "confirm_password": PoliceTestUtils.TEST_PASSWORD,
            "role": PoliceRole.OFFICER.value,
            "is_verified": False,
            "verification_token": None,
            "verification_token_expires_at": None,
        }

    @override
    async def next_data(self, **overrides: Unpack[PoliceUpdateOverrides]) -> PoliceSignupDto:
        d = await self.next_dict(**overrides)
        return PoliceSignupDto(
            email=d["email"],
            password=d["password"],
            confirm_password=d["confirm_password"],
        )

    @override
    async def next_entity(self, **overrides: Unpack[PoliceUpdateOverrides]) -> PoliceEntity:
        d = await self.next_dict(**overrides)
        role = d.get("role", PoliceRole.OFFICER)
        return PoliceEntity(
            email=d["email"],
            hashed_password=hash_password(d["password"]),
            role=PoliceRole(role) if isinstance(role, str) else role,
            is_verified=d.get("is_verified", False),
            verification_token=d.get("verification_token", None),
            verification_token_expires_at=d.get("verification_token_expires_at", None),
        )

    @override
    def assert_matches(
        self,
        resource1: PoliceEntity | PoliceSignupDto | PoliceAccountDto | None,
        resource2: PoliceEntity | PoliceSignupDto | PoliceAccountDto | None,
    ) -> None:
        """Assert that two police resources match."""
        assert resource1 is not None, "First resource is None"
        assert resource2 is not None, "Second resource is None"

        if not isinstance(resource1, PoliceSignupDto) and not isinstance(
            resource2, PoliceSignupDto
        ):
            assert resource1.email == resource2.email, (
                f"Email mismatch: {resource1.email} != {resource2.email}"
            )

        if isinstance(resource1, (PoliceEntity, PoliceAccountDto)) and isinstance(
            resource2, (PoliceEntity, PoliceAccountDto)
        ):
            assert resource1.role == resource2.role, (
                f"Role mismatch: {resource1.role} != {resource2.role}"
            )

        if isinstance(resource1, PoliceEntity) and isinstance(resource2, PoliceEntity):
            assert resource1.id == resource2.id, f"ID mismatch: {resource1.id} != {resource2.id}"
            assert resource1.hashed_password == resource2.hashed_password, (
                "Hashed password mismatch"
            )

        if isinstance(resource1, PoliceAccountDto) and isinstance(resource2, PoliceAccountDto):
            assert resource1.id == resource2.id, f"ID mismatch: {resource1.id} != {resource2.id}"

        if isinstance(resource1, PoliceEntity) and isinstance(resource2, PoliceAccountDto):
            assert resource1.id == resource2.id, f"ID mismatch: {resource1.id} != {resource2.id}"

        if isinstance(resource1, PoliceAccountDto) and isinstance(resource2, PoliceEntity):
            assert resource1.id == resource2.id, f"ID mismatch: {resource1.id} != {resource2.id}"

    def assert_unverified(self, entity: PoliceEntity) -> None:
        """Assert that a police entity is in the unverified state."""
        assert not entity.is_verified, "Expected is_verified=False"
        assert entity.verification_token is not None, "Expected verification_token to be set"
        assert entity.verification_token_expires_at is not None, (
            "Expected verification_token_expires_at to be set"
        )

    def assert_verified(self, entity: PoliceEntity) -> None:
        """Assert that a police entity is in the verified state with token cleared."""
        assert entity.is_verified, "Expected is_verified=True"
        assert entity.verification_token is None, "Expected verification_token to be None"
        assert entity.verification_token_expires_at is None, (
            "Expected verification_token_expires_at to be None"
        )

    async def create_verified_one(self, **overrides: Unpack[PoliceUpdateOverrides]) -> PoliceEntity:
        """Create a police entity with is_verified=True."""
        overrides["is_verified"] = True
        return await self.create_one(**overrides)

    async def create_with_token(
        self,
        token: str = "test_verification_token",
        expires_at: datetime | None = None,
    ) -> PoliceEntity:
        """Create an unverified police entity with a specific verification token."""
        if expires_at is None:
            expires_at = datetime.now(UTC) + timedelta(
                hours=env.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
            )

        return await self.create_one(
            verification_token=token, verification_token_expires_at=expires_at, is_verified=False
        )

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: PoliceUpdateOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_dict(self, **overrides: Unpack[PoliceUpdateOverrides]) -> dict:
        return await super().next_dict(**overrides)

    @override
    async def create_one(self, **overrides: Unpack[PoliceUpdateOverrides]) -> PoliceEntity:
        return await super().create_one(**overrides)

    async def next_update_dict(self, **overrides: Unpack[PoliceUpdateOverrides]) -> dict:
        d = await self.next_dict(**overrides)
        role = d.get("role", PoliceRole.OFFICER)
        return {
            "email": d["email"],
            "role": role.value if isinstance(role, PoliceRole) else role,
            "is_verified": overrides.get("is_verified", True),
        }

    async def next_update_data(
        self, **overrides: Unpack[PoliceUpdateOverrides]
    ) -> PoliceAccountUpdate:
        d = await self.next_dict(**overrides)
        role = d.get("role", PoliceRole.OFFICER)
        return PoliceAccountUpdate(
            email=d["email"],
            role=PoliceRole(role) if isinstance(role, str) else role,
            is_verified=overrides.get("is_verified", True),
        )
