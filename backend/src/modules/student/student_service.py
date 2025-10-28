from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import ConflictException, NotFoundException
from src.modules.account.account_entity import AccountEntity

from .student_entity import StudentEntity
from .student_model import StudentData, StudentDTO


class StudentNotFoundException(NotFoundException):
    def __init__(self, account_id: int):
        super().__init__(f"Student with ID {account_id} not found")


class StudentConflictException(ConflictException):
    def __init__(self, phone_number: str):
        super().__init__(f"Student with phone number {phone_number} already exists")


class StudentService:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

    async def _get_student_entity_by_account_id(self, account_id: int) -> StudentEntity:
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.account_id == account_id)
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
            raise StudentNotFoundException(account_id)
        return account

    def _to_dto(self, student: StudentEntity, account: AccountEntity) -> StudentDTO:
        return StudentDTO(
            id=student.account_id,
            pid=str(student.account_id),
            email=account.email,
            first_name=student.first_name,
            last_name=student.last_name,
            phone_number=student.phone_number,
            last_registered=student.last_registered,
        )

    async def get_students(self) -> list[StudentDTO]:
        result = await self.session.execute(
            select(StudentEntity, AccountEntity).join(
                AccountEntity, StudentEntity.account_id == AccountEntity.id
            )
        )
        rows = result.all()
        return [self._to_dto(s, a) for (s, a) in rows]

    async def get_student_by_id(self, account_id: int) -> StudentDTO:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        account = await self._get_account_entity_by_id(account_id)
        return self._to_dto(student_entity, account)

    async def create_student(self, data: StudentData, account_id: int) -> StudentDTO:
        if await self._get_student_entity_by_phone(data.phone_number):
            raise StudentConflictException(data.phone_number)

        new_student = StudentEntity.from_model(data, account_id)
        try:
            self.session.add(new_student)
            await self.session.commit()
        except IntegrityError:
            raise StudentConflictException(data.phone_number)

        await self.session.refresh(new_student)
        account = await self._get_account_entity_by_id(account_id)
        return self._to_dto(new_student, account)

    async def update_student(self, account_id: int, data: StudentData) -> StudentDTO:
        student_entity = await self._get_student_entity_by_account_id(account_id)

        if data.phone_number != student_entity.phone_number:
            if await self._get_student_entity_by_phone(data.phone_number):
                raise StudentConflictException(data.phone_number)

        for key, value in data.model_dump().items():
            if hasattr(student_entity, key):
                setattr(student_entity, key, value)

        try:
            self.session.add(student_entity)
            await self.session.commit()
        except IntegrityError:
            raise StudentConflictException(data.phone_number)
        await self.session.refresh(student_entity)
        account = await self._get_account_entity_by_id(account_id)
        return self._to_dto(student_entity, account)

    async def delete_student(self, account_id: int) -> StudentDTO:
        student_entity = await self._get_student_entity_by_account_id(account_id)
        account = await self._get_account_entity_by_id(account_id)
        student_dto = self._to_dto(student_entity, account)
        await self.session.delete(student_entity)
        await self.session.commit()
        return student_dto
