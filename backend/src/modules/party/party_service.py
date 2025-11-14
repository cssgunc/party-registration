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
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)

from ..account.account_service import AccountByEmailNotFoundException, AccountService
from ..location.location_entity import LocationEntity
from ..location.location_service import LocationService
from ..student.student_entity import StudentEntity
from .party_entity import PartyEntity
from .party_model import AdminCreatePartyDTO, Party, PartyData, StudentCreatePartyDTO


class PartyNotFoundException(NotFoundException):
    def __init__(self, party_id: int):
        super().__init__(f"Party with ID {party_id} not found")


class LocationNotFoundException(NotFoundException):
    def __init__(self, location_id: int):
        super().__init__(f"Location with ID {location_id} not found")


class LocationNotFoundByPlaceIdException(NotFoundException):
    def __init__(self, place_id: str):
        super().__init__(f"Location with Google Place ID {place_id} not found")


class StudentNotFoundException(NotFoundException):
    def __init__(self, student_id: int):
        super().__init__(f"Student with ID {student_id} not found")


class PartyConflictException(ConflictException):
    def __init__(self, message: str):
        super().__init__(message)


class PartyDateTooSoonException(BadRequestException):
    def __init__(self):
        super().__init__("Party date must be at least 2 business days from now")


class PartySmartNotCompletedException(BadRequestException):
    def __init__(self, student_id: int):
        super().__init__(
            f"Student {student_id} must complete Party Smart before registering a party"
        )


class LocationHoldActiveException(BadRequestException):
    def __init__(self, location_id: int, hold_expiration: datetime):
        super().__init__(
            f"Location {location_id} has an active hold until {hold_expiration.isoformat()}"
        )


