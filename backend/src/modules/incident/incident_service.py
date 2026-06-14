from typing import ClassVar

from fastapi import Depends
from sqlalchemy import Select, cast, func, select
from sqlalchemy import Time as SATime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_session
from src.core.exceptions import NotFoundException
from src.core.utils.excel_utils import export_to_excel
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
)
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_service import LocationService

from .incident_entity import IncidentEntity
from .incident_model import (
    IncidentCreateDto,
    IncidentData,
    IncidentDto,
    IncidentSeverity,
    IncidentSeverityCounts,
    IncidentUpdateDto,
    PaginatedIncidentsResponse,
)

_INCIDENT_QUERY_FIELDS = QueryFieldSet(
    fields={
        "id": IncidentEntity.id,
        "incident_datetime": IncidentEntity.incident_datetime,
        "incident_datetime_time": cast(
            func.convert_tz(IncidentEntity.incident_datetime, "UTC", "America/New_York"), SATime()
        ),
        "severity": IncidentEntity.severity,
        "description": IncidentEntity.description,
        "reference_id": IncidentEntity.reference_id,
        "location.id": IncidentEntity.location_id,
        "location.google_place_id": LocationEntity.google_place_id,
        "location.formatted_address": LocationEntity.formatted_address,
        "location.hold_expiration": LocationEntity.hold_expiration,
    },
    searchable=(
        "description",
        "reference_id",
        "location.formatted_address",
        "location.google_place_id",
    ),
    default_sort=SortParam(field="incident_datetime", order=SortOrder.DESC),
)


class IncidentNotFoundException(NotFoundException):
    def __init__(self, incident_id: int):
        super().__init__(f"Incident with ID {incident_id} not found")


class IncidentService:
    QUERY_FIELDS: ClassVar[QueryFieldSet] = _INCIDENT_QUERY_FIELDS

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
        query_service: QueryService = Depends(),
    ):
        self.session = session
        self.location_service = location_service
        self.query_service = query_service

    async def _get_incident_entity_by_id(self, incident_id: int) -> IncidentEntity:
        result = await self.session.execute(
            select(IncidentEntity)
            .where(IncidentEntity.id == incident_id)
            .options(selectinload(IncidentEntity.location))
        )
        incident_entity = result.scalar_one_or_none()
        if incident_entity is None:
            raise IncidentNotFoundException(incident_id)
        return incident_entity

    async def get_incidents_paginated(self, params: ListQueryParams) -> PaginatedIncidentsResponse:
        base_query = (
            select(IncidentEntity)
            .join(LocationEntity, IncidentEntity.location_id == LocationEntity.id)
            .options(selectinload(IncidentEntity.location))
        )

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            field_set=_INCIDENT_QUERY_FIELDS,
        )
        severity_counts = await self._get_severity_counts(base_query, params)
        return PaginatedIncidentsResponse(
            **result.model_dump(),
            severity_counts=severity_counts,
        )

    async def _get_severity_counts(
        self, base_query: Select, params: ListQueryParams
    ) -> IncidentSeverityCounts:
        filtered = self.query_service.apply_filters(
            base_query, params.filters, _INCIDENT_QUERY_FIELDS
        )
        filtered = self.query_service.apply_search(filtered, params.search, _INCIDENT_QUERY_FIELDS)
        subq = filtered.subquery()
        count_query = (
            select(subq.c.severity, func.count()).select_from(subq).group_by(subq.c.severity)
        )
        result = await self.session.execute(count_query)
        counts: dict[IncidentSeverity, int] = dict.fromkeys(IncidentSeverity, 0)
        for severity, count in result.all():
            counts[severity] = count
        return IncidentSeverityCounts.from_counts(counts)

    async def get_incidents_with_addresses(
        self, params: ListQueryParams
    ) -> list[tuple[IncidentDto, str]]:
        base_query = (
            select(IncidentEntity)
            .join(LocationEntity, IncidentEntity.location_id == LocationEntity.id)
            .options(selectinload(IncidentEntity.location))
        )

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            dto_converter=lambda entity: (entity.to_dto(), entity.location.formatted_address),
            field_set=self.QUERY_FIELDS,
        )
        return result.items

    def export_incidents_to_excel(self, incident_data: list[tuple[IncidentDto, str]]) -> bytes:
        return export_to_excel(
            resource_name="Incidents",
            field_map={
                "Severity": lambda x: x[0].severity.value.replace("_", " ").title(),
                "Address": lambda x: x[1],
                "Date": lambda x: x[0].incident_datetime.strftime("%Y-%m-%d"),
                "Time": lambda x: x[0].incident_datetime.strftime("%-I:%M %p"),
                "Description": lambda x: x[0].description,
                "Reference ID": lambda x: x[0].reference_id,
            },
            items=incident_data,
        )

    async def get_incidents_by_location(self, location_id: int) -> list[IncidentDto]:
        """Get all incidents for a given location, ordered by incident datetime."""
        result = await self.session.execute(
            select(IncidentEntity)
            .where(IncidentEntity.location_id == location_id)
            .order_by(IncidentEntity.incident_datetime)
            .options(selectinload(IncidentEntity.location))
        )
        incidents = result.scalars().all()
        return [incident.to_dto() for incident in incidents]

    async def get_incident_by_id(self, incident_id: int) -> IncidentDto:
        """Get a single incident by ID."""
        incident_entity = await self._get_incident_entity_by_id(incident_id)
        return incident_entity.to_dto()

    async def create_incident(self, data: IncidentCreateDto) -> IncidentDto:
        """Create a new incident, resolving or creating the location by place ID."""
        location = await self.location_service.get_or_create_location(data.location_place_id)
        new_incident = IncidentEntity.from_data(
            IncidentData(
                location_id=location.id,
                incident_datetime=data.incident_datetime,
                description=data.description,
                severity=data.severity,
                reference_id=data.reference_id,
            )
        )
        self.session.add(new_incident)
        await self.session.commit()
        await self.session.refresh(new_incident)
        return (await self._get_incident_entity_by_id(new_incident.id)).to_dto()

    async def update_incident(self, incident_id: int, data: IncidentUpdateDto) -> IncidentDto:
        """Update an existing incident's datetime, description, and severity."""
        # Resolve location first — get_or_create may commit (creating a new location).
        # Fetch the incident entity after to avoid stale identity-map relationships.
        location = await self.location_service.get_or_create_location(data.location_place_id)
        incident_entity = await self._get_incident_entity_by_id(incident_id)
        incident_entity.set_from_data(
            IncidentData(
                location_id=location.id,
                incident_datetime=data.incident_datetime,
                description=data.description,
                severity=data.severity,
                reference_id=data.reference_id,
            )
        )
        self.session.add(incident_entity)
        await self.session.commit()
        await self.session.refresh(incident_entity, attribute_names=["location"])
        return incident_entity.to_dto()

    async def delete_incident(self, incident_id: int) -> IncidentDto:
        """Delete an incident."""
        incident_entity = await self._get_incident_entity_by_id(incident_id)
        incident = incident_entity.to_dto()
        await self.session.delete(incident_entity)
        await self.session.commit()
        return incident
