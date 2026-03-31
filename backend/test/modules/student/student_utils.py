from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountRole
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import (
    ContactPreference,
    DbStudent,
    StudentCreateDto,
    StudentData,
    StudentDto,
    StudentSuggestionDto,
    StudentUpdateDto,
)
from test.modules.account.account_utils import AccountTestUtils
from test.modules.location.location_utils import LocationTestUtils
from test.utils.resource_test_utils import ResourceTestUtils

if TYPE_CHECKING:
    from src.modules.location.location_entity import LocationEntity


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
    def __init__(
        self,
        session: AsyncSession,
        account_utils: AccountTestUtils,
        location_utils: LocationTestUtils,
    ):
        super().__init__(
            session,
            entity_class=StudentEntity,
            data_class=StudentData,
        )
        self.account_utils = account_utils
        self.location_utils = location_utils

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
        student_data = StudentData(
            contact_preference=student_create.data.contact_preference,
            last_registered=student_create.data.last_registered,
            phone_number=student_create.data.phone_number,
        )
        residence_id = None
        if student_create.data.residence_place_id:
            location = await self.location_utils.create_one(
                google_place_id=student_create.data.residence_place_id
            )
            residence_id = location.id
        return StudentEntity.from_data(student_data, student_create.account_id, residence_id)

    async def create_student_with_old_party_smart(
        self, **overrides: Unpack[StudentOverrides]
    ) -> StudentEntity:
        """Create a student with Party Smart completion from a previous academic year.

        Useful for testing scenarios where students need to complete Party Smart again
        in the current academic year.
        """
        old_date = self.get_old_academic_year_date()
        local_overrides: StudentOverrides = dict(overrides)  # type: ignore
        if "last_registered" not in local_overrides:
            local_overrides["last_registered"] = old_date
        return await self.create_one(**local_overrides)

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

    def assert_residence(
        self, student_dto: StudentDto, expected_location: "LocationEntity"
    ) -> None:
        """Assert that a student has a valid residence matching the expected location.

        Args:
            student_dto: The student DTO to check
            expected_location: The expected location entity for the residence
        """
        assert student_dto.residence is not None, (
            "Expected student to have a residence, but residence is None"
        )
        assert student_dto.residence.residence_chosen_date is not None, (
            "Expected residence_chosen_date to be set, but it is None"
        )
        self.location_utils.assert_matches(student_dto.residence.location, expected_location)

    def assert_suggestion_match(
        self,
        suggestion: StudentSuggestionDto,
        *,
        student_dto: StudentDto | None = None,
        student_id: int | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        matched_field_name: str,
        matched_field_value: str,
    ) -> None:
        resolved_id = student_dto.id if student_dto is not None else student_id
        resolved_first = student_dto.first_name if student_dto is not None else first_name
        resolved_last = student_dto.last_name if student_dto is not None else last_name
        assert suggestion.student_id == resolved_id
        assert suggestion.first_name == resolved_first
        assert suggestion.last_name == resolved_last
        assert suggestion.matched_field_name == matched_field_name
        assert suggestion.matched_field_value == matched_field_value

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
