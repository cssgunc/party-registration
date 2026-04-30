import math
from datetime import UTC, datetime, timedelta
from typing import ClassVar

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
    ForbiddenException,
    NotFoundException,
)
from src.core.utils.date_utils import is_same_academic_year
from src.core.utils.excel_utils import ExcelExporter
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
    make_query_service,
)
from src.modules.account.account_entity import AccountEntity
from src.modules.location.location_model import LocationDto
from src.modules.student.student_model import StudentDto
from src.modules.student.student_service import StudentInfoNotProvidedException, StudentService

from ..location.location_entity import LocationEntity
from ..location.location_service import LocationService
from ..student.student_entity import StudentEntity
from .party_entity import PartyEntity
from .party_model import (
    AdminCreatePartyDto,
    ContactDto,
    PaginatedPartiesResponse,
    PartyData,
    PartyDto,
    PartyStatus,
    StudentCreatePartyDto,
)

_PARTY_QUERY_FIELDS = QueryFieldSet(
    fields={
        "id": PartyEntity.id,
        "party_datetime": PartyEntity.party_datetime,
        "status": PartyEntity.status,
        "contact_one.id": PartyEntity.contact_one_id,
        "contact_one.first_name": AccountEntity.first_name,
        "contact_one.last_name": AccountEntity.last_name,
        "contact_one.email": AccountEntity.email,
        "contact_one.phone_number": StudentEntity.phone_number,
        "contact_one.onyen": AccountEntity.onyen,
        "contact_one.pid": AccountEntity.pid,
        "contact_one.contact_preference": StudentEntity.contact_preference,
        "contact_one.last_registered": StudentEntity.last_registered,
        "contact_two.email": PartyEntity.contact_two_email,
        "contact_two.first_name": PartyEntity.contact_two_first_name,
        "contact_two.last_name": PartyEntity.contact_two_last_name,
        "contact_two.phone_number": PartyEntity.contact_two_phone_number,
        "contact_two.contact_preference": PartyEntity.contact_two_contact_preference,
        "location.id": PartyEntity.location_id,
        "location.google_place_id": LocationEntity.google_place_id,
        "location.formatted_address": LocationEntity.formatted_address,
        "location.hold_expiration": LocationEntity.hold_expiration,
    },
    searchable=(
        "location.formatted_address",
        "location.google_place_id",
        "contact_one.first_name",
        "contact_one.last_name",
        ("contact_one.first_name", "contact_one.last_name"),
        "contact_one.email",
        "contact_one.onyen",
        "contact_one.pid",
        "contact_one.phone_number",
        "contact_two.email",
        "contact_two.first_name",
        "contact_two.last_name",
        ("contact_two.first_name", "contact_two.last_name"),
        "contact_two.phone_number",
    ),
    default_sort=SortParam(field="party_datetime", order=SortOrder.ASC),
)


class PartyNotFoundException(NotFoundException):
    def __init__(self, party_id: int):
        super().__init__(f"Party with ID {party_id} not found")


class PartyConflictException(ConflictException):
    def __init__(self, message: str):
        super().__init__(message)


class ContactTwoMatchesContactOneException(BadRequestException):
    def __init__(self, field: str):
        super().__init__(f"Contact two {field} must be different from contact one's {field}")


class PartyDateTooSoonException(BadRequestException):
    def __init__(self):
        super().__init__("Party date must be at least 2 business days from now")


class PartySmartNotCompletedException(BadRequestException):
    def __init__(self):
        super().__init__("You must complete Party Smart before registering a party")


class NoResidenceException(BadRequestException):
    def __init__(self):
        super().__init__("Student must choose a residence before registering a party")


class UnauthorizedPartyAccessException(ForbiddenException):
    def __init__(self):
        super().__init__("Student can only modify their own parties")


class PartyNotOwnedByStudentException(ForbiddenException):
    def __init__(self, party_id: int):
        super().__init__(f"Student does not own party with ID {party_id}")


class PartyCancelledException(BadRequestException):
    def __init__(self, party_id: int):
        super().__init__(f"Party with ID {party_id} has already been cancelled")


class PartyInPastException(BadRequestException):
    def __init__(self):
        super().__init__("Cannot modify a party that has already occurred")


