from datetime import UTC, datetime
from typing import TYPE_CHECKING, Self

from sqlalchemy import Enum, ForeignKey, Integer, String, select
from sqlalchemy.dialects.mssql import DATETIMEOFFSET
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship, selectinload
from src.core.database import EntityBase
from src.modules.student.student_model import ContactPreference

from ..student.student_entity import StudentEntity
from .party_model import ContactDto, PartyData, PartyDto, PartyStatus

if TYPE_CHECKING:
    from ..location.location_entity import LocationEntity
    from ..student.student_entity import StudentEntity


class PartyEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "parties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    party_datetime: Mapped[datetime] = mapped_column(DATETIMEOFFSET, nullable=False)
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    contact_one_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.account_id", ondelete="CASCADE"), nullable=False
    )

    contact_two_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_two_first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_two_last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_two_phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_two_contact_preference: Mapped[ContactPreference] = mapped_column(
        Enum(ContactPreference, native_enum=False, length=20), nullable=False
    )
    status: Mapped[PartyStatus] = mapped_column(
        Enum(PartyStatus, native_enum=False, length=20),
        nullable=False,
        default=PartyStatus.CONFIRMED,
    )

    # Relationships
    location: Mapped["LocationEntity"] = relationship(
        "LocationEntity", passive_deletes=True, init=False
    )
    contact_one: Mapped["StudentEntity"] = relationship(
        "StudentEntity", foreign_keys=[contact_one_id], passive_deletes=True, init=False
    )

    @classmethod
    def from_data(cls, data: PartyData) -> Self:
        return cls(
            party_datetime=data.party_datetime,
            location_id=data.location_id,
            contact_one_id=data.contact_one_id,
            contact_two_email=data.contact_two.email,
            contact_two_first_name=data.contact_two.first_name,
            contact_two_last_name=data.contact_two.last_name,
            contact_two_phone_number=data.contact_two.phone_number,
            contact_two_contact_preference=data.contact_two.contact_preference,
        )

    def to_dto(self) -> PartyDto:
        """Convert entity to model. Requires relationships to be eagerly loaded."""
        # Ensure party_datetime is timezone-aware
        party_dt = self.party_datetime
        if party_dt.tzinfo is None:
            party_dt = party_dt.replace(tzinfo=UTC)

        return PartyDto(
            id=self.id,
            party_datetime=party_dt,
            location=self.location.to_dto(),
            contact_one=self.contact_one.to_dto(),
            contact_two=ContactDto(
                email=self.contact_two_email,
                first_name=self.contact_two_first_name,
                last_name=self.contact_two_last_name,
                phone_number=self.contact_two_phone_number,
                contact_preference=self.contact_two_contact_preference,
            ),
            status=self.status,
        )

    async def load_dto(self, session: AsyncSession) -> PartyDto:
        """
        Load party with relationships from database and convert to model.
        Should be used to get the model only if relationships haven't been loaded yet.
        """

        result = await session.execute(
            select(self.__class__)
            .where(self.__class__.id == self.id)
            .options(
                selectinload(self.__class__.location),
                selectinload(self.__class__.contact_one).selectinload(StudentEntity.account),
            )
        )
        party_entity = result.scalar_one()
        return party_entity.to_dto()

    def set_contact_two(self, contact: ContactDto) -> None:
        self.contact_two_email = contact.email
        self.contact_two_first_name = contact.first_name
        self.contact_two_last_name = contact.last_name
        self.contact_two_phone_number = contact.phone_number
        self.contact_two_contact_preference = contact.contact_preference
