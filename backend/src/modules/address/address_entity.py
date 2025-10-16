from sqlalchemy import DECIMAL, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import EntityBase


class AddressEntity(EntityBase):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    latitude: Mapped[float] = mapped_column(DECIMAL(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(DECIMAL(11, 8), nullable=False)

    __table_args__ = (Index("idx_lat_lng", "latitude", "longitude"),)
