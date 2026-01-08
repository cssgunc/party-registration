from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import NotFoundException
from src.modules.location.location_service import LocationNotFoundException

from .complaint_entity import ComplaintEntity
from .complaint_model import ComplaintData, ComplaintDto


class ComplaintNotFoundException(NotFoundException):
    def __init__(self, complaint_id: int):
        super().__init__(f"Complaint with ID {complaint_id} not found")


class ComplaintService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
    ):
        self.session = session

    async def _get_complaint_entity_by_id(self, complaint_id: int) -> ComplaintEntity:
        result = await self.session.execute(
            select(ComplaintEntity).where(ComplaintEntity.id == complaint_id)
        )
        complaint_entity = result.scalar_one_or_none()
        if complaint_entity is None:
            raise ComplaintNotFoundException(complaint_id)
        return complaint_entity

    async def get_complaints_by_location(self, location_id: int) -> list[ComplaintDto]:
        """Get all complaints for a given location."""
        result = await self.session.execute(
            select(ComplaintEntity).where(ComplaintEntity.location_id == location_id)
        )
        complaints = result.scalars().all()
        return [complaint.to_dto() for complaint in complaints]

    async def get_complaint_by_id(self, complaint_id: int) -> ComplaintDto:
        """Get a single complaint by ID."""
        complaint_entity = await self._get_complaint_entity_by_id(complaint_id)
        return complaint_entity.to_dto()

    async def create_complaint(self, location_id: int, data: ComplaintData) -> ComplaintDto:
        """Create a new complaint."""
        new_complaint = ComplaintEntity(
            location_id=location_id,
            complaint_datetime=data.complaint_datetime,
            description=data.description,
        )
        try:
            self.session.add(new_complaint)
            await self.session.commit()
        except IntegrityError as e:
            # Foreign key constraint violation indicates location doesn't exist
            if "locations" in str(e).lower() or "foreign key" in str(e).lower():
                raise LocationNotFoundException(location_id) from e
            raise
        await self.session.refresh(new_complaint)
        return new_complaint.to_dto()

    async def update_complaint(
        self, complaint_id: int, location_id: int, data: ComplaintData
    ) -> ComplaintDto:
        """Update an existing complaint."""
        complaint_entity = await self._get_complaint_entity_by_id(complaint_id)

        complaint_entity.location_id = location_id
        complaint_entity.complaint_datetime = data.complaint_datetime
        complaint_entity.description = data.description

        try:
            self.session.add(complaint_entity)
            await self.session.commit()
        except IntegrityError as e:
            # Foreign key constraint violation indicates location doesn't exist
            if "locations" in str(e).lower() or "foreign key" in str(e).lower():
                raise LocationNotFoundException(location_id) from e
            raise
        await self.session.refresh(complaint_entity)
        return complaint_entity.to_dto()

    async def delete_complaint(self, complaint_id: int) -> ComplaintDto:
        """Delete a complaint."""
        complaint_entity = await self._get_complaint_entity_by_id(complaint_id)
        complaint = complaint_entity.to_dto()
        await self.session.delete(complaint_entity)
        await self.session.commit()
        return complaint
