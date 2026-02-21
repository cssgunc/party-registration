from datetime import UTC, datetime, timedelta
from typing import Any, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.incident.incident_entity import IncidentEntity
from src.modules.incident.incident_model import IncidentData, IncidentDto, IncidentSeverity
from test.modules.location.location_utils import LocationTestUtils
from test.utils.resource_test_utils import ResourceTestUtils


class IncidentOverrides(TypedDict, total=False):
    location_id: int
    incident_datetime: datetime
    description: str
    severity: IncidentSeverity


class IncidentTestUtils(
    ResourceTestUtils[
        IncidentEntity,
        IncidentData,
        IncidentDto,
    ]
):
    def __init__(self, session: AsyncSession, location_utils: LocationTestUtils):
        super().__init__(
            session,
            entity_class=IncidentEntity,
            data_class=IncidentData,
        )
        self.location_utils = location_utils

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        return {
            "location_id": 1,
            "incident_datetime": (
                datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC) + timedelta(days=count)
            ).isoformat(),
            "description": f"Incident {count}",
            "severity": IncidentSeverity.COMPLAINT.value,
        }

    @classmethod
    def get_sample_create_data(cls) -> dict:
        """Get sample data for IncidentCreate (without location_id, since it comes from path)."""
        data = cls.generate_defaults(0)
        del data["location_id"]
        return data

    @override
    async def next_dict(self, **overrides: Unpack[IncidentOverrides]) -> dict:
        # If location_id not provided, create a location
        local_overrides = dict(overrides)
        if "location_id" not in local_overrides:
            location = await self.location_utils.create_one()
            local_overrides["location_id"] = location.id
        return await super().next_dict(**local_overrides)

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: IncidentOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_data(self, **overrides: Unpack[IncidentOverrides]) -> IncidentData:
        return await super().next_data(**overrides)

    @override
    async def next_entity(self, **overrides: Unpack[IncidentOverrides]) -> IncidentEntity:
        return await super().next_entity(**overrides)

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[IncidentOverrides]
    ) -> list[IncidentEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[IncidentOverrides]) -> IncidentEntity:
        return await super().create_one(**overrides)
