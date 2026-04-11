from typing import Self

from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.database import EntityBase
from src.core.utils.bcrypt_utils import hash_password
from src.modules.police.police_model import PoliceAccountDto, PoliceAccountUpdate, PoliceRole


class PoliceEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "police"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[PoliceRole] = mapped_column(
        Enum(PoliceRole, native_enum=False, length=20),
        nullable=False,
        default=PoliceRole.OFFICER,
    )

    @classmethod
    def from_data(cls, data: PoliceAccountUpdate) -> Self:
        """Create a PoliceEntity from a PoliceAccountUpdate model."""
        return cls(
            email=data.email,
            hashed_password=hash_password(data.password),
            role=data.role,
        )

    def to_dto(self) -> PoliceAccountDto:
        """Convert the entity to a PoliceAccountDto."""
        return PoliceAccountDto(id=self.id, email=self.email, role=self.role)
