from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.database import get_session
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from src.modules.account.account_entity import AccountEntity, AccountRole

from .student_entity import StudentEntity
from .student_model import Student, StudentData, StudentDataWithNames


class StudentNotFoundException(NotFoundException):
    def __init__(self, account_id: int):
        super().__init__(f"Student with ID {account_id} not found")


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


class StudentByPhoneNotFoundException(NotFoundException):
    def __init__(self, phone_number: str):
        super().__init__(f"Student with phone number {phone_number} not found")


class StudentService:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

    async def _get_student_entity_by_account_id(self, account_id: int) -> StudentEntity:
        result = await self.session.execute(
            select(StudentEntity)
            .where(StudentEntity.account_id == account_id)
            .options(selectinload(StudentEntity.account))
        )
        student_entity = result.scalar_one_or_none()
        if student_entity is None:
            raise StudentNotFoundException(account_id)
        return student_entity

    async def _get_student_entity_by_phone(
        self, phone_number: str
    ) -> StudentEntity:
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.phone_number == phone_number)
        )
        student = result.scalar_one_or_none()
        if student is None:
            raise StudentByPhoneNotFoundException(phone_number)
        return student

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

    async def get_students(
        self, skip: int = 0, limit: int | None = None
    ) -> list[Student]:
        query = (
            select(StudentEntity)
            .options(selectinload(StudentEntity.account))
            .offset(skip)
        )
        if limit is not None:
            query = query.limit(limit)
        result = await self.session.execute(query)
        students = result.scalars().all()
        return [student.to_model() for student in students]

    async def get_student_count(self) -> int:
        count_query = select(func.count(StudentEntity.account_id))
        count_result = await self.session.execute(count_query)
        return count_result.scalar_one()

    async def get_student_by_id(self, account_id: int) -> Student:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        return student_entity.to_model()

    async def create_student(
        self, data: StudentDataWithNames, account_id: int
    ) -> Student:
        account = await self._validate_account_for_student(account_id)

        try:
            await self._get_student_entity_by_phone(data.phone_number)
            # If we get here, student exists
            raise StudentConflictException(data.phone_number)
        except StudentByPhoneNotFoundException:
            # Student doesn't exist, proceed with creation
            pass

        account.first_name = data.first_name
        account.last_name = data.last_name
        self.session.add(account)

        student_data = StudentData(
            first_name=data.first_name,
            last_name=data.last_name,
            contact_preference=data.contact_preference,
            last_registered=data.last_registered,
            phone_number=data.phone_number,
        )
        new_student = StudentEntity.from_model(student_data, account_id)
        try:
            self.session.add(new_student)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise StudentConflictException(data.phone_number)

        await self.session.refresh(new_student, ["account"])
        return new_student.to_model()

    async def update_student(
        self, account_id: int, data: StudentData | StudentDataWithNames
    ) -> Student:
        student_entity = await self._get_student_entity_by_account_id(account_id)

        account = student_entity.account
        if account is None:
            raise AccountNotFoundException(account_id)

        if account.role != AccountRole.STUDENT:
            raise InvalidAccountRoleException(account_id, account.role)

        if data.phone_number != student_entity.phone_number:
            try:
                await self._get_student_entity_by_phone(data.phone_number)
                # If we get here, student with this phone exists
                raise StudentConflictException(data.phone_number)
            except StudentByPhoneNotFoundException:
                # Phone is available, proceed
                pass

        # Only update account names if data includes them (StudentDataWithNames)
        if isinstance(data, StudentDataWithNames):
            account.first_name = data.first_name
            account.last_name = data.last_name
            self.session.add(account)
            student_entity.first_name = data.first_name
            student_entity.last_name = data.last_name

        student_entity.contact_preference = data.contact_preference
        student_entity.last_registered = data.last_registered
        student_entity.phone_number = data.phone_number

        try:
            self.session.add(student_entity)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise StudentConflictException(data.phone_number)

        await self.session.refresh(student_entity, ["account"])
        return student_entity.to_model()

    async def delete_student(self, account_id: int) -> Student:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        student_model = student_entity.to_model()
        await self.session.delete(student_entity)
        await self.session.commit()
        return student_model
