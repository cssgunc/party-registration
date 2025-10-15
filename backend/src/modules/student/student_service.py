from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import ConflictException, NotFoundException

from .student_entity import StudentEntity
from .student_model import Student, StudentData


class StudentNotFoundException(NotFoundException):
    def __init__(self, student_id: int):
        super().__init__(f"Student with ID {student_id} not found")


class StudentConflictException(ConflictException):
    def __init__(self, phone_number: str):
        super().__init__(f"Student with phone number {phone_number} already exists")


class StudentService:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

    async def _get_student_entity_by_id(self, student_id: int) -> StudentEntity:
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.id == student_id)
        )
        student_entity = result.scalar_one_or_none()
        if student_entity is None:
            raise StudentNotFoundException(student_id)
        return student_entity

    async def _get_student_entity_by_phone(
        self, phone_number: str
    ) -> StudentEntity | None:
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.phone_number == phone_number)
        )
        return result.scalar_one_or_none()

    async def get_students(self) -> list[Student]:
        result = await self.session.execute(select(StudentEntity))
        students = result.scalars().all()
        return [student.to_model() for student in students]

    async def get_student_by_id(self, student_id: int) -> Student:
        student_entity = await self._get_student_entity_by_id(student_id)
        return student_entity.to_model()

    async def create_student(self, data: StudentData, account_id: int) -> Student:
        if await self._get_student_entity_by_phone(data.phone_number):
            raise StudentConflictException(data.phone_number)

        new_student = StudentEntity.from_model(data, account_id)
        try:
            self.session.add(new_student)
            await self.session.commit()
        except IntegrityError:
            raise StudentConflictException(data.phone_number)

        await self.session.refresh(new_student)
        return new_student.to_model()

    async def update_student(self, student_id: int, data: StudentData) -> Student:
        student_entity = await self._get_student_entity_by_id(student_id)

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
        return student_entity.to_model()

    async def delete_student(self, student_id: int) -> Student:
        student_entity = await self._get_student_entity_by_id(student_id)
        student = student_entity.to_model()
        await self.session.delete(student_entity)
        await self.session.commit()
        return student
