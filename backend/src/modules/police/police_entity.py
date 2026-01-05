from typing import Self

from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.bcrypt_utils import hash_password
from src.core.database import EntityBase
from src.modules.police.police_model import PoliceAccount, PoliceAccountUpdate


class PoliceEntity(MappedAsDataclass, EntityBase):
    """
    Singleton entity for police credentials.
    Only one row should exist in this table.
    """

    __tablename__ = "police"
    __table_args__ = (CheckConstraint("id = 1", name="police_singleton_constraint"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)

    @classmethod
    def from_model(cls, data: PoliceAccountUpdate) -> Self:
        """Create a PoliceEntity from a PoliceAccountUpdate model."""
        hashed_password = hash_password(data.password)
        return cls(email=data.email, hashed_password=hashed_password)

    def to_model(self) -> PoliceAccount:
        """Convert the entity to a PoliceAccount model."""
        return PoliceAccount(email=self.email)
