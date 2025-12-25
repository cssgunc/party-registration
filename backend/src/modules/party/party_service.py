import csv
import io
import math
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import BadRequestException, ConflictException, NotFoundException
from src.modules.location.location_model import Location
from src.modules.student.student_service import StudentNotFoundException, StudentService

from ..account.account_service import AccountByEmailNotFoundException, AccountService
from ..location.location_service import LocationService
from ..student.student_entity import StudentEntity
from .party_entity import PartyEntity
from .party_model import AdminCreatePartyDTO, Party, PartyData, StudentCreatePartyDTO


class PartyNotFoundException(NotFoundException):
    def __init__(self, party_id: int):
        super().__init__(f"Party with ID {party_id} not found")


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


class PartyService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
        account_service: AccountService = Depends(),
        student_service: StudentService = Depends(),
    ):
        self.session = session
        self.location_service = location_service
        self.account_service = account_service
        self.student_service = student_service

    async def _get_party_entity_by_id(self, party_id: int) -> PartyEntity:
        result = await self.session.execute(
            select(PartyEntity)
            .where(PartyEntity.id == party_id)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
            )
        )
        party_entity = result.scalar_one_or_none()
        if party_entity is None:
            raise PartyNotFoundException(party_id)
        return party_entity

    def _calculate_business_days_ahead(self, target_date: datetime) -> int:
        """Calculate the number of business days between now and target date."""
        # Ensure both datetimes are timezone-aware (use UTC)
        current_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # If target_date is naive, make it UTC-aware; otherwise keep its timezone
        if target_date.tzinfo is None:
            target_date_only = target_date.replace(
                hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
            )
        else:
            target_date_only = target_date.replace(hour=0, minute=0, second=0, microsecond=0)

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
        student = await self.student_service.get_student_by_id(student_id)

        if student.last_registered is None:
            raise PartySmartNotCompletedException(student_id)

        # Calculate the most recent August 1st
        now = datetime.now(timezone.utc)
        current_year = now.year

        # August 1st of the current year (UTC)
        august_first_this_year = datetime(current_year, 8, 1, 0, 0, 0, tzinfo=timezone.utc)

        # If today is before August 1st, use last year's August 1st
        # Otherwise, use this year's August 1st
        if now < august_first_this_year:
            most_recent_august_first = datetime(
                current_year - 1, 8, 1, 0, 0, 0, tzinfo=timezone.utc
            )
        else:
            most_recent_august_first = august_first_this_year

        # Check if last_registered is after the most recent August 1st
        if student.last_registered < most_recent_august_first:
            raise PartySmartNotCompletedException(student_id)

    async def _validate_and_get_location(self, place_id: str) -> Location:
        """Get or create location and validate it has no active hold."""
        location = await self.location_service.get_or_create_location(place_id)
        self.location_service.assert_valid_location_hold(location)
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
            raise StudentNotFoundException(email=email)

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

    async def get_parties(self, skip: int = 0, limit: int | None = None) -> List[Party]:
        query = (
            select(PartyEntity)
            .offset(skip)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
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
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
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
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
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
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def create_party(self, data: PartyData) -> Party:
        # Validate that referenced resources exist
        await self.location_service.assert_location_exists(data.location_id)
        await self.student_service.assert_student_exists(data.contact_one_id)

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
        await self.location_service.assert_location_exists(data.location_id)
        await self.student_service.assert_student_exists(data.contact_one_id)

        for key, value in data.model_dump().items():
            if key == "id":
                continue
            if hasattr(party_entity, key):
                setattr(party_entity, key, value)

        party_entity.set_contact_two(data.contact_two)

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
        await self._validate_student_party_prerequisites(student_account_id, dto.party_datetime)

        # Get/create location and validate no hold
        location = await self._validate_and_get_location(dto.google_place_id)

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
        location = await self._validate_and_get_location(dto.google_place_id)

        # Get contact_one by email
        contact_one = await self._get_student_by_email(dto.contact_one_email)

        # Create party data with contact_two information directly
        party_data = PartyData(
            party_datetime=dto.party_datetime,
            location_id=location.id,
            contact_one_id=contact_one.account_id,
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
        await self._validate_student_party_prerequisites(student_account_id, dto.party_datetime)

        # Get/create location and validate no hold
        location = await self._validate_and_get_location(dto.google_place_id)

        # Validate contact_one (student) exists
        await self.student_service.assert_student_exists(student_account_id)

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

    async def update_party_from_admin_dto(self, party_id: int, dto: AdminCreatePartyDTO) -> Party:
        """Update a party registration from an admin. Both contacts must be specified."""
        # Get existing party
        party_entity = await self._get_party_entity_by_id(party_id)

        # Get/create location and validate no hold
        location = await self._validate_and_get_location(dto.google_place_id)

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
        result = await self.session.execute(select(PartyEntity).where(PartyEntity.id == party_id))
        return result.scalar_one_or_none() is not None

    async def get_party_count(self) -> int:
        result = await self.session.execute(select(PartyEntity))
        parties = result.scalars().all()
        return len(parties)

    async def get_parties_by_student_and_date(
        self, student_id: int, target_date: datetime
    ) -> List[Party]:
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        result = await self.session.execute(
            select(PartyEntity)
            .where(
                PartyEntity.contact_one_id == student_id,
                PartyEntity.party_datetime >= start_of_day,
                PartyEntity.party_datetime <= end_of_day,
            )
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_radius(self, latitude: float, longitude: float) -> List[Party]:
        current_time = datetime.now(timezone.utc)
        start_time = current_time - timedelta(hours=6)
        end_time = current_time + timedelta(hours=12)

        result = await self.session.execute(
            select(PartyEntity)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
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

    async def get_parties_by_radius_and_date_range(
        self,
        latitude: float,
        longitude: float,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Party]:
        """
        Get parties within a radius of a location within a specified date range.

        Args:
            latitude: Latitude of the search center
            longitude: Longitude of the search center
            start_date: Start of the date range (inclusive)
            end_date: End of the date range (inclusive)

        Returns:
            List of parties within the radius and date range
        """
        result = await self.session.execute(
            select(PartyEntity)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
            )
            .where(
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
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
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))

        r = 3959
        return c * r

    async def export_parties_to_csv(self, parties: List[Party]) -> str:
        """
        Export a list of parties to CSV format.

        Args:
            parties: List of Party models to export

        Returns:
            CSV content as a string
        """
        if not parties:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(
                [
                    "Fully formatted address",
                    "Date of Party",
                    "Time of Party",
                    "Contact One Full Name",
                    "Contact One Email",
                    "Contact One Phone Number",
                    "Contact One Contact Preference",
                    "Contact Two Full Name",
                    "Contact Two Email",
                    "Contact Two Phone Number",
                    "Contact Two Contact Preference",
                ]
            )
            return output.getvalue()

        party_ids = [party.id for party in parties]

        result = await self.session.execute(
            select(PartyEntity)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
            )
            .where(PartyEntity.id.in_(party_ids))
        )
        party_entities = result.scalars().all()

        party_entity_map = {party.id: party for party in party_entities}

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(
            [
                "Fully formatted address",
                "Date of Party",
                "Time of Party",
                "Contact One Full Name",
                "Contact One Email",
                "Contact One Phone Number",
                "Contact One Contact Preference",
                "Contact Two Full Name",
                "Contact Two Email",
                "Contact Two Phone Number",
                "Contact Two Contact Preference",
            ]
        )

        for party in parties:
            party_entity = party_entity_map.get(party.id)
            if party_entity is None:
                continue

            # Format address
            formatted_address = ""
            if party_entity.location:
                formatted_address = party_entity.location.formatted_address or ""

            # Format date and time
            party_date = party.party_datetime.strftime("%Y-%m-%d") if party.party_datetime else ""
            party_time = party.party_datetime.strftime("%H:%M:%S") if party.party_datetime else ""

            contact_one_full_name = ""
            contact_one_email = ""
            contact_one_phone = ""
            contact_one_preference = ""
            if party_entity.contact_one:
                contact_one_full_name = f"{party_entity.contact_one.account.first_name} {party_entity.contact_one.account.last_name}"
                contact_one_phone = party_entity.contact_one.phone_number or ""
                contact_one_preference = (
                    party_entity.contact_one.contact_preference.value
                    if party_entity.contact_one.contact_preference
                    else ""
                )
                if party_entity.contact_one.account:
                    contact_one_email = party_entity.contact_one.account.email or ""

            contact_two_full_name = ""
            contact_two_email = ""
            contact_two_phone = ""
            contact_two_preference = ""
            contact_two_full_name = (
                f"{party_entity.contact_two_first_name} {party_entity.contact_two_last_name}"
            )
            contact_two_phone = party_entity.contact_two_phone_number or ""
            contact_two_preference = (
                party_entity.contact_two_contact_preference.value
                if party_entity.contact_two_contact_preference
                else ""
            )
            contact_two_email = party_entity.contact_two_email or ""

            writer.writerow(
                [
                    formatted_address,
                    party_date,
                    party_time,
                    contact_one_full_name,
                    contact_one_email,
                    contact_one_phone,
                    contact_one_preference,
                    contact_two_full_name,
                    contact_two_email,
                    contact_two_phone,
                    contact_two_preference,
                ]
            )

        return output.getvalue()
