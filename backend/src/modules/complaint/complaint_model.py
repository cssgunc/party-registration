from datetime import datetime

from pydantic import BaseModel


class ComplaintData(BaseModel):
    """Data DTO for a complaint without id."""

    location_id: int
    complaint_datetime: datetime
    description: str = ""


class Complaint(ComplaintData):
    """Output DTO for a complaint."""

    id: int


class ComplaintCreate(BaseModel):
    """Input DTO for creating a complaint for a location."""

    location_id: int
    complaint_datetime: datetime
    description: str = ""