class PartyService:
    QUERY_FIELDS: ClassVar[QueryFieldSet] = _PARTY_QUERY_FIELDS

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
        student_service: StudentService = Depends(),
        query_service: QueryService = make_query_service(_PARTY_QUERY_FIELDS),
    ):
        self.session = session
        self.location_service = location_service
        self.student_service = student_service
        self.query_service = query_service

    async def _get_party_entity_by_id(self, party_id: int) -> PartyEntity:
        result = await self.session.execute(
            select(PartyEntity)
            .where(PartyEntity.id == party_id)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
        )
        party_entity = result.scalar_one_or_none()
        if party_entity is None:
            raise PartyNotFoundException(party_id)
        return party_entity

    def _calculate_business_days_ahead(self, target_date: datetime) -> int:
        """Calculate the number of business days between now and target date."""
        # Ensure both datetimes are timezone-aware (use UTC)
        current_date = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

        # If target_date is naive, make it UTC-aware; otherwise keep its timezone
        if target_date.tzinfo is None:
            target_date_only = target_date.replace(
                hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
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
        """Validate that student has completed Party Smart in the current academic year."""
        student = await self.student_service.get_student_by_id(student_id)

        if student.last_registered is None:
            raise PartySmartNotCompletedException()

        # Check if last_registered is in the current academic year
        if not is_same_academic_year(student.last_registered):
            raise PartySmartNotCompletedException()

    def _validate_contact_two_differs_from_contact_one(
        self, contact_one_email: str, contact_one_phone: str | None, contact_two: ContactDto
    ) -> None:
        """Validate that contact two's email and phone number differ from contact one's."""
        if contact_one_phone is None:
            raise StudentInfoNotProvidedException()
        if contact_two.email.strip().lower() == contact_one_email.strip().lower():
            raise ContactTwoMatchesContactOneException("email")
        # Normalize phone numbers to digits only for comparison
        c1_phone_digits = "".join(filter(str.isdigit, contact_one_phone))
        c2_phone_digits = "".join(filter(str.isdigit, contact_two.phone_number))
        if c1_phone_digits == c2_phone_digits:
            raise ContactTwoMatchesContactOneException("phone number")

    def _validate_party_not_cancelled(self, party_entity: PartyEntity) -> None:
        """Validate that the party has not been cancelled."""
        if party_entity.status == PartyStatus.CANCELLED:
            raise PartyCancelledException(party_entity.id)

    def _validate_party_belongs_to_student(
        self, party_entity: PartyEntity, student_id: int
    ) -> None:
        """Validate that the party belongs to the specified student."""
        if party_entity.contact_one_id != student_id:
            raise PartyNotOwnedByStudentException(party_entity.id)

    def _validate_party_in_future(self, party_entity: PartyEntity) -> None:
        """Validate that the party is scheduled for a future date."""
        party_dt = party_entity.party_datetime
        if party_dt.tzinfo is None:
            party_dt = party_dt.replace(tzinfo=UTC)
        if party_dt <= datetime.now(UTC):
            raise PartyInPastException()

    async def _validate_student_party_prerequisites(
        self, student_id: int, party_datetime: datetime
    ) -> None:
        """Validate party date and Party Smart attendance for a student."""
        self._validate_party_date(party_datetime)
        await self._validate_party_smart_attendance(student_id)

    async def get_parties(self, skip: int = 0, limit: int | None = None) -> list[PartyDto]:
        query = (
            select(PartyEntity)
            .order_by(PartyEntity.id)
            .offset(skip)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
        )
        if limit is not None:
            query = query.limit(limit)

        result = await self.session.execute(query)
        parties = result.scalars().all()
        return [party.to_dto() for party in parties]

    async def get_parties_paginated(self, params: ListQueryParams) -> PaginatedPartiesResponse:
        """
        Get parties with server-side pagination, sorting, and filtering.

        Query parameters are automatically parsed from the request:
        - page_number: Page number (1-indexed, default: 1)
        - page_size: Items per page (default: all)
        - sort_by: Field to sort by
        - sort_order: Sort order ('asc' or 'desc')
        - location_id: Filter by location ID
        - contact_one_id: Filter by contact one (student) ID

        Returns:
            PaginatedPartiesResponse with items and metadata
        """
        # Build base query with JOINs for filter/sort and eager loading for hydration
        base_query = (
            select(PartyEntity)
            .join(LocationEntity, PartyEntity.location_id == LocationEntity.id)
            .join(StudentEntity, PartyEntity.contact_one_id == StudentEntity.account_id)
            .join(AccountEntity, StudentEntity.account_id == AccountEntity.id)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
        )

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            dto_converter=lambda entity: entity.to_dto(),
        )
        return PaginatedPartiesResponse(**result.model_dump())

    async def get_party_by_id(self, party_id: int) -> PartyDto:
        party_entity = await self._get_party_entity_by_id(party_id)
        return party_entity.to_dto()

    async def get_parties_by_location(self, location_id: int) -> list[PartyDto]:
        """Get all parties for a specific location (no pagination)."""
        result = await self.session.execute(
            select(PartyEntity)
            .where(PartyEntity.location_id == location_id)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
        )
        parties = result.scalars().all()
        return [party.to_dto() for party in parties]

    async def get_parties_by_contact(self, student_id: int) -> list[PartyDto]:
        """Get all parties for a specific student (no pagination)."""
        result = await self.session.execute(
            select(PartyEntity)
            .where(
                PartyEntity.contact_one_id == student_id,
                PartyEntity.status != PartyStatus.CANCELLED,
            )
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
        )
        parties = result.scalars().all()
        return [party.to_dto() for party in parties]

    async def get_parties_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> list[PartyDto]:
        result = await self.session.execute(
            select(PartyEntity)
            .where(
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
                PartyEntity.status != PartyStatus.CANCELLED,
            )
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
        )
        parties = result.scalars().all()
        return [party.to_dto() for party in parties]

    async def create_party(self, data: PartyData) -> PartyDto:
        # Validate that referenced resources exist
        await self.location_service.assert_location_exists(data.location_id)
        await self.student_service.assert_student_exists(data.contact_one_id)

        new_party = PartyEntity.from_data(data)
        try:
            self.session.add(new_party)
            await self.session.commit()
        except IntegrityError as e:
            raise PartyConflictException(f"Failed to create party: {e!s}") from e

        return await new_party.load_dto(self.session)

    async def update_party(self, party_id: int, data: PartyData) -> PartyDto:
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
            raise PartyConflictException(f"Failed to update party: {e!s}") from e

        return await party_entity.load_dto(self.session)

    async def _validate_student_party_and_get_location(
        self, student_account_id: int, party_datetime: datetime
    ) -> tuple[LocationDto, StudentDto]:
        """
        Validate student can register a party and get their residence location.
        Returns tuple of (location, student).
        """
        # Validate student has provided contact info before any other checks
        await self.student_service.assert_student_entity_exists(student_account_id)

        # Validate student party prerequisites (date and Party Smart)
        await self._validate_student_party_prerequisites(student_account_id, party_datetime)

        # Get student and validate they have a residence
        student = await self.student_service.get_student_by_id(student_account_id)
        if student.residence is None:
            raise NoResidenceException()

        # Use student's residence as the party location
        location = student.residence.location

        # Validate location has no active hold
        self.location_service.assert_valid_location_hold(location)

        return location, student

    async def create_party_from_student_dto(
        self, dto: StudentCreatePartyDto, student_account_id: int
    ) -> PartyDto:
        """
        Create a party registration from a student.
        contact_one is auto-filled, location from residence.
        """
        location, student = await self._validate_student_party_and_get_location(
            student_account_id, dto.party_datetime
        )

        # Validate contact two differs from contact one
        self._validate_contact_two_differs_from_contact_one(
            student.email,
            student.phone_number,
            dto.contact_two,
        )

        # Create party data with contact_two information directly
        party_data = PartyData(
            party_datetime=dto.party_datetime,
            location_id=location.id,
            contact_one_id=student_account_id,
            contact_two=dto.contact_two,
        )

        # Create party
        new_party = PartyEntity.from_data(party_data)
        self.session.add(new_party)
        await self.session.commit()

        return await new_party.load_dto(self.session)

    async def _validate_admin_party_and_get_details(
        self, google_place_id: str, contact_one_student_id: int
    ) -> tuple[LocationDto, StudentDto]:
        """
        Validate admin party data and get location and contact_one entity.
        Returns tuple of (location, contact_one).
        Admins skip hold validation.
        """
        # Get/create location (skip hold validation for admins)
        location = await self.location_service.get_or_create_location(google_place_id)

        # Get contact_one by student ID
        contact_one = await self.student_service.get_student_by_id(contact_one_student_id)

        return location, contact_one

    async def create_party_from_admin_dto(self, dto: AdminCreatePartyDto) -> PartyDto:
        """Create a party registration from an admin. Both contacts must be specified."""
        location, contact_one = await self._validate_admin_party_and_get_details(
            dto.google_place_id, dto.contact_one_student_id
        )

        # Validate contact two differs from contact one
        if contact_one.phone_number is None or contact_one.contact_preference is None:
            raise StudentInfoNotProvidedException()
        self._validate_contact_two_differs_from_contact_one(
            contact_one.email, contact_one.phone_number, dto.contact_two
        )

        # Create party data with contact_two information directly
        party_data = PartyData(
            party_datetime=dto.party_datetime,
            location_id=location.id,
            contact_one_id=contact_one.id,
            contact_two=dto.contact_two,
        )

        # Create party
        new_party = PartyEntity.from_data(party_data)
        self.session.add(new_party)
        await self.session.commit()

        return await new_party.load_dto(self.session)

    async def update_party_from_student_dto(
        self, party_id: int, dto: StudentCreatePartyDto, student_account_id: int
    ) -> PartyDto:
        """
        Update a party registration from a student.
        contact_one is auto-filled, location from residence.
        """
        # Get existing party
        party_entity = await self._get_party_entity_by_id(party_id)

        # Validate ownership, status, and timing
        self._validate_party_belongs_to_student(party_entity, student_account_id)
        self._validate_party_not_cancelled(party_entity)
        self._validate_party_in_future(party_entity)

        # Validate student can create party and get location
        location, student = await self._validate_student_party_and_get_location(
            student_account_id, dto.party_datetime
        )

        # Validate contact two differs from contact one
        self._validate_contact_two_differs_from_contact_one(
            student.email,
            student.phone_number,
            dto.contact_two,
        )

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

        return await party_entity.load_dto(self.session)

    async def update_party_from_admin_dto(
        self, party_id: int, dto: AdminCreatePartyDto
    ) -> PartyDto:
        """Update a party registration from an admin. Both contacts must be specified."""
        # Get existing party
        party_entity = await self._get_party_entity_by_id(party_id)

        # Validate and get location and contact_one details
        location, contact_one = await self._validate_admin_party_and_get_details(
            dto.google_place_id, dto.contact_one_student_id
        )

        # Validate contact two differs from contact one
        if contact_one.phone_number is None or contact_one.contact_preference is None:
            raise StudentInfoNotProvidedException()
        self._validate_contact_two_differs_from_contact_one(
            contact_one.email, contact_one.phone_number, dto.contact_two
        )

        # Update party fields
        party_entity.party_datetime = dto.party_datetime
        party_entity.location_id = location.id
        party_entity.contact_one_id = contact_one.id
        party_entity.contact_two_email = dto.contact_two.email
        party_entity.contact_two_first_name = dto.contact_two.first_name
        party_entity.contact_two_last_name = dto.contact_two.last_name
        party_entity.contact_two_phone_number = dto.contact_two.phone_number
        party_entity.contact_two_contact_preference = dto.contact_two.contact_preference

        self.session.add(party_entity)
        await self.session.commit()

        return await party_entity.load_dto(self.session)

    async def cancel_party_as_student(self, party_id: int, student_account_id: int) -> PartyDto:
        """Cancel a party as a student. Only the party owner can cancel their party."""
        party_entity = await self._get_party_entity_by_id(party_id)

        # Validate ownership, status, and timing
        self._validate_party_belongs_to_student(party_entity, student_account_id)
        self._validate_party_not_cancelled(party_entity)
        self._validate_party_in_future(party_entity)

        party_entity.status = PartyStatus.CANCELLED
        self.session.add(party_entity)
        await self.session.commit()

        return party_entity.to_dto()

    async def delete_party(self, party_id: int) -> PartyDto:
        party_entity = await self._get_party_entity_by_id(party_id)
        party = party_entity.to_dto()
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
    ) -> list[PartyDto]:
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
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
        )
        parties = result.scalars().all()
        return [party.to_dto() for party in parties]

    async def get_parties_by_radius(self, latitude: float, longitude: float) -> list[PartyDto]:
        current_time = datetime.now(UTC)
        start_time = current_time - timedelta(hours=6)
        end_time = current_time + timedelta(hours=12)

        result = await self.session.execute(
            select(PartyEntity)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
            .where(
                PartyEntity.party_datetime >= start_time,
                PartyEntity.party_datetime <= end_time,
                PartyEntity.status != PartyStatus.CANCELLED,
            )
        )
        parties = result.scalars().all()

        parties_within_radius: list[PartyEntity] = []
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

        return [party.to_dto() for party in parties_within_radius]

    async def get_parties_by_radius_and_date_range(
        self,
        latitude: float,
        longitude: float,
        start_date: datetime,
        end_date: datetime,
    ) -> list[PartyDto]:
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
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
            .where(
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
                PartyEntity.status != PartyStatus.CANCELLED,
            )
        )
        parties = result.scalars().all()

        parties_with_distance: list[tuple[PartyEntity, float]] = []
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
                parties_with_distance.append((party, distance))

        parties_with_distance.sort(key=lambda x: x[1])
        return [party.to_dto() for party, _ in parties_with_distance]

    async def get_party_at_location_in_date_range(
        self,
        location_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> PartyDto | None:
        """Get the first confirmed party at a specific location within a date range."""
        result = await self.session.execute(
            select(PartyEntity)
            .options(
                selectinload(PartyEntity.location),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
                selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
            )
            .where(
                PartyEntity.location_id == location_id,
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
                PartyEntity.status != PartyStatus.CANCELLED,
            )
            .limit(1)
        )
        party = result.scalar_one_or_none()
        return party.to_dto() if party is not None else None

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

    def export_parties_to_excel(
        self,
        parties_response: PaginatedPartiesResponse,
        *,
        is_police: bool,
    ) -> bytes:
        """
        Export a list of parties to Excel format with formatting.

        Args:
            parties_response: Paginated party response to export
            is_police: If True, use the police format (11 columns, full names only).
                       If False, use the staff/admin format (14 columns, includes residence).

        Returns:
            Excel file content as bytes
        """
        exporter = ExcelExporter(sheet_title=f"Parties {datetime.now(UTC).strftime('%Y-%m-%d')}")

        if is_police:
            headers = [
                "Address",
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
            exporter.set_headers(headers)

            for party in parties_response.items:
                c1 = party.contact_one
                c2 = party.contact_two
                exporter.add_row(
                    [
                        party.location.formatted_address,
                        party.party_datetime.strftime("%Y-%m-%d"),
                        party.party_datetime.strftime("%-I:%M %p"),
                        f"{c1.first_name} {c1.last_name}",
                        c1.email,
                        ExcelExporter.format_phone(c1.phone_number or ""),
                        c1.contact_preference.value.capitalize() if c1.contact_preference else "-",
                        f"{c2.first_name} {c2.last_name}",
                        c2.email,
                        ExcelExporter.format_phone(c2.phone_number),
                        c2.contact_preference.value.capitalize(),
                    ]
                )
        else:
            headers = [
                "Address",
                "Date of Party",
                "Time of Party",
                "Contact One First Name",
                "Contact One Last Name",
                "Contact One Email",
                "Contact One Phone Number",
                "Contact One Contact Preference",
                "Contact One Residence",
                "Contact Two First Name",
                "Contact Two Last Name",
                "Contact Two Email",
                "Contact Two Phone Number",
                "Contact Two Contact Preference",
            ]
            exporter.set_headers(headers)

            for party in parties_response.items:
                c1 = party.contact_one
                c2 = party.contact_two
                residence_address = c1.residence.location.formatted_address if c1.residence else ""
                exporter.add_row(
                    [
                        party.location.formatted_address,
                        party.party_datetime.strftime("%Y-%m-%d"),
                        party.party_datetime.strftime("%-I:%M %p"),
                        c1.first_name,
                        c1.last_name,
                        c1.email,
                        ExcelExporter.format_phone(c1.phone_number or ""),
                        c1.contact_preference.value.capitalize() if c1.contact_preference else "-",
                        residence_address,
                        c2.first_name,
                        c2.last_name,
                        c2.email,
                        ExcelExporter.format_phone(c2.phone_number),
                        c2.contact_preference.value.capitalize(),
                    ]
                )

        return exporter.to_bytes()
