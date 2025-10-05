import enum

from src.core.database import EntityBase
from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class CallOrTextPref(enum.Enum):
    call = "call"
    text = "text"


class StudentEntity(EntityBase):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    call_or_text_pref: Mapped[CallOrTextPref] = mapped_column(
        Enum(CallOrTextPref), nullable=False
    )
    last_registered: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    phone_number: Mapped[str] = mapped_column(String, nullable=False)

    # Relationship to account would go here
