# type: ignore
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Self

from sqlalchemy import Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship
from src.core.database import EntityBase
from src.core.types import UTCDateTime
from src.modules.incident.incident_model import (
    IncidentData,
    IncidentDto,
    IncidentSeverity,
    NestedIncidentDto,
)

if TYPE_CHECKING:
    from src.modules.location.location_entity import LocationEntity


class IncidentEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    incident_datetime: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    severity: Mapped[IncidentSeverity] = mapped_column(
        Enum(IncidentSeverity, native_enum=False, length=20), nullable=False
    )
    description: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), init=False)

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
            reference_id=data.reference_id,
        )

    def set_from_data(self, data: IncidentData) -> None:
        self.location_id = data.location_id
        self.incident_datetime = data.incident_datetime
        self.severity = data.severity
        self.description = data.description
        self.reference_id = data.reference_id

    def _normalized_datetime(self) -> datetime:
        dt = self.incident_datetime
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)

    def to_dto(self) -> IncidentDto:
        """Convert entity to IncidentDto (location relationship must be loaded)."""
        return IncidentDto(
            id=self.id,
            location=self.location.to_summary_dto(),
            incident_datetime=self._normalized_datetime(),
            description=self.description,
            severity=self.severity,
            reference_id=self.reference_id,
        )

    def to_nested_dto(self) -> NestedIncidentDto:
        """Convert entity to NestedIncidentDto (no location field, for use inside LocationDto)."""
        return NestedIncidentDto(
            id=self.id,
            incident_datetime=self._normalized_datetime(),
            description=self.description,
            severity=self.severity,
            reference_id=self.reference_id,
        )
