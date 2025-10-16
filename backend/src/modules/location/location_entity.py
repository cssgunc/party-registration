from datetime import datetime

from sqlalchemy import DECIMAL, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import EntityBase


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
