from datetime import datetime
from typing import TYPE_CHECKING, Self

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import EntityBase
from src.modules.student.student_model import ContactPreference

from .party_model import Party, PartyData

if TYPE_CHECKING:
    from ..location.location_entity import LocationEntity
    from ..student.student_entity import StudentEntity


class PartyEntity(EntityBase):
    __tablename__ = "parties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    party_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id"), nullable=False
    )
    contact_one_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.account_id"), nullable=False
    )

    # Contact two is stored directly (not as a foreign key to students)
    contact_two_email: Mapped[str] = mapped_column(String, nullable=False)
    contact_two_first_name: Mapped[str] = mapped_column(String, nullable=False)
    contact_two_last_name: Mapped[str] = mapped_column(String, nullable=False)
    contact_two_phone_number: Mapped[str] = mapped_column(String, nullable=False)
    contact_two_contact_preference: Mapped[ContactPreference] = mapped_column(
        Enum(ContactPreference), nullable=False
    )

    # Relationships
    location: Mapped["LocationEntity"] = relationship("LocationEntity")
    contact_one: Mapped["StudentEntity"] = relationship(
        "StudentEntity", foreign_keys=[contact_one_id]
    )

    @classmethod
    def from_model(cls, data: PartyData) -> Self:
        return cls(
            party_datetime=data.party_datetime,
            location_id=data.location_id,
            contact_one_id=data.contact_one_id,
            contact_two_email=data.contact_two_email,
            contact_two_first_name=data.contact_two_first_name,
            contact_two_last_name=data.contact_two_last_name,
            contact_two_phone_number=data.contact_two_phone_number,
            contact_two_contact_preference=data.contact_two_contact_preference,
        )

    def to_model(self) -> Party:
        return Party(
            id=self.id,
            party_datetime=self.party_datetime,
            location_id=self.location_id,
            contact_one_id=self.contact_one_id,
            contact_two_email=self.contact_two_email,
            contact_two_first_name=self.contact_two_first_name,
            contact_two_last_name=self.contact_two_last_name,
            contact_two_phone_number=self.contact_two_phone_number,
            contact_two_contact_preference=self.contact_two_contact_preference,
        )
