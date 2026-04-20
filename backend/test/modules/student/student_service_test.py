from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountRole
from src.modules.location.location_service import LocationService
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference, SelfUpdateStudentDto, StudentDto
from src.modules.student.student_service import (
    AccountNotFoundException,
    InvalidAccountRoleException,
    ResidenceAlreadyChosenException,
    StudentAlreadyExistsException,
    StudentConflictException,
    StudentInfoNotProvidedException,
    StudentNotFoundException,
    StudentService,
)
from test.modules.account.account_utils import AccountTestUtils
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils
from test.modules.student.student_utils import StudentTestUtils


class TestStudentService:
    student_utils: StudentTestUtils
    account_utils: AccountTestUtils
    student_service: StudentService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        student_utils: StudentTestUtils,
        account_utils: AccountTestUtils,
        student_service: StudentService,
    ):
        self.student_utils = student_utils
        self.account_utils = account_utils
        self.student_service = student_service

    @pytest.mark.asyncio
    async def test_get_students_empty(self):
        students = await self.student_service.get_students()
        assert len(students) == 0

    @pytest.mark.asyncio
    async def test_create_student(self) -> None:
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        data = await self.student_utils.next_update_dto()

        student = await self.student_service.create_student(data, account_id=account.id)

        assert isinstance(student, StudentDto)
        assert student.id == account.id
        self.student_utils.assert_matches(student, data)

    @pytest.mark.asyncio
    async def test_create_student_conflict(self) -> None:
        account1 = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        account2 = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        data = await self.student_utils.next_update_dto()
        await self.student_service.create_student(data, account_id=account1.id)

        with pytest.raises(StudentConflictException):
            await self.student_service.create_student(data, account_id=account2.id)

    @pytest.mark.asyncio
    async def test_multiple_null_phone_numbers_do_not_conflict(self) -> None:
        """Regression: SQL Server treats two NULLs as a unique constraint violation.
        Multiple unonboarded students (null phone_number) must coexist without conflict."""
        account1 = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        account2 = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        await self.student_service.ensure_student_entity_exists(account1.id)
        await self.student_service.ensure_student_entity_exists(account2.id)

        student1 = await self.student_service.get_student_by_id(account1.id)
        student2 = await self.student_service.get_student_by_id(account2.id)
        assert student1.phone_number is None
        assert student2.phone_number is None

    @pytest.mark.asyncio
    async def test_get_students(self):
        students = await self.student_utils.create_many(i=3)

        fetched = await self.student_service.get_students()
        assert len(fetched) == 3

        for s, f in zip(students, fetched, strict=False):
            self.student_utils.assert_matches(s, f)

    @pytest.mark.asyncio
    async def test_get_student_by_id(self):
        student_entity = await self.student_utils.create_one()

        fetched = await self.student_service.get_student_by_id(student_entity.account_id)

        assert fetched.id == student_entity.account_id
        self.student_utils.assert_matches(fetched, student_entity)

    @pytest.mark.asyncio
    async def test_get_student_by_id_not_found(self):
        with pytest.raises(StudentNotFoundException):
            await self.student_service.get_student_by_id(999)

    @pytest.mark.asyncio
    async def test_update_student(self):
        student_entity = await self.student_utils.create_one()

        update_data = await self.student_utils.next_update_dto(
            first_name="Jane",
            last_name="Doe",
            contact_preference=ContactPreference.CALL,
        )
        updated = await self.student_service.update_student(student_entity.account_id, update_data)

        assert student_entity.account_id == updated.id
        self.student_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_student_not_found(self):
        update_data = await self.student_utils.next_update_dto()
        with pytest.raises(StudentNotFoundException):
            await self.student_service.update_student(999, update_data)

    @pytest.mark.asyncio
    async def test_update_student_conflict(self):
        student1 = await self.student_utils.create_one()
        student2 = await self.student_utils.create_one()

        assert student1.phone_number is not None
        with pytest.raises(StudentConflictException):
            await self.student_service.update_student(
                student2.account_id,
                await self.student_utils.next_update_dto(phone_number=student1.phone_number),
            )

    @pytest.mark.asyncio
    async def test_delete_student(self):
        student_entity = await self.student_utils.create_one()

        deleted = await self.student_service.delete_student(student_entity.account_id)
        self.student_utils.assert_matches(deleted, student_entity)

        with pytest.raises(StudentNotFoundException):
            await self.student_service.get_student_by_id(student_entity.account_id)

    @pytest.mark.asyncio
    async def test_delete_student_not_found(self):
        with pytest.raises(StudentNotFoundException):
            await self.student_service.delete_student(999)

    @pytest.mark.asyncio
    async def test_create_student_with_datetime_timezone(self):
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        last_reg = datetime(2024, 1, 15, 10, 30, 0, tzinfo=UTC)
        data = await self.student_utils.next_update_dto(last_registered=last_reg)

        student = await self.student_service.create_student(data, account_id=account.id)
        assert student.last_registered == last_reg

    @pytest.mark.asyncio
    async def test_update_student_with_datetime_timezone(self):
        student_entity = await self.student_utils.create_one()

        last_reg = datetime(2024, 3, 20, 14, 45, 30, tzinfo=UTC)
        update_data = await self.student_utils.next_update_dto(last_registered=last_reg)
        updated = await self.student_service.update_student(student_entity.account_id, update_data)
        self.student_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_create_student_with_nonexistent_account(self):
        data = await self.student_utils.next_update_dto()
        with pytest.raises(AccountNotFoundException):
            await self.student_service.create_student(data, account_id=99999)

    @pytest.mark.asyncio
    async def test_create_student_with_non_student_role(self):
        admin_account = await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        data = await self.student_utils.next_update_dto()

        with pytest.raises(InvalidAccountRoleException):
            await self.student_service.create_student(data, account_id=admin_account.id)

    @pytest.mark.asyncio
    async def test_create_student_duplicate_account_id(self):
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        data1 = await self.student_utils.next_update_dto()
        await self.student_service.create_student(data1, account_id=account.id)

        data2 = await self.student_utils.next_update_dto()
        with pytest.raises(StudentAlreadyExistsException):
            await self.student_service.create_student(data2, account_id=account.id)

    @pytest.mark.asyncio
    async def test_update_student_with_non_student_role(self, test_session: AsyncSession):
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        data = await self.student_utils.next_update_dto()
        await self.student_service.create_student(data, account_id=account.id)

        account.role = AccountRole.ADMIN
        test_session.add(account)
        await test_session.commit()

        update_data = await self.student_utils.next_update_dto()
        with pytest.raises(InvalidAccountRoleException):
            await self.student_service.update_student(account.id, update_data)

    @pytest.mark.asyncio
    async def test_update_is_registered_true(self):
        student_entity = await self.student_utils.create_one()

        assert student_entity.last_registered is None

        before_update = datetime.now(UTC)
        updated = await self.student_service.update_is_registered(
            student_entity.account_id, is_registered=True
        )
        after_update = datetime.now(UTC)

        assert updated.last_registered is not None
        assert before_update <= updated.last_registered <= after_update

    @pytest.mark.asyncio
    async def test_update_is_registered_false(self):
        last_reg = datetime(2024, 1, 15, 10, 30, 0, tzinfo=UTC)
        student_entity = await self.student_utils.create_one(last_registered=last_reg)

        assert student_entity.last_registered is not None

        updated = await self.student_service.update_is_registered(
            student_entity.account_id, is_registered=False
        )

        assert updated.last_registered is None

    @pytest.mark.asyncio
    async def test_update_is_registered_student_not_found(self):
        with pytest.raises(StudentNotFoundException):
            await self.student_service.update_is_registered(99999, is_registered=True)

    @pytest.mark.asyncio
    async def test_get_student_me_dto_no_entity(self):
        """Account with student role but no Student entity returns partial DTO with nulls."""
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        dto = await self.student_service.get_student_me_dto(account.id)

        assert isinstance(dto, StudentDto)
        assert dto.phone_number is None
        assert dto.contact_preference is None
        assert dto.last_registered is None
        assert dto.residence is None

    @pytest.mark.asyncio
    async def test_get_student_me_dto_with_entity(self):
        """Account with Student entity returns full DTO."""
        student_entity = await self.student_utils.create_one()

        dto = await self.student_service.get_student_me_dto(student_entity.account_id)

        self.student_utils.assert_matches(dto, student_entity)

    @pytest.mark.asyncio
    async def test_update_student_self_upserts_when_no_entity(self):
        """update_student_self creates a Student entity if one does not exist yet."""
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        data = SelfUpdateStudentDto(
            phone_number="9195550001",
            contact_preference=ContactPreference.TEXT,
        )

        updated = await self.student_service.update_student_self(account.id, data)

        self.student_utils.assert_matches(updated, data)

    @pytest.mark.asyncio
    async def test_assert_student_entity_exists_raises_when_no_entity(self):
        """assert_student_entity_exists raises StudentInfoNotProvidedException when no entity."""
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        with pytest.raises(StudentInfoNotProvidedException):
            await self.student_service.assert_student_entity_exists(account.id)

    @pytest.mark.asyncio
    async def test_assert_student_entity_exists_passes_when_entity_present(self):
        """assert_student_entity_exists does not raise when Student entity exists."""
        student_entity = await self.student_utils.create_one()

        # Should not raise
        await self.student_service.assert_student_entity_exists(student_entity.account_id)

    @pytest.mark.asyncio
    async def test_assert_student_entity_exists_raises_when_null_info(
        self, test_session: AsyncSession
    ):
        """assert_student_entity_exists raises when entity exists but phone/preference are null."""
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        entity = StudentEntity(account_id=account.id)
        test_session.add(entity)
        await test_session.commit()

        with pytest.raises(StudentInfoNotProvidedException):
            await self.student_service.assert_student_entity_exists(account.id)

    @pytest.mark.asyncio
    async def test_ensure_student_entity_exists_creates_entity(self, test_session: AsyncSession):
        """ensure_student_entity_exists creates a StudentEntity with null phone/preference."""
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        await self.student_service.ensure_student_entity_exists(account.id)

        result = await test_session.execute(
            select(StudentEntity).where(StudentEntity.account_id == account.id)
        )
        entity = result.scalar_one_or_none()
        assert entity is not None
        assert entity.phone_number is None
        assert entity.contact_preference is None

    @pytest.mark.asyncio
    async def test_ensure_student_entity_exists_noop_when_entity_exists(self):
        """ensure_student_entity_exists does not overwrite an existing entity."""
        student_entity = await self.student_utils.create_one()

        await self.student_service.ensure_student_entity_exists(student_entity.account_id)

        fetched = await self.student_service.get_student_by_id(student_entity.account_id)
        self.student_utils.assert_matches(fetched, student_entity)


