from src.core.database import EntityBase
from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column


class PartyEntity(EntityBase):
    __tablename__ = "parties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Relationship to address would go here
