from datetime import UTC, datetime

from fastapi import Depends, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_session
from src.core.exceptions import BadRequestException, ConflictException, NotFoundException
from src.core.query_utils import get_paginated_results, parse_pagination_params
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.location.location_model import LocationDto
from src.modules.location.location_service import LocationService

from .student_entity import StudentEntity
from .student_model import PaginatedStudentsResponse, StudentData, StudentDataWithNames, StudentDto


class StudentNotFoundException(NotFoundException):
    def __init__(self, account_id: int | None = None, email: str | None = None):
        if account_id is not None and email is not None:
            raise ValueError("Provide either account_id or email, not both")
        if account_id is not None:
            super().__init__(f"Student with ID {account_id} not found")
        elif email is not None:
            super().__init__(f"Student with email {email} not found")


class StudentConflictException(ConflictException):
    def __init__(self, phone_number: str):
        super().__init__(f"Student with phone number {phone_number} already exists")


class AccountNotFoundException(NotFoundException):
    def __init__(self, account_id: int):
        super().__init__(f"Account with ID {account_id} not found")


class InvalidAccountRoleException(BadRequestException):
    def __init__(self, account_id: int, role: AccountRole):
        super().__init__(
            f"Account with ID {account_id} has role '{role.value}', expected 'student'"
        )


class StudentAlreadyExistsException(ConflictException):
    def __init__(self, account_id: int):
        super().__init__(f"Student with account ID {account_id} already exists")


class ResidenceAlreadyChosenException(BadRequestException):
    def __init__(self):
        super().__init__(
            "Student has already chosen a residence for this academic year and cannot change it"
        )


