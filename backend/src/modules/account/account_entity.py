import enum

from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import EntityBase


class AccountRole(enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"
    POLICE = "police"


class AccountEntity(EntityBase):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[AccountRole] = mapped_column(Enum(AccountRole), nullable=False)
