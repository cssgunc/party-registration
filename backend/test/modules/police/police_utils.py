from typing import Any, TypedDict, Unpack, override

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import PoliceAccountDto, PoliceAccountUpdate
from test.utils.resource_test_utils import ResourceTestUtils


class PoliceUpdateOverrides(TypedDict, total=False):
    email: str
    password: str


class PoliceTestUtils(
    ResourceTestUtils[
        PoliceEntity,
        PoliceAccountUpdate,
        PoliceAccountDto,
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
            "email": f"police{count}@unc.edu",
            "password": PoliceTestUtils.TEST_PASSWORD,
        }

    @override
    def assert_matches(
        self,
        resource1: PoliceEntity | PoliceAccountUpdate | PoliceAccountDto | None,
        resource2: PoliceEntity | PoliceAccountUpdate | PoliceAccountDto | None,
    ) -> None:
        """Assert that two police resources match."""
        assert resource1 is not None, "First resource is None"
        assert resource2 is not None, "Second resource is None"

        assert resource1.email == resource2.email, (
            f"Email mismatch: {resource1.email} != {resource2.email}"
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
