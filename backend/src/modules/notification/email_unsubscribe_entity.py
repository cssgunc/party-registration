from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.database import EntityBase
from src.core.types import UTCDateTime


class EmailUnsubscribeEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "email_unsubscribes"

    email: Mapped[str] = mapped_column(String(255), primary_key=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), init=False)
