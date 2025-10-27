from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_model import LocationCreate, LocationUpdate


class LocationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all_locations(self):
        """Return all locations"""
        result = await self.session.execute(select(LocationEntity))
        return result.scalars().all()

    async def get_location_by_id(self, location_id: int):
        """Get a single location by ID"""
        result = await self.session.execute(
            select(LocationEntity).where(LocationEntity.id == location_id)
        )
        return result.scalar_one_or_none()

    async def create_location(self, data: LocationCreate):
        """Create a new location"""
        location = LocationEntity(**data.model_dump())
        self.session.add(location)
        await self.session.commit()
        await self.session.refresh(location)
        return location

    async def update_location(self, location_id: int, data: LocationUpdate):
        """Update an existing location"""
        await self.session.execute(
            update(LocationEntity)
            .where(LocationEntity.id == location_id)
            .values(**data.model_dump(exclude_unset=True))
        )
        await self.session.commit()
        return await self.get_location_by_id(location_id)

    async def delete_location(self, location_id: int):
        """Delete a location"""
        await self.session.execute(
            delete(LocationEntity).where(LocationEntity.id == location_id)
        )
        await self.session.commit()
