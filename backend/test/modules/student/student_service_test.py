from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountRole
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

        for s, f in zip(students, fetched):
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
        last_reg = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        data = await self.student_utils.next_data_with_names(last_registered=last_reg)

        student = await self.student_service.create_student(data, account_id=account.id)
        assert student.last_registered == last_reg

    @pytest.mark.asyncio
    async def test_update_student_with_datetime_timezone(self):
        student_entity = await self.student_utils.create_one()

        last_reg = datetime(2024, 3, 20, 14, 45, 30, tzinfo=timezone.utc)
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

        before_update = datetime.now(timezone.utc)
        updated = await self.student_service.update_is_registered(
            student_entity.account_id, is_registered=True
        )
        after_update = datetime.now(timezone.utc)

        assert updated.last_registered is not None
        assert before_update <= updated.last_registered <= after_update

    @pytest.mark.asyncio
    async def test_update_is_registered_false(self):
        last_reg = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
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