class StudentService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
    ):
        self.session = session
        self.location_service = location_service

    async def _get_student_entity_by_account_id(self, account_id: int) -> StudentEntity:
        result = await self.session.execute(
            select(StudentEntity)
            .where(StudentEntity.account_id == account_id)
            .options(selectinload(StudentEntity.account), selectinload(StudentEntity.residence))
        )
        student_entity = result.scalar_one_or_none()
        if student_entity is None:
            raise StudentNotFoundException(account_id)
        return student_entity

    async def _get_student_entity_by_phone(self, phone_number: str) -> StudentEntity | None:
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.phone_number == phone_number)
        )
        return result.scalar_one_or_none()

    async def _get_account_entity_by_id(self, account_id: int) -> AccountEntity:
        result = await self.session.execute(
            select(AccountEntity).where(AccountEntity.id == account_id)
        )
        account = result.scalar_one_or_none()
        if account is None:
            raise AccountNotFoundException(account_id)
        return account

    async def _validate_account_for_student(self, account_id: int) -> AccountEntity:
        account = await self._get_account_entity_by_id(account_id)

        if account.role != AccountRole.STUDENT:
            raise InvalidAccountRoleException(account_id, account.role)

        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.account_id == account_id)
        )
        existing_student = result.scalar_one_or_none()
        if existing_student is not None:
            raise StudentAlreadyExistsException(account_id)

        return account

    async def get_students(self, skip: int = 0, limit: int | None = None) -> list[StudentDto]:
        query = (
            select(StudentEntity)
            .options(selectinload(StudentEntity.account), selectinload(StudentEntity.residence))
            .order_by(StudentEntity.account_id)
            .offset(skip)
        )
        if limit is not None:
            query = query.limit(limit)
        result = await self.session.execute(query)
        students = result.scalars().all()
        return [student.to_dto() for student in students]

    async def get_students_paginated(
        self,
        request: Request,
    ) -> PaginatedStudentsResponse:
        """
        Get students with server-side pagination and sorting.

        Query parameters are automatically parsed from the request:
        - page_number: Page number (1-indexed, default: 1)
        - page_size: Items per page (default: all)
        - sort_by: Field to sort by
        - sort_order: Sort order ('asc' or 'desc')

        Returns:
            PaginatedStudentsResponse with items and metadata
        """
        # Build base query with eager loading
        base_query = select(StudentEntity).options(
            selectinload(StudentEntity.account), selectinload(StudentEntity.residence)
        )

        # Define allowed fields for sorting and filtering
        allowed_sort_fields = [
            "account_id",
            "phone_number",
            "contact_preference",
            "last_registered",
        ]
        allowed_filter_fields = [
            "account_id",
            "phone_number",
            "contact_preference",
            "last_registered",
        ]

        # Parse query params and get paginated results
        query_params = parse_pagination_params(
            request,
            allowed_sort_fields=allowed_sort_fields,
            allowed_filter_fields=allowed_filter_fields,
        )

        # Use the generic pagination utility
        return await get_paginated_results(
            session=self.session,
            base_query=base_query,
            entity_class=StudentEntity,
            dto_converter=lambda entity: entity.to_dto(),
            query_params=query_params,
            allowed_sort_fields=allowed_sort_fields,
            allowed_filter_fields=allowed_filter_fields,
        )

    async def get_student_count(self) -> int:
        count_query = select(func.count(StudentEntity.account_id))
        count_result = await self.session.execute(count_query)
        return count_result.scalar_one()

    async def get_student_by_id(self, account_id: int) -> StudentDto:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        return student_entity.to_dto()

    async def assert_student_exists(self, account_id: int) -> None:
        """Assert that a student with the given account ID exists."""
        await self._get_student_entity_by_account_id(account_id)

    def _is_same_academic_year(self, date1: datetime | None, date2: datetime | None) -> bool:
        """Check if two dates are in the same academic year (August 1 - July 31)."""
        if date1 is None or date2 is None:
            return False

        # Ensure both dates are timezone-aware
        if date1.tzinfo is None:
            date1 = date1.replace(tzinfo=UTC)
        if date2.tzinfo is None:
            date2 = date2.replace(tzinfo=UTC)

        # Determine academic year for each date
        # Academic year starts August 1
        year1 = date1.year if date1.month >= 8 else date1.year - 1
        year2 = date2.year if date2.month >= 8 else date2.year - 1

        return year1 == year2

    async def create_student(
        self, data: StudentDataWithNames, account_id: int, is_admin: bool = False
    ) -> StudentDto:
        account = await self._validate_account_for_student(account_id)

        if await self._get_student_entity_by_phone(data.phone_number):
            raise StudentConflictException(data.phone_number)

        account.first_name = data.first_name
        account.last_name = data.last_name
        self.session.add(account)

        # Get or create residence location if residence_place_id is provided
        residence_id = None
        if data.residence_place_id:
            location = await self.location_service.get_or_create_location(data.residence_place_id)
            residence_id = location.id

        student_data = StudentData(
            contact_preference=data.contact_preference,
            last_registered=data.last_registered,
            phone_number=data.phone_number,
        )
        new_student = StudentEntity.from_data(student_data, account_id, residence_id)
        try:
            self.session.add(new_student)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise StudentConflictException(data.phone_number) from e

        await self.session.refresh(new_student, ["account", "residence"])
        return new_student.to_dto()

    async def update_student(
        self, account_id: int, data: StudentData | StudentDataWithNames, is_admin: bool = False
    ) -> StudentDto:
        student_entity = await self._get_student_entity_by_account_id(account_id)

        account = student_entity.account
        if account is None:
            raise AccountNotFoundException(account_id)

        if account.role != AccountRole.STUDENT:
            raise InvalidAccountRoleException(account_id, account.role)

        if (
            data.phone_number != student_entity.phone_number
            and await self._get_student_entity_by_phone(data.phone_number)
        ):
            raise StudentConflictException(data.phone_number)

        # Only update account names if data includes them (StudentDataWithNames)
        if isinstance(data, StudentDataWithNames):
            account.first_name = data.first_name
            account.last_name = data.last_name
            self.session.add(account)

            # Handle residence_place_id for admin updates
            if hasattr(data, "residence_place_id"):
                if data.residence_place_id is not None:
                    # Check if student already has a residence in the same academic year
                    # Admins can override this check
                    if (
                        not is_admin
                        and student_entity.residence_chosen_date is not None
                        and self._is_same_academic_year(
                            student_entity.residence_chosen_date, datetime.now(UTC)
                        )
                    ):
                        raise ResidenceAlreadyChosenException()

                    # Get or create the new residence location
                    location = await self.location_service.get_or_create_location(
                        data.residence_place_id
                    )
                    student_entity.residence_id = location.id
                    student_entity.residence_chosen_date = datetime.now(UTC)
                else:
                    # Clear residence if None is provided
                    student_entity.residence_id = None
                    student_entity.residence_chosen_date = None

        student_entity.contact_preference = data.contact_preference
        student_entity.last_registered = data.last_registered
        student_entity.phone_number = data.phone_number

        try:
            self.session.add(student_entity)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise StudentConflictException(data.phone_number) from e

        await self.session.refresh(student_entity, ["account", "residence"])
        return student_entity.to_dto()

    async def update_residence(self, account_id: int, residence_place_id: str) -> LocationDto:
        """Update student's residence. Can only be done once per academic year."""
        student_entity = await self._get_student_entity_by_account_id(account_id)

        # Check if student has already chosen a residence this academic year
        if student_entity.residence_chosen_date is not None and self._is_same_academic_year(
            student_entity.residence_chosen_date, datetime.now(UTC)
        ):
            raise ResidenceAlreadyChosenException()

        # Get or create the residence location
        location = await self.location_service.get_or_create_location(residence_place_id)

        # Update student's residence
        student_entity.residence_id = location.id
        student_entity.residence_chosen_date = datetime.now(UTC)

        self.session.add(student_entity)
        await self.session.commit()

        return location

    async def delete_student(self, account_id: int) -> StudentDto:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        student_dto = student_entity.to_dto()
        await self.session.delete(student_entity)
        await self.session.commit()
        return student_dto

    async def update_is_registered(self, account_id: int, is_registered: bool) -> StudentDto:
        """
        Update the registration status of a student.
        If is_registered is True, sets last_registered to current datetime.
        If is_registered is False, sets last_registered to None.
        """
        student_entity = await self._get_student_entity_by_account_id(account_id)

        if is_registered:
            student_entity.last_registered = datetime.now(UTC)
        else:
            student_entity.last_registered = None

        self.session.add(student_entity)
        await self.session.commit()
        await self.session.refresh(student_entity, ["account", "residence"])
        return student_entity.to_dto()
