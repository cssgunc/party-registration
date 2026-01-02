from datetime import datetime

from pydantic import BaseModel


class ComplaintData(BaseModel):
    """Data DTO for a complaint without id."""

    location_id: int
    complaint_datetime: datetime
    description: str = ""


class ComplaintDto(ComplaintData):
    """Output DTO for a complaint."""

    id: int
