import enum

from sqlalchemy import CheckConstraint, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import EntityBase


class AccountRole(enum.Enum):
    STUDENT = "student"
    STAFF = "staff"
    ADMIN = "admin"


class AccountEntity(EntityBase):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    pid: Mapped[str | None] = mapped_column(
        String(9),
        CheckConstraint("length(pid) = 9", name="check_pid_length"),
        nullable=True,
    )
    role: Mapped[AccountRole] = mapped_column(Enum(AccountRole), nullable=False)
