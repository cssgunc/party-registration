from typing import TYPE_CHECKING, Self

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import EntityBase

from .student_model import CallOrTextPref, Student, StudentData

if TYPE_CHECKING:
    from src.modules.account.account_entity import AccountEntity


class StudentEntity(EntityBase):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    call_or_text_pref: Mapped["CallOrTextPref"] = mapped_column(
        Enum("CallOrTextPref"), nullable=False
    )
    last_registered: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    phone_number: Mapped[str] = mapped_column(String, nullable=False)

    # Foreign key relationship to account
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    # Use string reference for the type
    account: Mapped["AccountEntity"] = relationship(
        "AccountEntity", back_populates="students"
    )

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
