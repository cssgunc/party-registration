from pydantic import BaseModel, Field
from datetime import datetime


class PartyData(BaseModel):
    party_datetime: datetime = Field(..., description="Date and time of the party")
    location_id: int = Field(..., description="ID of the location where the party is held")
    contact_one_id: int = Field(..., description="ID of the first contact student")
    contact_two_id: int = Field(..., description="ID of the second contact student")


class Party(PartyData):
    id: int


class PaginatedPartiesResponse(BaseModel):
    parties: list[Party]
    total_records: int
    page_size: int
    page_number: int
    total_pages: int
