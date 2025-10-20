from typing import Self
from datetime import datetime

from src.core.database import EntityBase
from sqlalchemy import DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .party_model import Party, PartyData


class PartyEntity(EntityBase):
    __tablename__ = "parties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    party_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    address_id: Mapped[int] = mapped_column(Integer, ForeignKey('addresses.id'), nullable=False)
    contact_one_id: Mapped[int] = mapped_column(Integer, ForeignKey('students.id'), nullable=False)
    contact_two_id: Mapped[int] = mapped_column(Integer, ForeignKey('students.id'), nullable=False)

    # Relationships
    address: Mapped["AddressEntity"] = relationship("AddressEntity")
    contact_one: Mapped["StudentEntity"] = relationship("StudentEntity", foreign_keys=[contact_one_id])
    contact_two: Mapped["StudentEntity"] = relationship("StudentEntity", foreign_keys=[contact_two_id])

    @classmethod
    def from_model(cls, data: PartyData) -> Self:
        return cls(
            party_datetime=data.party_datetime,
            address_id=data.address_id,
            contact_one_id=data.contact_one_id,
            contact_two_id=data.contact_two_id
        )

    def to_model(self) -> Party:
        return Party(
            id=self.id,
            party_datetime=self.party_datetime,
            address_id=self.address_id,
            contact_one_id=self.contact_one_id,
            contact_two_id=self.contact_two_id
        )
