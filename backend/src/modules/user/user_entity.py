from core.database import EntityBase
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class UserEntity(EntityBase):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
