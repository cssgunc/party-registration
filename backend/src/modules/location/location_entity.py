from datetime import datetime
from typing import Self

from sqlalchemy import DECIMAL, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import EntityBase

from .location_model import Location, LocationData


class LocationEntity(EntityBase):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # OCSL Data
    warning_count: Mapped[int] = mapped_column(Integer, default=0)
    citation_count: Mapped[int] = mapped_column(Integer, default=0)
    hold_expiration: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Google Maps Data
    google_place_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    formatted_address: Mapped[str] = mapped_column(String(500), nullable=False)

    # Geography
    latitude: Mapped[float] = mapped_column(DECIMAL(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(DECIMAL(11, 8), nullable=False)

    # Address Components
    street_number: Mapped[str | None] = mapped_column(String(20))  # e.g. "123"
    street_name: Mapped[str | None] = mapped_column(String(255))  # e.g. "Main St"
    unit: Mapped[str | None] = mapped_column(String(50))  # e.g. "Apt 4B"
    city: Mapped[str | None] = mapped_column(String(100))  # e.g. "Chapel Hill"
    county: Mapped[str | None] = mapped_column(String(100))  # e.g. "Orange County"
    state: Mapped[str | None] = mapped_column(String(50))  # e.g. "NC"
    country: Mapped[str | None] = mapped_column(String(2))  # e.g. "US"
    zip_code: Mapped[str | None] = mapped_column(String(10))  # e.g. "27514"

    __table_args__ = (Index("idx_lat_lng", "latitude", "longitude"),)

    def to_model(self) -> Location:
        return Location(
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
            warning_count=self.warning_count,
            citation_count=self.citation_count,
            hold_expiration=self.hold_expiration,
        )

    @classmethod
    def from_model(cls, data: LocationData) -> Self:
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
            warning_count=data.warning_count,
            citation_count=data.citation_count,
            hold_expiration=data.hold_expiration,
        )
