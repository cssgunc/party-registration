from core.database import EntityBase
from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column


class AddressEntity(EntityBase):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # TODO: add more fields here
