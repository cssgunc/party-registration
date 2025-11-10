from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import EntityBase


class PoliceEntity(EntityBase):
    """
    Singleton entity for police credentials.
    Only one row should exist in this table.
    """

    __tablename__ = "police"
    __table_args__ = (CheckConstraint("id = 1", name="police_singleton_constraint"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
