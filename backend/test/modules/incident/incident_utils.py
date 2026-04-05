from datetime import UTC, datetime, timedelta
from typing import Any, TypedDict, Unpack, cast, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.incident.incident_entity import IncidentEntity
from src.modules.incident.incident_model import (
    IncidentCreateDto,
    IncidentData,
    IncidentDto,
    IncidentSeverity,
    IncidentUpdateDto,
)
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
        IncidentDto | IncidentCreateDto | IncidentUpdateDto,
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
            "severity": IncidentSeverity.IN_PERSON.value,
        }

    @classmethod
    def get_sample_create_data(cls) -> dict:
        """Get sample data for IncidentCreateDto (with location_place_id instead of location_id)."""
        data = cls.generate_defaults(0)
        del data["location_id"]
        data["location_place_id"] = "ChIJSamplePlace0000"
        return data

    @classmethod
    def get_sample_update_data(cls) -> dict:
        """Get sample data for IncidentUpdateDto (no location_place_id)."""
        data = cls.generate_defaults(0)
        del data["location_id"]
        return data

    async def next_create_dto(
        self, *, location_place_id: str | None = None, **field_overrides: Any
    ) -> IncidentCreateDto:
        """Generate the next IncidentCreateDto, resolving or creating a location if needed."""
        if location_place_id is None:
            location = await self.location_utils.create_one()
            location_place_id = location.google_place_id
        fields = {"incident_datetime", "description", "severity"}
        data = self.get_or_default(cast(IncidentOverrides, field_overrides), fields)
        self.count += 1
        return IncidentCreateDto(location_place_id=location_place_id, **data)

    async def next_update_dto(self, **field_overrides: Any) -> IncidentUpdateDto:
        """Generate the next IncidentUpdateDto."""
        fields = {"incident_datetime", "description", "severity"}
        data = self.get_or_default(cast(IncidentOverrides, field_overrides), fields)
        self.count += 1
        return IncidentUpdateDto(**data)

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
