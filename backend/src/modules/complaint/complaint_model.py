from datetime import datetime

from pydantic import BaseModel


class Complaint(BaseModel):
    """Output DTO for a complaint."""

    id: int
    location_id: int
    complaint_datetime: datetime
    description: str = ""


class ComplaintCreate(BaseModel):
    """Input DTO for creating a complaint from a party."""

    party_id: int
    complaint_datetime: datetime
    description: str = ""
