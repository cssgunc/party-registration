from datetime import UTC, datetime, timedelta
from typing import Any, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.complaint.complaint_entity import ComplaintEntity
from src.modules.complaint.complaint_model import ComplaintData, ComplaintDto
from test.modules.location.location_utils import LocationTestUtils
from test.utils.resource_test_utils import ResourceTestUtils


class ComplaintOverrides(TypedDict, total=False):
    location_id: int
    complaint_datetime: datetime
    description: str


class ComplaintTestUtils(
    ResourceTestUtils[
        ComplaintEntity,
        ComplaintData,
        ComplaintDto,
    ]
):
    def __init__(self, session: AsyncSession, location_utils: LocationTestUtils):
        super().__init__(
            session,
            entity_class=ComplaintEntity,
            data_class=ComplaintData,
        )
        self.location_utils = location_utils

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        return {
            "location_id": 1,
            "complaint_datetime": (
                datetime(2025, 11, 18, 20, 30, 0, tzinfo=UTC) + timedelta(days=count)
            ).isoformat(),
            "description": f"Complaint {count}",
        }

    @override
    async def next_dict(self, **overrides: Unpack[ComplaintOverrides]) -> dict:
        # If location_id not provided, create a location
        if "location_id" not in overrides:
            location = await self.location_utils.create_one()
            overrides["location_id"] = location.id

        return await super().next_dict(**overrides)

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: ComplaintOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_data(self, **overrides: Unpack[ComplaintOverrides]) -> ComplaintData:
        return await super().next_data(**overrides)

    @override
    async def next_entity(self, **overrides: Unpack[ComplaintOverrides]) -> ComplaintEntity:
        return await super().next_entity(**overrides)

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[ComplaintOverrides]
    ) -> list[ComplaintEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[ComplaintOverrides]) -> ComplaintEntity:
        return await super().create_one(**overrides)
