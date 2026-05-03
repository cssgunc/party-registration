from datetime import UTC, datetime
from typing import ClassVar

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_session
from src.core.exceptions import NotFoundException
from src.core.utils.excel_utils import ExcelExporter
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
    IncidentUpdateDto,
    PaginatedIncidentsResponse,
)

_INCIDENT_QUERY_FIELDS = QueryFieldSet(
    fields={
        "id": IncidentEntity.id,
        "incident_datetime": IncidentEntity.incident_datetime,
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
            select(IncidentEntity).where(IncidentEntity.id == incident_id)
        )
        incident_entity = result.scalar_one_or_none()
        if incident_entity is None:
            raise IncidentNotFoundException(incident_id)
        return incident_entity

    async def get_incidents_paginated(self, params: ListQueryParams) -> PaginatedIncidentsResponse:
        base_query = select(IncidentEntity).join(
            LocationEntity, IncidentEntity.location_id == LocationEntity.id
        )

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            field_set=_INCIDENT_QUERY_FIELDS,
        )
        return PaginatedIncidentsResponse(**result.model_dump())

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
        headers = ["Severity", "Address", "Date", "Time", "Description", "Reference ID"]
        exporter = ExcelExporter(
            sheet_title=f"Incidents {datetime.now(UTC).strftime('%Y-%m-%d')}"
        ).set_headers(headers)
        for incident, address in incident_data:
            exporter.add_row(
                [
                    incident.severity.value.replace("_", " ").title(),
                    address,
                    incident.incident_datetime.strftime("%Y-%m-%d"),
                    incident.incident_datetime.strftime("%-I:%M %p"),
                    incident.description,
                    incident.reference_id or "-",
                ]
            )
        return exporter.to_bytes()

    async def get_incidents_by_location(self, location_id: int) -> list[IncidentDto]:
        """Get all incidents for a given location, ordered by incident datetime."""
        result = await self.session.execute(
            select(IncidentEntity)
            .where(IncidentEntity.location_id == location_id)
            .order_by(IncidentEntity.incident_datetime)
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
        return new_incident.to_dto()

    async def update_incident(self, incident_id: int, data: IncidentUpdateDto) -> IncidentDto:
        """Update an existing incident's datetime, description, and severity."""
        incident_entity = await self._get_incident_entity_by_id(incident_id)
        location = await self.location_service.get_or_create_location(data.location_place_id)
        incident_entity.location_id = location.id
        incident_entity.incident_datetime = data.incident_datetime
        incident_entity.description = data.description
        incident_entity.severity = data.severity
        incident_entity.reference_id = data.reference_id
        self.session.add(incident_entity)
        await self.session.commit()
        await self.session.refresh(incident_entity)
        return incident_entity.to_dto()

    async def delete_incident(self, incident_id: int) -> IncidentDto:
        """Delete an incident."""
        incident_entity = await self._get_incident_entity_by_id(incident_id)
        incident = incident_entity.to_dto()
        await self.session.delete(incident_entity)
        await self.session.commit()
        return incident
