from datetime import UTC
from typing import Annotated

from pydantic import Field
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator):
    """DateTime that always returns UTC-aware datetimes from MySQL."""

    impl = DATETIME(fsp=6)
    cache_ok = True

    def process_result_value(self, value, dialect):  # type: ignore[override]
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


PhoneNumber = Annotated[
    str,
    Field(pattern=r"^\d{10}$", description="10-digit US phone number (digits only, no formatting)"),
]
