from typing import Any, TypedDict, Unpack, override

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import PoliceAccount, PoliceAccountUpdate
from test.utils.resource_test_utils import ResourceTestUtils


class PoliceOverrides(TypedDict, total=False):
    email: str
    hashed_password: str


class PoliceUpdateOverrides(TypedDict, total=False):
    email: str
    password: str


class PoliceTestUtils(
    ResourceTestUtils[
        PoliceEntity,
        PoliceAccountUpdate,
        PoliceAccount,
    ]
):
    TEST_PASSWORD = "testpassword123"

    def __init__(self, session: AsyncSession):
        super().__init__(
            session,
            entity_class=PoliceEntity,
            data_class=PoliceAccountUpdate,
        )

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        return {
            "email": "police@unc.edu",
            "password": PoliceTestUtils.TEST_PASSWORD,
        }

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[PoliceUpdateOverrides]
    ) -> list[PoliceEntity]:
        raise NotImplementedError("create_many is not implemented for PoliceTestUtils2")

    @override
    async def create_one(self, **overrides: Unpack[PoliceUpdateOverrides]) -> PoliceEntity:
        """Create a single police entity (singleton)."""
        hashed_password = self.hash_password(overrides.get("password", self.TEST_PASSWORD))
        police_entity = await super().next_entity(**overrides, hashed_password=hashed_password)

        self.session.add(police_entity)
        await self.session.flush()
        await self.session.commit()

        return police_entity

    async def get_police(self) -> PoliceEntity:
        """Get the police entity (singleton)."""
        all_police = await self.get_all()
        return all_police[0]

    @override
    def assert_matches(
        self,
        resource1: PoliceEntity | PoliceAccountUpdate | PoliceAccount | None,
        resource2: PoliceEntity | PoliceAccountUpdate | PoliceAccount | None,
    ) -> None:
        """Assert that two police resources match."""
        assert resource1 is not None, "First resource is None"
        assert resource2 is not None, "Second resource is None"

        # Email should always match
        assert resource1.email == resource2.email, (
            f"Email mismatch: {resource1.email} != {resource2.email}"
        )

        # If both are entities, compare IDs and hashed passwords
        if isinstance(resource1, PoliceEntity) and isinstance(resource2, PoliceEntity):
            assert resource1.id == resource2.id, f"ID mismatch: {resource1.id} != {resource2.id}"
            assert resource1.hashed_password == resource2.hashed_password, (
                "Hashed password mismatch"
            )

        # If both are updates, compare passwords
        if isinstance(resource1, PoliceAccountUpdate) and isinstance(
            resource2, PoliceAccountUpdate
        ):
            assert resource1.password == resource2.password, (
                f"Password mismatch: {resource1.password} != {resource2.password}"
            )

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt for test setup."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash for test assertions."""
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

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
    async def next_data(self, **overrides: Unpack[PoliceUpdateOverrides]) -> PoliceAccountUpdate:
        return await super().next_data(**overrides)

    @override
    async def next_entity(self, **overrides: Unpack[PoliceUpdateOverrides]) -> PoliceEntity:
        return await super().next_entity(**overrides)