class TestStudentResidenceService:
    """Tests for residence-related student service methods."""

    student_utils: StudentTestUtils
    account_utils: AccountTestUtils
    student_service: StudentService
    location_utils: LocationTestUtils
    location_service: LocationService
    gmaps_utils: GmapsMockUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        student_utils: StudentTestUtils,
        account_utils: AccountTestUtils,
        student_service: StudentService,
        location_utils: LocationTestUtils,
        location_service: LocationService,
        gmaps_utils: GmapsMockUtils,
    ):
        self.student_utils = student_utils
        self.account_utils = account_utils
        self.student_service = student_service
        self.location_utils = location_utils
        self.location_service = location_service
        self.gmaps_utils = gmaps_utils

    @pytest.mark.asyncio
    async def test_create_student_with_residence(self):
        """Test admin creating a student with a residence."""

        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        location = await self.location_utils.create_one()

        # Create data with residence
        data = await self.student_utils.next_update_dto(
            last_registered=datetime.now(UTC),
            residence_place_id=location.google_place_id,
        )

        student = await self.student_service.create_student(data, account_id=account.id)

        self.student_utils.assert_residence(student, location)

    @pytest.mark.asyncio
    async def test_admin_update_student_with_residence(self):
        """Test admin updating a student's residence (should bypass academic year restriction)."""

        # Create student with a residence chosen this academic year
        student_entity = await self.student_utils.create_one(last_registered=datetime.now(UTC))
        location1 = await self.location_utils.create_one()

        # Set initial residence
        update_data1 = await self.student_utils.next_update_dto(
            residence_place_id=location1.google_place_id,
            last_registered=student_entity.last_registered,
        )
        updated1 = await self.student_service.update_student(
            student_entity.account_id, update_data1
        )
        self.student_utils.assert_residence(updated1, location1)

        # Admin should be able to change residence in same academic year
        location2 = await self.location_utils.create_one()
        update_data2 = await self.student_utils.next_update_dto(
            residence_place_id=location2.google_place_id,
            last_registered=student_entity.last_registered,
        )
        updated2 = await self.student_service.update_student(
            student_entity.account_id, update_data2
        )
        self.student_utils.assert_residence(updated2, location2)

    @pytest.mark.asyncio
    async def test_update_residence_without_being_registered(self):
        """Test that student CAN choose residence without being registered."""
        # Create student without last_registered
        student_entity = await self.student_utils.create_one(last_registered=None)
        location = await self.location_utils.create_one()

        # Should succeed - students can set residence without Party Smart
        result = await self.student_service.update_residence(
            student_entity.account_id, location.google_place_id
        )
        self.location_utils.assert_matches(result, location)

    @pytest.mark.asyncio
    async def test_update_residence_same_academic_year_fails(self):
        """Test that student cannot change residence in the same academic year."""
        # Create student with residence chosen this academic year
        student_entity = await self.student_utils.create_one(last_registered=datetime.now(UTC))
        location1 = await self.location_utils.create_one()

        # Set initial residence
        await self.student_service.update_residence(
            student_entity.account_id, location1.google_place_id
        )

        # Try to change residence in same academic year - should fail
        location2 = await self.location_utils.create_one()
        with pytest.raises(ResidenceAlreadyChosenException):
            await self.student_service.update_residence(
                student_entity.account_id, location2.google_place_id
            )

    @pytest.mark.asyncio
    async def test_update_residence_new_academic_year_succeeds(self):
        """Test that student can change residence in a new academic year."""

        # Create student with residence chosen last academic year
        # The key is: residence_chosen_date is from last year, but last_registered is current year
        # (meaning they completed Party Smart again this year)
        now = datetime.now(UTC)
        old_residence_date = self.student_utils.get_old_academic_year_date()

        student_entity = await self.student_utils.create_one(last_registered=now)
        location1 = await self.location_utils.create_one()

        # Manually set old residence (from last academic year)
        student_entity.residence_id = location1.id
        student_entity.residence_chosen_date = old_residence_date
        self.student_utils.session.add(student_entity)
        await self.student_utils.session.commit()

        # Should be able to change residence in new academic year
        location2 = await self.location_utils.create_one()
        updated = await self.student_service.update_residence(
            student_entity.account_id, location2.google_place_id
        )

        self.location_utils.assert_matches(updated, location2)

    @pytest.mark.asyncio
    async def test_update_residence_creates_new_location(self):
        """Test that update_residence creates location if it doesn't exist."""
        student_entity = await self.student_utils.create_one(last_registered=datetime.now(UTC))

        # Mock google maps response for a new place
        new_place_id = "ChIJNewPlace123"
        location_data = await self.location_utils.next_data(google_place_id=new_place_id)
        self.gmaps_utils.mock_place_details(**location_data.model_dump())

        # Update residence with new place_id (should create location)
        updated_location = await self.student_service.update_residence(
            student_entity.account_id, new_place_id
        )

        self.location_utils.assert_matches(updated_location, location_data)

    @pytest.mark.asyncio
    async def test_get_student_with_residence(self):
        """Test getting student includes residence information."""
        student_entity = await self.student_utils.create_one(last_registered=datetime.now(UTC))
        location = await self.location_utils.create_one()

        # Set residence
        student_entity.residence_id = location.id
        student_entity.residence_chosen_date = datetime.now(UTC)
        self.student_utils.session.add(student_entity)
        await self.student_utils.session.commit()

        # Get student
        student_dto = await self.student_service.get_student_by_id(student_entity.account_id)

        self.student_utils.assert_residence(student_dto, location)


