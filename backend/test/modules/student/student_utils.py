from datetime import UTC, datetime
from typing import Any, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountRole
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import (
    ContactPreference,
    DbStudent,
    StudentCreateDto,
    StudentData,
    StudentDto,
    StudentUpdateDto,
)
from test.modules.account.account_utils import AccountTestUtils
from test.utils.resource_test_utils import ResourceTestUtils


class StudentOverrides(TypedDict, total=False):
    account_id: int
    contact_preference: ContactPreference
    last_registered: datetime | None
    phone_number: str
    first_name: str
    last_name: str
    email: str
    pid: str
    residence_place_id: str | None


class StudentTestUtils(
    ResourceTestUtils[
        StudentEntity,
        StudentData,
        StudentDto | StudentUpdateDto | DbStudent,
    ]
):
    def __init__(self, session: AsyncSession, account_utils: AccountTestUtils):
        super().__init__(
            session,
            entity_class=StudentEntity,
            data_class=StudentData,
        )
        self.account_utils = account_utils

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        return {
            "account_id": 1,
            "contact_preference": "text",
            "last_registered": None,
            "phone_number": f"919555{count:04d}",
            "first_name": f"FStudent{count}",
            "last_name": f"LStudent{count}",
            "residence_place_id": None,
        }

    @staticmethod
    def get_sample_create_data() -> dict:
        return {"account_id": 1, "data": StudentTestUtils.get_sample_data()}

    @override
    async def next_dict(self, **overrides: Unpack[StudentOverrides]) -> dict:
        data = self.get_or_default(
            overrides,
            {"contact_preference", "last_registered", "phone_number"},
        )
        self.count += 1
        return data

    async def next_update_dto(self, **overrides: Unpack[StudentOverrides]) -> StudentUpdateDto:
        """Generate StudentUpdateDto for admin create/update operations."""
        # Increment count to ensure unique phone numbers
        self.count += 1
        result_data = self.get_or_default(
            overrides,
            {"contact_preference", "last_registered", "phone_number", "residence_place_id"},
        )
        return StudentUpdateDto(**result_data)

    # Backward compatibility alias
    async def next_data_with_names(self, **overrides: Unpack[StudentOverrides]) -> StudentUpdateDto:
        """Deprecated: Use next_update_dto instead."""
        return await self.next_update_dto(**overrides)

    async def next_student_create(self, **overrides: Unpack[StudentOverrides]) -> StudentCreateDto:
        local_overrides: StudentOverrides = dict(overrides)  # type: ignore
        if "account_id" not in local_overrides:
            account = await self.account_utils.create_one(
                role=AccountRole.STUDENT.value, **local_overrides
            )
            local_overrides["account_id"] = account.id
        student_data = await self.next_update_dto(**local_overrides)
        return StudentCreateDto(account_id=local_overrides["account_id"], data=student_data)

    @override
    async def next_entity(self, **overrides: Unpack[StudentOverrides]) -> StudentEntity:
        student_create = await self.next_student_create(**overrides)
        # Convert StudentUpdateDto to StudentData for entity creation
        student_data = StudentData(
            contact_preference=student_create.data.contact_preference,
            last_registered=student_create.data.last_registered,
            phone_number=student_create.data.phone_number,
        )
        residence_id = None
        if student_create.data.residence_place_id:
            # Note: This requires location_service, but entity creation doesn't need it
            # The residence_id will be None here, can be set separately if needed
            pass
        return StudentEntity.from_data(student_data, student_create.account_id, residence_id)

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: StudentOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_data(self, **overrides: Unpack[StudentOverrides]) -> StudentData:
        return await super().next_data(**overrides)

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[StudentOverrides]
    ) -> list[StudentEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[StudentOverrides]) -> StudentEntity:
        return await super().create_one(**overrides)

    async def create_student_with_old_party_smart(
        self, account_id: int | None = None, **overrides: Any
    ) -> StudentEntity:
        """Create a student with Party Smart completion from a previous academic year.

        Useful for testing scenarios where students need to complete Party Smart again
        in the current academic year.
        """
        old_date = self.get_old_academic_year_date()

        # Create student with old last_registered date
        if account_id is not None:
            overrides["account_id"] = account_id
        if "last_registered" not in overrides:
            overrides["last_registered"] = old_date

        return await self.create_one(**overrides)

    def get_old_academic_year_date(self) -> datetime:
        """Get a date from the previous academic year (before most recent August 1st).

        Returns a date from July of the previous academic year.
        """
        now = datetime.now(UTC)
        if now.month >= 8:
            # We're in current academic year, so return last year before August
            return datetime(now.year - 1, 7, 1, tzinfo=UTC)
        else:
            # We're before Aug 1, so return two years ago
            return datetime(now.year - 2, 7, 1, tzinfo=UTC)

    async def set_student_residence(
        self, student: StudentEntity, location_id: int, chosen_date: datetime | None = None
    ) -> StudentEntity:
        """Set a student's residence and persist to database.

        Args:
            student: The student entity to update
            location_id: The location ID for the residence
            chosen_date: When the residence was chosen (defaults to now)

        Returns:
            The updated student entity with residence loaded
        """
        if chosen_date is None:
            chosen_date = datetime.now(UTC)

        student.residence_id = location_id
        student.residence_chosen_date = chosen_date
        self.session.add(student)
        await self.session.commit()
        await self.session.refresh(student, ["residence"])
        return student
