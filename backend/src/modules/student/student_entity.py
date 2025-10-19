from datetime import datetime
from typing import Self

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import EntityBase

from .student_model import ContactPreference, Student, StudentData


class StudentEntity(EntityBase):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    call_or_text_pref: Mapped[ContactPreference] = mapped_column(
        Enum(ContactPreference), nullable=False
    )
    last_registered: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phone_number: Mapped[str] = mapped_column(String, nullable=False)

    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)

    @classmethod
    def from_model(cls, data: "StudentData", account_id: int) -> Self:
        return cls(
            first_name=data.first_name,
            last_name=data.last_name,
            call_or_text_pref=data.call_or_text_pref,
            last_registered=data.last_registered,
            phone_number=data.phone_number,
            account_id=account_id,
        )

    def to_model(self) -> "Student":
        return Student(
            id=self.id,
            account_id=self.account_id,
            first_name=self.first_name,
            last_name=self.last_name,
            call_or_text_pref=self.call_or_text_pref,
            last_registered=self.last_registered,
            phone_number=self.phone_number,
        )
