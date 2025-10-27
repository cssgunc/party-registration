from typing import TYPE_CHECKING
from sqlalchemy import DECIMAL, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import EntityBase

if TYPE_CHECKING:
    from ..party.party_entity import PartyEntity


class AddressEntity(EntityBase):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    latitude: Mapped[float] = mapped_column(DECIMAL(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(DECIMAL(11, 8), nullable=False)

    # Relationships
    parties: Mapped[list["PartyEntity"]] = relationship("PartyEntity", back_populates="address")

    __table_args__ = (Index("idx_lat_lng_addr", "latitude", "longitude"),)
