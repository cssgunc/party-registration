from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import NotFoundException
from src.core.query_utils import PaginatedResponse, get_paginated_results, parse_pagination_params
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_service import LocationService

from .incident_entity import IncidentEntity
from .incident_model import IncidentCreateDto, IncidentDto, IncidentUpdateDto


class IncidentNotFoundException(NotFoundException):
    def __init__(self, incident_id: int):
        super().__init__(f"Incident with ID {incident_id} not found")


class IncidentService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
    ):
        self.session = session
        self.location_service = location_service

    async def _get_incident_entity_by_id(self, incident_id: int) -> IncidentEntity:
        result = await self.session.execute(
            select(IncidentEntity).where(IncidentEntity.id == incident_id)
        )
        incident_entity = result.scalar_one_or_none()
        if incident_entity is None:
            raise IncidentNotFoundException(incident_id)
        return incident_entity

    async def get_incidents_paginated(self, request: Request) -> PaginatedResponse[IncidentDto]:
        nested_field_columns = {
            "location.id": IncidentEntity.location_id,
            "location.google_place_id": LocationEntity.google_place_id,
            "location.formatted_address": LocationEntity.formatted_address,
            "location.hold_expiration": LocationEntity.hold_expiration,
        }

        _base_allowed_fields = ["id", "incident_datetime", "severity", "description"]
        _base_allowed_fields.append("reference_id")
        allowed_sort_fields = [*_base_allowed_fields, *nested_field_columns.keys()]
        allowed_filter_fields = list(allowed_sort_fields)

        base_query = select(IncidentEntity).join(
            LocationEntity, IncidentEntity.location_id == LocationEntity.id
        )

        query_params = parse_pagination_params(
            request,
            allowed_sort_fields=allowed_sort_fields,
            allowed_filter_fields=allowed_filter_fields,
        )

        search_columns = [
            IncidentEntity.description,
            IncidentEntity.reference_id,
            LocationEntity.formatted_address,
            LocationEntity.google_place_id,
        ]

        return await get_paginated_results(
            session=self.session,
            base_query=base_query,
            entity_class=IncidentEntity,
            dto_converter=lambda entity: entity.to_dto(),
            query_params=query_params,
            allowed_sort_fields=allowed_sort_fields,
            allowed_filter_fields=allowed_filter_fields,
            nested_field_columns=nested_field_columns,
            search_columns=search_columns,
        )

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
        new_incident = IncidentEntity(
            location_id=location.id,
            incident_datetime=data.incident_datetime,
            description=data.description,
            severity=data.severity,
            reference_id=data.reference_id,
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