class PartyService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
        account_service: AccountService = Depends(),
    ):
        self.session = session
        self.location_service = location_service
        self.account_service = account_service

    async def _get_party_entity_by_id(self, party_id: int) -> PartyEntity:
        result = await self.session.execute(
            select(PartyEntity)
            .where(PartyEntity.id == party_id)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(
                    StudentEntity.account
                ),
            )
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

    def _calculate_business_days_ahead(self, target_date: datetime) -> int:
        """Calculate the number of business days between now and target date."""
        current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        target_date_only = target_date.replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        business_days = 0
        current = current_date

        while current < target_date_only:
            # Skip weekends (Saturday=5, Sunday=6)
            if current.weekday() < 5:
                business_days += 1
            current += timedelta(days=1)

        return business_days

    def _validate_party_date(self, party_datetime: datetime) -> None:
        """Validate that party date is at least 2 business days from now."""
        business_days = self._calculate_business_days_ahead(party_datetime)
        if business_days < 2:
            raise PartyDateTooSoonException()

    async def _validate_party_smart_attendance(self, student_id: int) -> None:
        """Validate that student has completed Party Smart after the most recent August 1st."""
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.account_id == student_id)
        )
        student = result.scalar_one_or_none()
        if student is None:
            raise StudentNotFoundException(student_id)

        # Check if last_registered is null
        if student.last_registered is None:
            raise PartySmartNotCompletedException(student_id)

        # Calculate the most recent August 1st
        now = datetime.now()
        current_year = now.year

        # August 1st of the current year
        august_first_this_year = datetime(current_year, 8, 1, 0, 0, 0)

        # If today is before August 1st, use last year's August 1st
        # Otherwise, use this year's August 1st
        if now < august_first_this_year:
            most_recent_august_first = datetime(current_year - 1, 8, 1, 0, 0, 0)
        else:
            most_recent_august_first = august_first_this_year

        # Check if last_registered is after the most recent August 1st
        if student.last_registered < most_recent_august_first:
            raise PartySmartNotCompletedException(student_id)

    def _validate_location_hold(self, location: LocationEntity) -> None:
        """Validate that location does not have an active hold."""
        if location.hold_expiration is not None:
            # Check if hold is still active
            if location.hold_expiration > datetime.now():
                raise LocationHoldActiveException(location.id, location.hold_expiration)

    async def _validate_and_get_location(self, place_id: str) -> LocationEntity:
        """Get or create location and validate it has no active hold."""
        location = await self.get_or_create_location(place_id)
        self._validate_location_hold(location)
        return location

    async def _validate_student_party_prerequisites(
        self, student_id: int, party_datetime: datetime
    ) -> None:
        """Validate party date and Party Smart attendance for a student."""
        self._validate_party_date(party_datetime)
        await self._validate_party_smart_attendance(student_id)

    async def _get_student_by_email(self, email: str) -> StudentEntity:
        """Get a student from the database by email address."""
        # First find the account by email
        try:
            account = await self.account_service.get_account_by_email(email)
        except AccountByEmailNotFoundException:
            raise StudentNotFoundException(0)  # We don't have an ID yet

        # Then get the student entity
        result = await self.session.execute(
            select(StudentEntity)
            .where(StudentEntity.account_id == account.id)
            .options(selectinload(StudentEntity.account))
        )
        student = result.scalar_one_or_none()
        if student is None:
            raise StudentNotFoundException(account.id)
        return student

    async def _get_location_by_place_id(self, place_id: str) -> LocationEntity:
        """Get a location from the database by Google Maps place_id."""
        result = await self.session.execute(
            select(LocationEntity).where(LocationEntity.google_place_id == place_id)
        )
        location = result.scalar_one_or_none()
        if location is None:
            raise LocationNotFoundByPlaceIdException(place_id)
        return location

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
            hold_expiration=None,
        )

        self.session.add(new_location)
        await self.session.commit()
        await self.session.refresh(new_location)
        return new_location

    async def get_or_create_location(self, place_id: str) -> LocationEntity:
        """Get existing location by place_id, or create it if it doesn't exist."""
        # Try to get existing location
        try:
            location = await self._get_location_by_place_id(place_id)
            return location
        except LocationNotFoundByPlaceIdException:
            # Location doesn't exist, create it
            location = await self._create_location_from_place_id(place_id)
            return location

    async def get_parties(self, skip: int = 0, limit: int | None = None) -> List[Party]:
        query = (
            select(PartyEntity)
            .offset(skip)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(
                    StudentEntity.account
                ),
            )
        )
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
            select(PartyEntity)
            .where(PartyEntity.location_id == location_id)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(
                    StudentEntity.account
                ),
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_contact(self, student_id: int) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity)
            .where(PartyEntity.contact_one_id == student_id)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(
                    StudentEntity.account
                ),
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity)
            .where(
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
            )
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(
                    StudentEntity.account
                ),
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def create_party(self, data: PartyData) -> Party:
        # Validate that referenced resources exist
        await self._validate_location_exists(data.location_id)
        await self._validate_student_exists(data.contact_one_id)

        new_party = PartyEntity.from_model(data)
        try:
            self.session.add(new_party)
            await self.session.commit()
        except IntegrityError as e:
            raise PartyConflictException(f"Failed to create party: {str(e)}")
        return await new_party.load_model(self.session)

    async def update_party(self, party_id: int, data: PartyData) -> Party:
        party_entity = await self._get_party_entity_by_id(party_id)

        # Validate that referenced resources exist
        await self._validate_location_exists(data.location_id)
        await self._validate_student_exists(data.contact_one_id)

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
        return await party_entity.load_model(self.session)

    async def create_party_from_student_dto(
        self, dto: StudentCreatePartyDTO, student_account_id: int
    ) -> Party:
        """Create a party registration from a student. contact_one is auto-filled."""
        # Validate student party prerequisites (date and Party Smart)
        await self._validate_student_party_prerequisites(
            student_account_id, dto.party_datetime
        )

        # Get/create location and validate no hold
        location = await self._validate_and_get_location(dto.place_id)

        # Validate contact_one (student) exists
        await self._validate_student_exists(student_account_id)

        # Create party data with contact_two information directly
        party_data = PartyData(
            party_datetime=dto.party_datetime,
            location_id=location.id,
            contact_one_id=student_account_id,
            contact_two=dto.contact_two,
        )

        # Create party
        new_party = PartyEntity.from_model(party_data)
        self.session.add(new_party)
        await self.session.commit()
        return await new_party.load_model(self.session)

    async def create_party_from_admin_dto(self, dto: AdminCreatePartyDTO) -> Party:
        """Create a party registration from an admin. Both contacts must be specified."""
        # Get/create location and validate no hold
        location = await self._validate_and_get_location(dto.place_id)

        # Get contact_one by email
        contact_one_student = await self._get_student_by_email(dto.contact_one_email)
        contact_one_id = contact_one_student.account_id

        # Create party data with contact_two information directly
        party_data = PartyData(
            party_datetime=dto.party_datetime,
            location_id=location.id,
            contact_one_id=contact_one_id,
            contact_two=dto.contact_two,
        )

        # Create party
        new_party = PartyEntity.from_model(party_data)
        self.session.add(new_party)
        await self.session.commit()
        return await new_party.load_model(self.session)

    async def update_party_from_student_dto(
        self, party_id: int, dto: StudentCreatePartyDTO, student_account_id: int
    ) -> Party:
        """Update a party registration from a student. contact_one is auto-filled."""
        # Get existing party
        party_entity = await self._get_party_entity_by_id(party_id)

        # Validate student party prerequisites (date and Party Smart)
        await self._validate_student_party_prerequisites(
            student_account_id, dto.party_datetime
        )

        # Get/create location and validate no hold
        location = await self._validate_and_get_location(dto.place_id)

        # Validate contact_one (student) exists
        await self._validate_student_exists(student_account_id)

        # Update party fields
        party_entity.party_datetime = dto.party_datetime
        party_entity.location_id = location.id
        party_entity.contact_one_id = student_account_id
        party_entity.contact_two_email = dto.contact_two.email
        party_entity.contact_two_first_name = dto.contact_two.first_name
        party_entity.contact_two_last_name = dto.contact_two.last_name
        party_entity.contact_two_phone_number = dto.contact_two.phone_number
        party_entity.contact_two_contact_preference = dto.contact_two.contact_preference

        self.session.add(party_entity)
        await self.session.commit()
        return await party_entity.load_model(self.session)

    async def update_party_from_admin_dto(
        self, party_id: int, dto: AdminCreatePartyDTO
    ) -> Party:
        """Update a party registration from an admin. Both contacts must be specified."""
        # Get existing party
        party_entity = await self._get_party_entity_by_id(party_id)

        # Get/create location and validate no hold
        location = await self._validate_and_get_location(dto.place_id)

        # Get contact_one by email
        contact_one_student = await self._get_student_by_email(dto.contact_one_email)
        contact_one_id = contact_one_student.account_id

        # Update party fields
        party_entity.party_datetime = dto.party_datetime
        party_entity.location_id = location.id
        party_entity.contact_one_id = contact_one_id
        party_entity.contact_two_email = dto.contact_two.email
        party_entity.contact_two_first_name = dto.contact_two.first_name
        party_entity.contact_two_last_name = dto.contact_two.last_name
        party_entity.contact_two_phone_number = dto.contact_two.phone_number
        party_entity.contact_two_contact_preference = dto.contact_two.contact_preference

        self.session.add(party_entity)
        await self.session.commit()
        return await party_entity.load_model(self.session)

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
            select(PartyEntity)
            .where(
                PartyEntity.contact_one_id == student_id,
                PartyEntity.party_datetime >= start_of_day,
                PartyEntity.party_datetime <= end_of_day,
            )
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(
                    StudentEntity.account
                ),
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
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(
                    StudentEntity.account
                ),
            )
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
