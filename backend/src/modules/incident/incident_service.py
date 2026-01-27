from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import NotFoundException
from src.modules.location.location_service import LocationNotFoundException

from .incident_entity import IncidentEntity
from .incident_model import IncidentData, IncidentDto


class IncidentNotFoundException(NotFoundException):
    def __init__(self, incident_id: int):
        super().__init__(f"Incident with ID {incident_id} not found")


class IncidentService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
    ):
        self.session = session

    async def _get_incident_entity_by_id(self, incident_id: int) -> IncidentEntity:
        result = await self.session.execute(
            select(IncidentEntity).where(IncidentEntity.id == incident_id)
        )
        incident_entity = result.scalar_one_or_none()
        if incident_entity is None:
            raise IncidentNotFoundException(incident_id)
        return incident_entity

    async def get_incidents_by_location(self, location_id: int) -> list[IncidentDto]:
        """Get all incidents for a given location."""
        result = await self.session.execute(
            select(IncidentEntity).where(IncidentEntity.location_id == location_id)
        )
        incidents = result.scalars().all()
        return [incident.to_dto() for incident in incidents]

    async def get_incident_by_id(self, incident_id: int) -> IncidentDto:
        """Get a single incident by ID."""
        incident_entity = await self._get_incident_entity_by_id(incident_id)
        return incident_entity.to_dto()

    async def create_incident(self, location_id: int, data: IncidentData) -> IncidentDto:
        """Create a new incident."""
        new_incident = IncidentEntity(
            location_id=location_id,
            incident_datetime=data.incident_datetime,
            description=data.description,
            severity=data.severity,
        )
        try:
            self.session.add(new_incident)
            await self.session.commit()
        except IntegrityError as e:
            # Foreign key constraint violation indicates location doesn't exist
            if "locations" in str(e).lower() or "foreign key" in str(e).lower():
                raise LocationNotFoundException(location_id) from e
            raise
        await self.session.refresh(new_incident)
        return new_incident.to_dto()

    async def update_incident(
        self, incident_id: int, location_id: int, data: IncidentData
    ) -> IncidentDto:
        """Update an existing incident."""
        incident_entity = await self._get_incident_entity_by_id(incident_id)

        incident_entity.location_id = location_id
        incident_entity.incident_datetime = data.incident_datetime
        incident_entity.description = data.description
        incident_entity.severity = data.severity

        try:
            self.session.add(incident_entity)
            await self.session.commit()
        except IntegrityError as e:
            # Foreign key constraint violation indicates location doesn't exist
            if "locations" in str(e).lower() or "foreign key" in str(e).lower():
                raise LocationNotFoundException(location_id) from e
            raise
        await self.session.refresh(incident_entity)
        return incident_entity.to_dto()

    async def delete_incident(self, incident_id: int) -> IncidentDto:
        """Delete an incident."""
        incident_entity = await self._get_incident_entity_by_id(incident_id)
        incident = incident_entity.to_dto()
        await self.session.delete(incident_entity)
        await self.session.commit()
        return incident
