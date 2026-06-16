import enum
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, EmailStr, Field, field_validator
from src.core.types import PhoneNumber
from src.core.utils.query_utils import PaginatedResponse
from src.modules.location.location_model import LocationDto, LocationStudentDto
from src.modules.student.student_model import ContactPreference, StudentDto


class PartyStatus(enum.Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class PartyData(BaseModel):
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    location_id: int = Field(..., description="ID of the location where the party is held")
    contact_one_id: int = Field(..., description="ID of the first contact student")
    contact_two: "ContactDto" = Field(..., description="Contact information for the second contact")
    status: PartyStatus = PartyStatus.CONFIRMED


class ContactDto(BaseModel):
    """DTO for contact information (contact_two in party registration)."""

    email: EmailStr = Field(..., description="UNC email address of the contact")
    first_name: str = Field(..., min_length=1, description="First name of the contact")
    last_name: str = Field(..., min_length=1, description="Last name of the contact")
    phone_number: PhoneNumber
    contact_preference: ContactPreference = Field(
        ..., description="Preferred contact method: 'call' or 'text'"
    )

    @field_validator("email")
    @classmethod
    def must_be_unc_email(cls, v: EmailStr) -> EmailStr:
        if not str(v).lower().endswith("@unc.edu"):
            raise ValueError("Contact two email must be a UNC email address (@unc.edu)")
        return v


class PartyDto(BaseModel):
    id: int
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    location: LocationDto = Field(..., description="Location where the party is held")
    contact_one: StudentDto = Field(..., description="First contact student")
    contact_two: ContactDto = Field(..., description="Contact information for the second contact")
    status: PartyStatus


class PartyStudentDto(PartyDto):
    """Party DTO for student view - location incidents restricted to type and date/time."""

    location: LocationStudentDto


class PartyDraft(BaseModel):
    """Proposed final state of a party being created or updated.
    Mirrors PartyDto minus id; `existing` is set on update flows only.
    `location` is None for student paths when the student has no residence
    — the NO_RESIDENCE rule fires before any consumer reads location."""

    party_datetime: AwareDatetime
    location: LocationDto | None = None
    contact_one: StudentDto
    contact_two: ContactDto
    existing: PartyDto | None = None


class StudentCreatePartyDto(BaseModel):
    """DTO for students creating a party registration.
    Party location is derived from the student's residence.
    contact_one will be automatically set from the authenticated student."""

    type: Literal["student"] = Field("student", description="Request type discriminator")
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    contact_two: ContactDto = Field(..., description="Contact information for the second contact")


class AdminCreatePartyDto(BaseModel):
    """DTO for admins creating or updating a party registration.
    Both contacts must be explicitly specified."""

    type: Literal["admin"] = Field("admin", description="Request type discriminator")
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    google_place_id: str = Field(..., description="Google Maps place ID of the location")
    contact_one_student_id: int = Field(..., description="Account ID of the first contact student")
    contact_two: ContactDto = Field(..., description="Contact information for the second contact")


# Discriminated union for party creation/update requests
CreatePartyDto = Annotated[StudentCreatePartyDto | AdminCreatePartyDto, Field(discriminator="type")]


class PaginatedPartiesResponse(PaginatedResponse[PartyDto]):
    """Paginated response for parties."""

    pass


class ContactPoliceDto(BaseModel):
    """Police-visible contact shape: name + operational contact info only.
    Used for both contact_one and contact_two in PartyPoliceDto."""

    first_name: str
    last_name: str
    phone_number: str | None
    contact_preference: ContactPreference | None


class PartyPoliceDto(BaseModel):
    """Police view of a party — contact PII (email, pid, onyen, residence) stripped."""

    id: int
    party_datetime: AwareDatetime
    location: LocationDto
    contact_one: ContactPoliceDto
    contact_two: ContactPoliceDto
    status: PartyStatus


class PaginatedPartiesPoliceResponse(PaginatedResponse[PartyPoliceDto]):
    """Paginated response for parties (police view)."""

    pass


class ExactMatchDto(BaseModel):
    google_place_id: str
    formatted_address: str
    location: LocationDto | None = Field(None, description="null if location not in DB")
    party: PartyPoliceDto | None = Field(None, description="null if no party in date range")


class ProximitySearchResponse(BaseModel):
    exact_match: ExactMatchDto
    nearby: list[PartyPoliceDto]
