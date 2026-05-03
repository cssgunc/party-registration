import re
from datetime import UTC, datetime
from typing import ClassVar

from fastapi import Depends
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_session
from src.core.exceptions import BadRequestException, ConflictException, NotFoundException
from src.core.utils.date_utils import current_academic_year_start, is_same_academic_year
from src.core.utils.excel_utils import ExcelExporter
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
)
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_model import LocationDto
from src.modules.location.location_service import LocationService

from .student_entity import StudentEntity
from .student_model import (
    PaginatedStudentsResponse,
    SelfUpdateStudentDto,
    StudentData,
    StudentDto,
    StudentSuggestionDto,
    StudentUpdateDto,
)


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


class StudentInfoNotProvidedException(BadRequestException):
    def __init__(self):
        super().__init__("Student must provide contact information before registering a party")


_IS_REGISTERED_EXPR = case(
    (
        and_(
            StudentEntity.last_registered.isnot(None),
            StudentEntity.last_registered >= current_academic_year_start(),
        ),
        True,
    ),
    else_=False,
)

_STUDENT_QUERY_FIELDS = QueryFieldSet(
    fields={
        "phone_number": StudentEntity.phone_number,
        "contact_preference": StudentEntity.contact_preference,
        "last_registered": StudentEntity.last_registered,
        "is_registered": _IS_REGISTERED_EXPR,
        "id": AccountEntity.id,
        "first_name": AccountEntity.first_name,
        "last_name": AccountEntity.last_name,
        "email": AccountEntity.email,
        "onyen": AccountEntity.onyen,
        "pid": AccountEntity.pid,
        "residence": LocationEntity.formatted_address,
    },
    searchable=(
        "first_name",
        "last_name",
        ("first_name", "last_name"),
        "email",
        "onyen",
        "pid",
        "phone_number",
    ),
    default_sort=SortParam(field="last_name", order=SortOrder.ASC),
)


