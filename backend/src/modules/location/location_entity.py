from sqlalchemy import Column, Integer, String
from src.core.database import EntityBase


class LocationEntity(EntityBase):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
