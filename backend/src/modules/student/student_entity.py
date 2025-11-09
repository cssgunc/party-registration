from datetime import datetime
from typing import TYPE_CHECKING, Self

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import EntityBase

from .student_model import ContactPreference, Student, StudentData, StudentDTO

if TYPE_CHECKING:
    from src.modules.account.account_entity import AccountEntity


class StudentEntity(EntityBase):
    __tablename__ = "students"

    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), primary_key=True, index=True
    )
    call_or_text_pref: Mapped[ContactPreference] = mapped_column(
        Enum(ContactPreference), nullable=False
    )
    last_registered: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    phone_number: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    account: Mapped["AccountEntity"] = relationship("AccountEntity")

    @classmethod
    def from_model(cls, data: "StudentData", account_id: int) -> Self:
        return cls(
            call_or_text_pref=data.call_or_text_pref,
            last_registered=data.last_registered,
            phone_number=data.phone_number,
            account_id=account_id,
        )

    def to_model(self) -> "Student":
        return Student(
            account_id=self.account_id,
            call_or_text_pref=self.call_or_text_pref,
            last_registered=self.last_registered,
            phone_number=self.phone_number,
        )

    def to_dto(self) -> "StudentDTO":
        """Convert entity to DTO using the account relationship."""
        return StudentDTO(
            id=self.account_id,
            pid=self.account.pid or str(self.account_id),
            email=self.account.email,
            first_name=self.account.first_name or "",
            last_name=self.account.last_name or "",
            phone_number=self.phone_number,
            last_registered=self.last_registered,
        )
