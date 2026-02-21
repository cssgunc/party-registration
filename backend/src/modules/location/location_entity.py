from datetime import UTC, datetime
from typing import TYPE_CHECKING, Self

from sqlalchemy import DECIMAL, Index, Integer, String
from sqlalchemy.dialects.mssql import DATETIMEOFFSET
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship
from src.core.database import EntityBase

from .location_model import LocationData, LocationDto

if TYPE_CHECKING:
    from src.modules.incident.incident_entity import IncidentEntity


class LocationEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)

    # Google Maps Data (required fields first)
    google_place_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    formatted_address: Mapped[str] = mapped_column(String(500), nullable=False)

    # Geography (required fields)
    latitude: Mapped[float] = mapped_column(DECIMAL(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(DECIMAL(11, 8), nullable=False)

    # OCSL Data (fields with defaults)
    hold_expiration: Mapped[datetime | None] = mapped_column(
        DATETIMEOFFSET, nullable=True, default=None
    )

    # Address Components
    street_number: Mapped[str | None] = mapped_column(String(20), default=None)  # e.g. "123"
    street_name: Mapped[str | None] = mapped_column(String(255), default=None)  # e.g. "Main St"
    unit: Mapped[str | None] = mapped_column(String(50), default=None)  # e.g. "Apt 4B"
    city: Mapped[str | None] = mapped_column(String(100), default=None)  # e.g. "Chapel Hill"
    county: Mapped[str | None] = mapped_column(String(100), default=None)  # e.g. "Orange County"
    state: Mapped[str | None] = mapped_column(String(50), default=None)  # e.g. "NC"
    country: Mapped[str | None] = mapped_column(String(2), default=None)  # e.g. "US"
    zip_code: Mapped[str | None] = mapped_column(String(10), default=None)  # e.g. "27514"

    # Relationships
    incidents: Mapped[list["IncidentEntity"]] = relationship(
        "IncidentEntity",
        back_populates="location",
        cascade="all, delete-orphan",
        lazy="selectin",  # Use selectin loading to avoid N+1 queries
        init=False,
    )

    __table_args__ = (Index("idx_lat_lng", "latitude", "longitude"),)

    def to_dto(self) -> LocationDto:
        # Check if incidents relationship is loaded to avoid lazy loading in tests
        # This prevents issues when LocationEntity is created without loading relationships
        insp = inspect(self)
        incidents_loaded = "incidents" not in insp.unloaded

        hold_exp = self.hold_expiration
        if hold_exp is not None and hold_exp.tzinfo is None:
            hold_exp = hold_exp.replace(tzinfo=UTC)

        return LocationDto(
            id=self.id,
            google_place_id=self.google_place_id,
            formatted_address=self.formatted_address,
            latitude=float(self.latitude),
            longitude=float(self.longitude),
            street_number=self.street_number,
            street_name=self.street_name,
            unit=self.unit,
            city=self.city,
            county=self.county,
            state=self.state,
            country=self.country,
            zip_code=self.zip_code,
            hold_expiration=hold_exp,
            incidents=[incident.to_dto() for incident in self.incidents]
            if incidents_loaded
            else [],
        )

    @classmethod
    def from_data(cls, data: LocationData) -> Self:
        return cls(
            google_place_id=data.google_place_id,
            formatted_address=data.formatted_address,
            latitude=data.latitude,
            longitude=data.longitude,
            street_number=data.street_number,
            street_name=data.street_name,
            unit=data.unit,
            city=data.city,
            county=data.county,
            state=data.state,
            country=data.country,
            zip_code=data.zip_code,
            hold_expiration=data.hold_expiration,
        )