class StudentService:
    QUERY_FIELDS: ClassVar[QueryFieldSet] = _STUDENT_QUERY_FIELDS

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
        query_service: QueryService = Depends(),
    ):
        self.session = session
        self.location_service = location_service
        self.query_service = query_service

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

    @staticmethod
    def _build_dto_from_account(account: AccountEntity) -> StudentDto:
        """Build a partial StudentDto from an Account that has no Student entity yet."""
        return StudentDto(
            id=account.id,
            pid=account.pid,
            email=account.email,
            first_name=account.first_name,
            last_name=account.last_name,
            onyen=account.onyen,
            phone_number=None,
            contact_preference=None,
            last_registered=None,
            residence=None,
        )

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

    async def get_students_paginated(self, params: ListQueryParams) -> PaginatedStudentsResponse:
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
        # Build base query with JOIN for filter/sort and eager loading for hydration
        base_query = (
            select(StudentEntity)
            .join(AccountEntity, StudentEntity.account_id == AccountEntity.id)
            .outerjoin(LocationEntity, StudentEntity.residence_id == LocationEntity.id)
            .options(selectinload(StudentEntity.account), selectinload(StudentEntity.residence))
        )

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            field_set=_STUDENT_QUERY_FIELDS,
        )
        return PaginatedStudentsResponse(**result.model_dump())

    def export_students_to_excel(self, students_response: PaginatedStudentsResponse) -> bytes:
        headers = [
            "Onyen",
            "PID",
            "First Name",
            "Last Name",
            "Email",
            "Phone Number",
            "Contact Preference",
            "Is Registered",
            "Residence Address",
        ]
        exporter = ExcelExporter(sheet_title=f"Students {datetime.now(UTC).strftime('%Y-%m-%d')}")
        exporter.set_headers(headers)
        for student in students_response.items:
            # Mirrors the UI checkbox: "Yes" if last_registered is set
            # (cleared to None when unmarked via PATCH /students/{id}/is-registered)
            is_registered = "Yes" if student.last_registered is not None else "No"
            residence_address = (
                student.residence.location.formatted_address
                if student.residence is not None
                else "-"
            )
            phone = (
                ExcelExporter.format_phone(student.phone_number) if student.phone_number else "-"
            )
            contact_preference = (
                student.contact_preference.value.capitalize() if student.contact_preference else "-"
            )
            exporter.add_row(
                [
                    student.onyen,
                    student.pid,
                    student.first_name,
                    student.last_name,
                    student.email,
                    phone,
                    contact_preference,
                    is_registered,
                    residence_address,
                ]
            )
        return exporter.to_bytes()

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

    async def assert_student_entity_exists(self, account_id: int) -> None:
        """Assert that a Student entity exists with contact info for this account.
        Used before party creation to ensure student has provided phone and contact preference."""
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.account_id == account_id)
        )
        entity = result.scalar_one_or_none()
        if entity is None or entity.phone_number is None or entity.contact_preference is None:
            raise StudentInfoNotProvidedException()

    async def ensure_student_entity_exists(self, account_id: int) -> None:
        """Ensure a StudentEntity exists for this account, creating one with null
        phone/preference if missing. Called after SSO login for student accounts."""
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.account_id == account_id)
        )
        if result.scalar_one_or_none() is not None:
            return
        student_entity = StudentEntity.from_data(StudentData(), account_id)
        try:
            self.session.add(student_entity)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()

    async def get_student_me_dto(self, account_id: int) -> StudentDto:
        """
        Get StudentDto for the authenticated student. Returns a partial DTO (null phone/preference)
        if the Student entity does not exist yet — i.e., the student has not yet provided info.
        """
        result = await self.session.execute(
            select(StudentEntity)
            .where(StudentEntity.account_id == account_id)
            .options(selectinload(StudentEntity.account), selectinload(StudentEntity.residence))
        )
        student_entity = result.scalar_one_or_none()
        if student_entity is not None:
            return student_entity.to_dto()
        account = await self._get_account_entity_by_id(account_id)
        return self._build_dto_from_account(account)

    async def create_student(self, data: StudentUpdateDto, account_id: int) -> StudentDto:
        await self._validate_account_for_student(account_id)

        if await self._get_student_entity_by_phone(data.phone_number):
            raise StudentConflictException(data.phone_number)

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

    async def update_student(self, account_id: int, data: StudentUpdateDto) -> StudentDto:
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

        # Handle residence_place_id for admin updates
        # Admins can update residence at any time, bypassing academic year restrictions
        # Students must use the dedicated PUT /students/me/residence endpoint to update residence
        if data.residence_place_id is not None:
            # Get or create the new residence location
            location = await self.location_service.get_or_create_location(data.residence_place_id)
            student_entity.residence_id = location.id
            student_entity.residence_chosen_date = datetime.now(UTC)

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

    async def update_student_self(self, account_id: int, data: SelfUpdateStudentDto) -> StudentDto:
        result = await self.session.execute(
            select(StudentEntity)
            .where(StudentEntity.account_id == account_id)
            .options(selectinload(StudentEntity.account), selectinload(StudentEntity.residence))
        )
        student_entity = result.scalar_one_or_none()

        if student_entity is None:
            # Upsert: create Student entity for the first time
            account = await self._get_account_entity_by_id(account_id)
            if account.role != AccountRole.STUDENT:
                raise InvalidAccountRoleException(account_id, account.role)
            if await self._get_student_entity_by_phone(data.phone_number):
                raise StudentConflictException(data.phone_number)
            student_data = StudentData(
                contact_preference=data.contact_preference,
                phone_number=data.phone_number,
            )
            student_entity = StudentEntity.from_data(student_data, account_id)
            try:
                self.session.add(student_entity)
                await self.session.commit()
            except IntegrityError as e:
                await self.session.rollback()
                raise StudentConflictException(data.phone_number) from e
            await self.session.refresh(student_entity, ["account", "residence"])
            return student_entity.to_dto()

        account = student_entity.account
        if account.role != AccountRole.STUDENT:
            raise InvalidAccountRoleException(account_id, account.role)
        if (
            data.phone_number != student_entity.phone_number
            and await self._get_student_entity_by_phone(data.phone_number)
        ):
            raise StudentConflictException(data.phone_number)

        student_entity.contact_preference = data.contact_preference
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
        if student_entity.residence_chosen_date is not None and is_same_academic_year(
            student_entity.residence_chosen_date
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

    _AUTOCOMPLETE_LIMIT = 10

    async def autocomplete_students(self, query: str) -> list[StudentSuggestionDto]:
        """Return up to 10 students matching query against PID, email, onyen, or phone number."""
        pattern = f"%{query}%"
        digits_only_query = re.sub(r"\D", "", query)
        phone_pattern = f"%{digits_only_query}%"
        result = await self.session.execute(
            select(StudentEntity)
            .join(AccountEntity, StudentEntity.account_id == AccountEntity.id)
            .where(
                or_(
                    AccountEntity.pid.ilike(pattern),
                    AccountEntity.email.ilike(pattern),
                    AccountEntity.onyen.ilike(pattern),
                    StudentEntity.phone_number.ilike(phone_pattern),
                )
            )
            .options(selectinload(StudentEntity.account))
            .limit(self._AUTOCOMPLETE_LIMIT)
        )
        students = result.scalars().all()

        suggestions = []
        for student in students:
            account = student.account
            # Determine the first matching field (priority: pid, email, onyen, phone_number)
            if account.pid.lower().find(query.lower()) != -1:
                matched_field_name = "pid"
                matched_field_value = account.pid
            elif query.lower() in account.email.lower():
                matched_field_name = "email"
                matched_field_value = account.email
            elif query.lower() in account.onyen.lower():
                matched_field_name = "onyen"
                matched_field_value = account.onyen
            else:
                matched_field_name = "phone_number"
                matched_field_value = student.phone_number or ""

            suggestions.append(
                StudentSuggestionDto(
                    student_id=student.account_id,
                    first_name=account.first_name,
                    last_name=account.last_name,
                    matched_field_name=matched_field_name,
                    matched_field_value=matched_field_value,
                )
            )

        return suggestions

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
