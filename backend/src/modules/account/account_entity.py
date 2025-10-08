from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import EntityBase

if TYPE_CHECKING:
    from src.modules.student.student_entity import StudentEntity


class AccountEntity(EntityBase):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)

    students: Mapped[list["StudentEntity"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
