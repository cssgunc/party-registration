from pydantic import BaseModel, Field
from datetime import datetime


class PartyData(BaseModel):
    party_datetime: datetime = Field(..., description="Date and time of the party")
    location_id: int = Field(..., description="ID of the location where the party is held")
    contact_one_id: int = Field(..., description="ID of the first contact student")
    contact_two_id: int = Field(..., description="ID of the second contact student")


class Party(PartyData):
    id: int


class StudentCreatePartyDTO(BaseModel):
    """DTO for students creating a party registration.
    contact_one will be automatically set from the authenticated student."""
    party_datetime: datetime = Field(..., description="Date and time of the party")
    place_id: str = Field(..., description="Google Maps place ID of the location")
    contact_two_id: int = Field(..., description="ID of the second contact student")


class AdminCreatePartyDTO(BaseModel):
    """DTO for admins creating or updating a party registration.
    Both contacts must be explicitly specified."""
    party_datetime: datetime = Field(..., description="Date and time of the party")
    place_id: str = Field(..., description="Google Maps place ID of the location")
    contact_one_id: int = Field(..., description="ID of the first contact student")
    contact_two_id: int = Field(..., description="ID of the second contact student")


class PaginatedPartiesResponse(BaseModel):
    parties: list[Party]
    total_records: int
    page_size: int
    page_number: int
    total_pages: int
