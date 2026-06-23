from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.database import EntityBase
from src.core.types import UTCDateTime


class EmailUnsubscribeEntity(MappedAsDataclass, EntityBase):
    """Persistence model for an opted-out email address (``email_unsubscribes`` table).

    A row's presence for a given email means that address will be skipped when
    sending party notification emails. The primary key is the lowercased email
    address, so duplicate unsubscribe attempts hit a unique-constraint violation
    (caught in the service layer) rather than creating duplicate rows.
    """

    __tablename__ = "email_unsubscribes"

    email: Mapped[str] = mapped_column(String(255), primary_key=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), init=False)
