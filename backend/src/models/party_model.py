from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class PartyBase(BaseModel):
    party_datetime: datetime = Field(..., description="Date and time of the party")
    address_id: int = Field(..., description="ID of the address where the party is held")
    contact_one_id: int = Field(..., description="ID of the first contact student")
    contact_two_id: int = Field(..., description="ID of the second contact student")

class PartyCreate(PartyBase):
    pass

class PartyUpdate(BaseModel):
    party_datetime: Optional[datetime] = Field(None, description="Date and time of the party")
    address_id: Optional[int] = Field(None, description="ID of the address where the party is held")
    contact_one_id: Optional[int] = Field(None, description="ID of the first contact student")
    contact_two_id: Optional[int] = Field(None, description="ID of the second contact student")

class PartyResponse(PartyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PartyWithDetails(PartyResponse):
    address: Optional[dict] = None
    contact_one: Optional[dict] = None
    contact_two: Optional[dict] = None

    class Config:
        from_attributes = True