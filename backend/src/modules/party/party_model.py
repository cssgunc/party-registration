from typing import Annotated, Literal, Union

from pydantic import AwareDatetime, BaseModel, EmailStr, Field
from src.core.models import PaginatedResponse
from src.modules.location.location_model import Location
from src.modules.student.student_model import ContactPreference, Student


class PartyData(BaseModel):
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    location_id: int = Field(..., description="ID of the location where the party is held")
    contact_one_id: int = Field(..., description="ID of the first contact student")
    contact_two: "Contact" = Field(..., description="Contact information for the second contact")


class Contact(BaseModel):
    """DTO for contact information (contact_two in party registration)."""

    email: EmailStr = Field(..., description="Email address of the contact")
    first_name: str = Field(..., min_length=1, description="First name of the contact")
    last_name: str = Field(..., min_length=1, description="Last name of the contact")
    phone_number: str = Field(
        ..., pattern=r"^\+?1?\d{9,15}$", description="Phone number of the contact"
    )
    contact_preference: ContactPreference = Field(
        ..., description="Preferred contact method: 'call' or 'text'"
    )


class Party(BaseModel):
    id: int
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    location: Location = Field(..., description="Location where the party is held")
    contact_one: Student = Field(..., description="First contact student")
    contact_two: Contact = Field(..., description="Contact information for the second contact")


class StudentCreatePartyDTO(BaseModel):
    """DTO for students creating a party registration.
    contact_one will be automatically set from the authenticated student."""

    type: Literal["student"] = Field("student", description="Request type discriminator")
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    google_place_id: str = Field(..., description="Google Maps place ID of the location")
    contact_two: Contact = Field(..., description="Contact information for the second contact")


class AdminCreatePartyDTO(BaseModel):
    """DTO for admins creating or updating a party registration.
    Both contacts must be explicitly specified."""

    type: Literal["admin"] = Field("admin", description="Request type discriminator")
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    google_place_id: str = Field(..., description="Google Maps place ID of the location")
    contact_one_email: EmailStr = Field(
        ..., description="Email address of the first contact student"
    )
    contact_two: Contact = Field(..., description="Contact information for the second contact")


# Discriminated union for party creation/update requests
CreatePartyDTO = Annotated[
    Union[StudentCreatePartyDTO, AdminCreatePartyDTO], Field(discriminator="type")
]


PaginatedPartiesResponse = PaginatedResponse[Party]
