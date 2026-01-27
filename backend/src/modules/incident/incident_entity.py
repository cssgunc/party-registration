from datetime import UTC
from typing import TYPE_CHECKING, Self

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship
from src.core.database import EntityBase
from src.modules.incident.incident_model import IncidentData, IncidentDto, IncidentSeverity

if TYPE_CHECKING:
    from src.modules.location.location_entity import LocationEntity


class IncidentEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    incident_datetime: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    severity: Mapped[IncidentSeverity] = mapped_column(Enum(IncidentSeverity), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False, default="")

    # Relationships
    location: Mapped["LocationEntity"] = relationship(
        "LocationEntity", passive_deletes=True, init=False
    )

    @classmethod
    def from_data(cls, data: IncidentData) -> Self:
        return cls(
            location_id=data.location_id,
            incident_datetime=data.incident_datetime,
            severity=data.severity,
            description=data.description,
        )

    def to_dto(self) -> IncidentDto:
        """Convert entity to model."""
        # Ensure incident_datetime is timezone-aware
        incident_dt = self.incident_datetime
        if incident_dt.tzinfo is None:
            incident_dt = incident_dt.replace(tzinfo=UTC)

        return IncidentDto(
            id=self.id,
            location_id=self.location_id,
            incident_datetime=incident_dt,
            description=self.description,
            severity=self.severity,
        )
