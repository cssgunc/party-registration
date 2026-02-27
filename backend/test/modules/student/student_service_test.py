from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountRole
from src.modules.location.location_service import LocationService
from src.modules.student.student_model import ContactPreference, StudentDto
from src.modules.student.student_service import (
    AccountNotFoundException,
    InvalidAccountRoleException,
    StudentAlreadyExistsException,
    StudentConflictException,
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
        data = await self.student_utils.next_data_with_names()

        student = await self.student_service.create_student(data, account_id=account.id)

        assert isinstance(student, StudentDto)
        assert student.id == account.id
        self.student_utils.assert_matches(student, data)

    @pytest.mark.asyncio
    async def test_create_student_conflict(self) -> None:
        account1 = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        account2 = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        data = await self.student_utils.next_data_with_names()
        await self.student_service.create_student(data, account_id=account1.id)

        with pytest.raises(StudentConflictException):
            await self.student_service.create_student(data, account_id=account2.id)

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

        update_data = await self.student_utils.next_data_with_names(
            first_name="Jane",
            last_name="Doe",
            contact_preference=ContactPreference.CALL,
        )
        updated = await self.student_service.update_student(student_entity.account_id, update_data)

        assert student_entity.account_id == updated.id
        self.student_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_student_not_found(self):
        update_data = await self.student_utils.next_data_with_names()
        with pytest.raises(StudentNotFoundException):
            await self.student_service.update_student(999, update_data)

    @pytest.mark.asyncio
    async def test_update_student_conflict(self):
        student1 = await self.student_utils.create_one()
        student2 = await self.student_utils.create_one()

        with pytest.raises(StudentConflictException):
            await self.student_service.update_student(
                student2.account_id,
                await self.student_utils.next_data_with_names(phone_number=student1.phone_number),
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
        data = await self.student_utils.next_data_with_names(last_registered=last_reg)

        student = await self.student_service.create_student(data, account_id=account.id)
        assert student.last_registered == last_reg

    @pytest.mark.asyncio
    async def test_update_student_with_datetime_timezone(self):
        student_entity = await self.student_utils.create_one()

        last_reg = datetime(2024, 3, 20, 14, 45, 30, tzinfo=UTC)
        update_data = await self.student_utils.next_data_with_names(last_registered=last_reg)
        updated = await self.student_service.update_student(student_entity.account_id, update_data)
        self.student_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_create_student_with_nonexistent_account(self):
        data = await self.student_utils.next_data_with_names()
        with pytest.raises(AccountNotFoundException):
            await self.student_service.create_student(data, account_id=99999)

    @pytest.mark.asyncio
    async def test_create_student_with_non_student_role(self):
        admin_account = await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        data = await self.student_utils.next_data_with_names()

        with pytest.raises(InvalidAccountRoleException):
            await self.student_service.create_student(data, account_id=admin_account.id)

    @pytest.mark.asyncio
    async def test_create_student_duplicate_account_id(self):
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        data1 = await self.student_utils.next_data_with_names()
        await self.student_service.create_student(data1, account_id=account.id)

        data2 = await self.student_utils.next_data_with_names()
        with pytest.raises(StudentAlreadyExistsException):
            await self.student_service.create_student(data2, account_id=account.id)

    @pytest.mark.asyncio
    async def test_update_student_with_non_student_role(self, test_session: AsyncSession):
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        data = await self.student_utils.next_data_with_names()
        await self.student_service.create_student(data, account_id=account.id)

        account.role = AccountRole.ADMIN
        test_session.add(account)
        await test_session.commit()

        update_data = await self.student_utils.next_data_with_names()
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
        data = await self.student_utils.next_data_with_names(
            last_registered=datetime.now(UTC),
            residence_place_id=location.google_place_id,
        )

        student = await self.student_service.create_student(data, account_id=account.id)

        assert student.residence is not None
        assert student.residence.location.id == location.id
        assert student.residence.residence_chosen_date is not None

    @pytest.mark.asyncio
    async def test_admin_update_student_with_residence(self):
        """Test admin updating a student's residence (should bypass academic year restriction)."""

        # Create student with a residence chosen this academic year
        student_entity = await self.student_utils.create_one(last_registered=datetime.now(UTC))
        location1 = await self.location_utils.create_one()

        # Set initial residence
        update_data1 = await self.student_utils.next_data_with_names(
            residence_place_id=location1.google_place_id,
            last_registered=student_entity.last_registered,
        )
        updated1 = await self.student_service.update_student(
            student_entity.account_id, update_data1
        )
        assert updated1.residence is not None
        assert updated1.residence.location.id == location1.id

        # Admin should be able to change residence in same academic year
        location2 = await self.location_utils.create_one()
        update_data2 = await self.student_utils.next_data_with_names(
            residence_place_id=location2.google_place_id,
            last_registered=student_entity.last_registered,
        )
        updated2 = await self.student_service.update_student(
            student_entity.account_id, update_data2
        )
        assert updated2.residence is not None
        assert updated2.residence.location.id == location2.id

    @pytest.mark.asyncio
    async def test_update_residence_without_being_registered(self):
        """Test that student cannot choose residence without being registered."""
        from src.core.exceptions import BadRequestException

        # Create student without last_registered
        student_entity = await self.student_utils.create_one(last_registered=None)
        location = await self.location_utils.create_one()

        # Should fail because student has not completed Party Smart
        with pytest.raises(BadRequestException) as exc_info:
            await self.student_service.update_residence(
                student_entity.account_id, location.google_place_id
            )
        assert "Must complete Party Smart" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_residence_same_academic_year_fails(self):
        """Test that student cannot change residence in the same academic year."""
        from src.modules.student.student_service import ResidenceAlreadyChosenException

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

        assert updated.id == location2.id

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

        assert updated_location.google_place_id == new_place_id

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

        assert student_dto.residence is not None
        assert student_dto.residence.location.id == location.id
        assert student_dto.residence.residence_chosen_date is not None
