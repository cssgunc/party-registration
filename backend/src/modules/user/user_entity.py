from typing import Self

from src.core.database import EntityBase
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .user_model import User, UserData


class UserEntity(EntityBase):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)

    @classmethod
    def from_model(cls, data: UserData) -> Self:
        return cls(email=data.email)

    def to_model(self) -> User:
        return User(id=self.id, email=self.email)
