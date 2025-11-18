from datetime import datetime
from typing import TYPE_CHECKING, Self

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import EntityBase

from .complaint_model import Complaint

if TYPE_CHECKING:
    from ..location.location_entity import LocationEntity


class ComplaintEntity(EntityBase):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    complaint_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False, default="")

    # Relationships
    location: Mapped["LocationEntity"] = relationship(
        "LocationEntity", passive_deletes=True
    )

    @classmethod
    def from_model(cls, data: Complaint) -> Self:
        return cls(
            location_id=data.location_id,
            complaint_datetime=data.complaint_datetime,
            description=data.description,
        )

    def to_model(self) -> Complaint:
        """Convert entity to model."""
        return Complaint(
            id=self.id,
            location_id=self.location_id,
            complaint_datetime=self.complaint_datetime,
            description=self.description,
        )
