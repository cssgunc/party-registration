import math
from datetime import datetime, timedelta
from typing import List

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import ConflictException, NotFoundException

from ..location.location_entity import LocationEntity
from ..location.location_service import LocationService
from ..student.student_entity import StudentEntity
from .party_entity import PartyEntity
from .party_model import Party, PartyData, AdminCreatePartyDTO, StudentCreatePartyDTO


class PartyNotFoundException(NotFoundException):
    def __init__(self, party_id: int):
        super().__init__(f"Party with ID {party_id} not found")


class LocationNotFoundException(NotFoundException):
    def __init__(self, location_id: int):
        super().__init__(f"Location with ID {location_id} not found")


class StudentNotFoundException(NotFoundException):
    def __init__(self, student_id: int):
        super().__init__(f"Student with ID {student_id} not found")


class PartyConflictException(ConflictException):
    def __init__(self, message: str):
        super().__init__(message)


class PartyService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends()
    ):
        self.session = session
        self.location_service = location_service

    async def _get_party_entity_by_id(self, party_id: int) -> PartyEntity:
        result = await self.session.execute(
            select(PartyEntity).where(PartyEntity.id == party_id)
        )
        party_entity = result.scalar_one_or_none()
        if party_entity is None:
            raise PartyNotFoundException(party_id)
        return party_entity

    async def _validate_location_exists(self, location_id: int) -> None:
        result = await self.session.execute(
            select(LocationEntity).where(LocationEntity.id == location_id)
        )
        if result.scalar_one_or_none() is None:
            raise LocationNotFoundException(location_id)

    async def _validate_student_exists(self, student_id: int) -> None:
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.account_id == student_id)
        )
        if result.scalar_one_or_none() is None:
            raise StudentNotFoundException(student_id)

    async def _get_location_by_place_id(self, place_id: str) -> LocationEntity | None:
        """Get a location from the database by Google Maps place_id."""
        result = await self.session.execute(
            select(LocationEntity).where(LocationEntity.google_place_id == place_id)
        )
        return result.scalar_one_or_none()

    async def _create_location_from_place_id(self, place_id: str) -> LocationEntity:
        """Create a new location in the database using Google Maps API."""
        # Get location details from Google Maps API
        location_data = await self.location_service.get_place_details(place_id)

        # Create new location entity
        new_location = LocationEntity(
            google_place_id=location_data.google_place_id,
            formatted_address=location_data.formatted_address,
            latitude=location_data.latitude,
            longitude=location_data.longitude,
            street_number=location_data.street_number,
            street_name=location_data.street_name,
            unit=location_data.unit,
            city=location_data.city,
            county=location_data.county,
            state=location_data.state,
            country=location_data.country,
            zip_code=location_data.zip_code,
            warning_count=0,
            citation_count=0,
            hold_expiration=None
        )

        self.session.add(new_location)
        await self.session.commit()
        await self.session.refresh(new_location)
        return new_location

    async def get_or_create_location(self, place_id: str) -> LocationEntity:
        """Get existing location by place_id, or create it if it doesn't exist."""
        # Try to get existing location
        location = await self._get_location_by_place_id(place_id)

        if location is None:
            # Location doesn't exist, create it
            location = await self._create_location_from_place_id(place_id)

        return location

    async def get_parties(self, skip: int = 0, limit: int | None = None) -> List[Party]:
        query = select(PartyEntity).offset(skip)
        if limit is not None:
            query = query.limit(limit)
        result = await self.session.execute(query)
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_party_by_id(self, party_id: int) -> Party:
        party_entity = await self._get_party_entity_by_id(party_id)
        return party_entity.to_model()

    async def get_parties_by_location(self, location_id: int) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity).where(PartyEntity.location_id == location_id)
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_contact(self, student_id: int) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity).where(
                (PartyEntity.contact_one_id == student_id)
                | (PartyEntity.contact_two_id == student_id)
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity).where(
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def create_party(self, data: PartyData) -> Party:
        # Validate that referenced resources exist
        await self._validate_location_exists(data.location_id)
        await self._validate_student_exists(data.contact_one_id)
        await self._validate_student_exists(data.contact_two_id)

        new_party = PartyEntity.from_model(data)
        try:
            self.session.add(new_party)
            await self.session.commit()
        except IntegrityError as e:
            raise PartyConflictException(f"Failed to create party: {str(e)}")
        await self.session.refresh(new_party)
        return new_party.to_model()

    async def update_party(self, party_id: int, data: PartyData) -> Party:
        party_entity = await self._get_party_entity_by_id(party_id)

        # Validate that referenced resources exist
        await self._validate_location_exists(data.location_id)
        await self._validate_student_exists(data.contact_one_id)
        await self._validate_student_exists(data.contact_two_id)

        for key, value in data.model_dump().items():
            if key == "id":
                continue
            if hasattr(party_entity, key):
                setattr(party_entity, key, value)

        try:
            self.session.add(party_entity)
            await self.session.commit()
        except IntegrityError as e:
            raise PartyConflictException(f"Failed to update party: {str(e)}")
        await self.session.refresh(party_entity)
        return party_entity.to_model()

    async def create_party_from_student_dto(
        self, dto: StudentCreatePartyDTO, student_account_id: int
    ) -> Party:
        """Create a party registration from a student. contact_one is auto-filled."""
        # Get or create location
        location = await self.get_or_create_location(dto.place_id)

        # Validate students exist
        await self._validate_student_exists(student_account_id)
        await self._validate_student_exists(dto.contact_two_id)

        # Create party data
        party_data = PartyData(
            party_datetime=dto.party_datetime,
            location_id=location.id,
            contact_one_id=student_account_id,
            contact_two_id=dto.contact_two_id
        )

        # Create party
        new_party = PartyEntity.from_model(party_data)
        self.session.add(new_party)
        await self.session.commit()
        await self.session.refresh(new_party)
        return new_party.to_model()

    async def create_party_from_admin_dto(self, dto: AdminCreatePartyDTO) -> Party:
        """Create a party registration from an admin. Both contacts must be specified."""
        # Get or create location
        location = await self.get_or_create_location(dto.place_id)

        # Validate students exist
        await self._validate_student_exists(dto.contact_one_id)
        await self._validate_student_exists(dto.contact_two_id)

        # Create party data
        party_data = PartyData(
            party_datetime=dto.party_datetime,
            location_id=location.id,
            contact_one_id=dto.contact_one_id,
            contact_two_id=dto.contact_two_id
        )

        # Create party
        new_party = PartyEntity.from_model(party_data)
        self.session.add(new_party)
        await self.session.commit()
        await self.session.refresh(new_party)
        return new_party.to_model()

    async def update_party_from_student_dto(
        self, party_id: int, dto: StudentCreatePartyDTO, student_account_id: int
    ) -> Party:
        """Update a party registration from a student. contact_one is auto-filled."""
        # Get existing party
        party_entity = await self._get_party_entity_by_id(party_id)

        # Get or create location
        location = await self.get_or_create_location(dto.place_id)

        # Validate students exist
        await self._validate_student_exists(student_account_id)
        await self._validate_student_exists(dto.contact_two_id)

        # Update party fields
        party_entity.party_datetime = dto.party_datetime
        party_entity.location_id = location.id
        party_entity.contact_one_id = student_account_id
        party_entity.contact_two_id = dto.contact_two_id

        self.session.add(party_entity)
        await self.session.commit()
        await self.session.refresh(party_entity)
        return party_entity.to_model()

    async def update_party_from_admin_dto(
        self, party_id: int, dto: AdminCreatePartyDTO
    ) -> Party:
        """Update a party registration from an admin. Both contacts must be specified."""
        # Get existing party
        party_entity = await self._get_party_entity_by_id(party_id)

        # Get or create location
        location = await self.get_or_create_location(dto.place_id)

        # Validate students exist
        await self._validate_student_exists(dto.contact_one_id)
        await self._validate_student_exists(dto.contact_two_id)

        # Update party fields
        party_entity.party_datetime = dto.party_datetime
        party_entity.location_id = location.id
        party_entity.contact_one_id = dto.contact_one_id
        party_entity.contact_two_id = dto.contact_two_id

        self.session.add(party_entity)
        await self.session.commit()
        await self.session.refresh(party_entity)
        return party_entity.to_model()

    async def delete_party(self, party_id: int) -> Party:
        party_entity = await self._get_party_entity_by_id(party_id)
        party = party_entity.to_model()
        await self.session.delete(party_entity)
        await self.session.commit()
        return party

    async def party_exists(self, party_id: int) -> bool:
        result = await self.session.execute(
            select(PartyEntity).where(PartyEntity.id == party_id)
        )
        return result.scalar_one_or_none() is not None

    async def get_party_count(self) -> int:
        result = await self.session.execute(select(PartyEntity))
        parties = result.scalars().all()
        return len(parties)

    async def get_parties_by_student_and_date(
        self, student_id: int, target_date: datetime
    ) -> List[Party]:
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(
            hour=23, minute=59, second=59, microsecond=999999
        )

        result = await self.session.execute(
            select(PartyEntity).where(
                (
                    (PartyEntity.contact_one_id == student_id)
                    | (PartyEntity.contact_two_id == student_id)
                ),
                PartyEntity.party_datetime >= start_of_day,
                PartyEntity.party_datetime <= end_of_day,
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_radius(
        self, latitude: float, longitude: float
    ) -> List[Party]:
        current_time = datetime.now()
        start_time = current_time - timedelta(hours=6)
        end_time = current_time + timedelta(hours=12)

        result = await self.session.execute(
            select(PartyEntity)
            .options(selectinload(PartyEntity.location))
            .where(
                PartyEntity.party_datetime >= start_time,
                PartyEntity.party_datetime <= end_time,
            )
        )
        parties = result.scalars().all()

        parties_within_radius = []
        for party in parties:
            if party.location is None:
                continue

            distance = self._calculate_haversine_distance(
                latitude,
                longitude,
                float(party.location.latitude),
                float(party.location.longitude),
            )

            if distance <= env.PARTY_SEARCH_RADIUS_MILES:
                parties_within_radius.append(party)

        return [party.to_model() for party in parties_within_radius]

    def _calculate_haversine_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))

        r = 3959
        return c * r
