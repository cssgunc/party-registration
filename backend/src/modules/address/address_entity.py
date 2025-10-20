from src.core.database import EntityBase
from sqlalchemy import Integer, Float
from sqlalchemy.orm import Mapped, mapped_column


class AddressEntity(EntityBase):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    # TODO: add more fields here
