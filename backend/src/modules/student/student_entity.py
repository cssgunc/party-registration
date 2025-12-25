from datetime import datetime, timezone
from typing import TYPE_CHECKING, Self

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship, selectinload
from src.core.database import EntityBase

from .student_model import ContactPreference, DbStudent, Student, StudentData

if TYPE_CHECKING:
    from src.modules.account.account_entity import AccountEntity


class StudentEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "students"

    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), primary_key=True, autoincrement=False, index=True
    )
    contact_preference: Mapped[ContactPreference] = mapped_column(
        Enum(ContactPreference), nullable=False
    )
    last_registered: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    phone_number: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    account: Mapped["AccountEntity"] = relationship("AccountEntity", init=False)

    @classmethod
    def from_model(cls, data: "StudentData", account_id: int) -> Self:
        return cls(
            contact_preference=data.contact_preference,
            last_registered=data.last_registered,
            phone_number=data.phone_number,
            account_id=account_id,
        )

    def to_model(self) -> "DbStudent":
        # Ensure last_registered is timezone-aware if present
        last_reg = self.last_registered
        if last_reg is not None and last_reg.tzinfo is None:
            last_reg = last_reg.replace(tzinfo=timezone.utc)

        return DbStudent(
            account_id=self.account_id,
            contact_preference=self.contact_preference,
            last_registered=last_reg,
            phone_number=self.phone_number,
        )

    def to_dto(self) -> "Student":
        """Convert entity to DTO using the account relationship."""
        # Ensure last_registered is timezone-aware if present
        last_reg = self.last_registered
        if last_reg is not None and last_reg.tzinfo is None:
            last_reg = last_reg.replace(tzinfo=timezone.utc)

        return Student(
            id=self.account_id,
            pid=self.account.pid,
            email=self.account.email,
            first_name=self.account.first_name,
            last_name=self.account.last_name,
            phone_number=self.phone_number,
            contact_preference=self.contact_preference,
            last_registered=last_reg,
        )

    async def load_dto(self, session: AsyncSession) -> Student:
        """
        Load student with account relationship from database and convert to DTO.
        Should be used to get the DTO only if the account relationship hasn't been loaded yet.
        """
        result = await session.execute(
            select(self.__class__)
            .where(self.__class__.account_id == self.account_id)
            .options(selectinload(self.__class__.account))
        )
        student_entity = result.scalar_one()
        return student_entity.to_dto()