class TestStudentAutocompleteService:
    """Tests for StudentService.autocomplete_students()."""

    student_utils: StudentTestUtils
    student_service: StudentService

    @pytest.fixture(autouse=True)
    def _setup(self, student_utils: StudentTestUtils, student_service: StudentService):
        self.student_utils = student_utils
        self.student_service = student_service

    @pytest.mark.asyncio
    async def test_autocomplete_empty_returns_no_results(self):
        """Test autocomplete with no students returns empty list."""
        result = await self.student_service.autocomplete_students("xyz")
        assert result == []

    @pytest.mark.asyncio
    async def test_autocomplete_matches_by_pid(self):
        """Test autocomplete matches on PID."""
        student = await self.student_utils.create_one(pid="123456789")
        student_dto = await student.load_dto(self.student_utils.session)
        result = await self.student_service.autocomplete_students("1234")
        assert len(result) == 1
        self.student_utils.assert_suggestion_match(
            result[0],
            student_dto=student_dto,
            matched_field_name="pid",
            matched_field_value="123456789",
        )

    @pytest.mark.asyncio
    async def test_autocomplete_matches_by_email(self):
        """Test autocomplete matches on email."""
        student = await self.student_utils.create_one(email="unique_test@unc.edu")
        student_dto = await student.load_dto(self.student_utils.session)
        result = await self.student_service.autocomplete_students("unique_test")
        assert len(result) == 1
        self.student_utils.assert_suggestion_match(
            result[0],
            student_dto=student_dto,
            matched_field_name="email",
            matched_field_value="unique_test@unc.edu",
        )

    @pytest.mark.asyncio
    async def test_autocomplete_matches_by_onyen(self):
        """Test autocomplete matches on onyen."""
        account = await self.student_utils.account_utils.create_one(
            role="student", onyen="jdoetest99"
        )
        student = await self.student_utils.create_one(account_id=account.id)
        student_dto = await student.load_dto(self.student_utils.session)
        result = await self.student_service.autocomplete_students("jdoetest99")
        assert len(result) == 1
        self.student_utils.assert_suggestion_match(
            result[0],
            student_dto=student_dto,
            matched_field_name="onyen",
            matched_field_value="jdoetest99",
        )

    @pytest.mark.asyncio
    async def test_autocomplete_matches_by_phone(self):
        """Test autocomplete matches on phone number."""
        student = await self.student_utils.create_one(phone_number="9991234567")
        student_dto = await student.load_dto(self.student_utils.session)
        result = await self.student_service.autocomplete_students("9991234")
        assert len(result) == 1
        self.student_utils.assert_suggestion_match(
            result[0],
            student_dto=student_dto,
            matched_field_name="phone_number",
            matched_field_value="9991234567",
        )

    @pytest.mark.asyncio
    async def test_autocomplete_phone_formatted_query(self):
        """Test autocomplete matches phone number when query contains formatting characters."""
        student = await self.student_utils.create_one(phone_number="6991098313")
        student_dto = await student.load_dto(self.student_utils.session)
        result = await self.student_service.autocomplete_students("(699) 109")
        assert len(result) == 1
        self.student_utils.assert_suggestion_match(
            result[0],
            student_dto=student_dto,
            matched_field_name="phone_number",
            matched_field_value="6991098313",
        )

    @pytest.mark.asyncio
    async def test_autocomplete_is_case_insensitive(self):
        """Test that autocomplete search is case-insensitive."""
        student = await self.student_utils.create_one(email="CaseSensitive@unc.edu")
        result = await self.student_service.autocomplete_students("casesensitive")
        assert any(s.student_id == student.account_id for s in result)

    @pytest.mark.asyncio
    async def test_autocomplete_returns_no_match(self):
        """Test autocomplete returns empty list when nothing matches."""
        await self.student_utils.create_one()
        result = await self.student_service.autocomplete_students("zzznomatch999")
        assert result == []

    @pytest.mark.asyncio
    async def test_autocomplete_limits_results(self):
        """Test autocomplete returns at most 10 results."""
        await self.student_utils.create_many(i=15)
        result = await self.student_service.autocomplete_students("@unc.edu")
        assert len(result) == 10
