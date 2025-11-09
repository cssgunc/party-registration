from fastapi import Depends
from sqlalchemy import select
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
from .student_model import StudentData, StudentDataWithNames, StudentDTO


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
    ) -> StudentEntity | None:
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

    async def get_students(self) -> list[StudentDTO]:
        result = await self.session.execute(
            select(StudentEntity).options(selectinload(StudentEntity.account))
        )
        students = result.scalars().all()
        return [student.to_dto() for student in students]

    async def get_student_by_id(self, account_id: int) -> StudentDTO:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        return student_entity.to_dto()

    async def create_student(
        self, data: StudentDataWithNames, account_id: int
    ) -> StudentDTO:
        account = await self._validate_account_for_student(account_id)

        if await self._get_student_entity_by_phone(data.phone_number):
            raise StudentConflictException(data.phone_number)

        account.first_name = data.first_name
        account.last_name = data.last_name
        self.session.add(account)

        student_data = StudentData(
            call_or_text_pref=data.call_or_text_pref,
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
        return new_student.to_dto()

    async def update_student(
        self, account_id: int, data: StudentDataWithNames
    ) -> StudentDTO:
        student_entity = await self._get_student_entity_by_account_id(account_id)

        account = await self._get_account_entity_by_id(account_id)
        if account.role != AccountRole.STUDENT:
            raise InvalidAccountRoleException(account_id, account.role)

        if data.phone_number != student_entity.phone_number:
            if await self._get_student_entity_by_phone(data.phone_number):
                raise StudentConflictException(data.phone_number)

        account.first_name = data.first_name
        account.last_name = data.last_name
        self.session.add(account)

        student_entity.call_or_text_pref = data.call_or_text_pref
        student_entity.last_registered = data.last_registered
        student_entity.phone_number = data.phone_number

        try:
            self.session.add(student_entity)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise StudentConflictException(data.phone_number)

        await self.session.refresh(student_entity, ["account"])
        return student_entity.to_dto()

    async def delete_student(self, account_id: int) -> StudentDTO:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        student_dto = student_entity.to_dto()
        await self.session.delete(student_entity)
        await self.session.commit()
        return student_dto
