import enum
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, EmailStr, Field, field_validator
from src.core.types import PhoneNumber
from src.core.utils.query_utils import PaginatedResponse
from src.modules.location.location_model import LocationDto, LocationStudentDto
from src.modules.student.student_model import ContactPreference, StudentDto


class PartyStatus(enum.Enum):
    """Lifecycle status of a party registration."""

    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class PartyData(BaseModel):
    """Persistence-shaped party data used to build a ``PartyEntity``.

    Unlike the request DTOs, both contacts are already resolved to a location and
    contact-one ID; this is the internal shape the service hands to the entity.
    """

    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    location_id: int = Field(..., description="ID of the location where the party is held")
    contact_one_id: int = Field(..., description="ID of the first contact student")
    contact_two: "ContactDto" = Field(..., description="Contact information for the second contact")
    status: PartyStatus = PartyStatus.CONFIRMED


class ContactDto(BaseModel):
    """Second-contact information supplied when registering a party.

    Contact one is always the hosting student; contact two is a free-form person
    whose UNC email is validated below.
    """

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
        """Reject any email that is not under the ``@unc.edu`` domain."""
        if not str(v).lower().endswith("@unc.edu"):
            raise ValueError("Contact two email must be a UNC email address (@unc.edu)")
        return v


class PartyDto(BaseModel):
    """Full party representation returned to staff and admins (no PII stripping)."""

    id: int
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    location: LocationDto = Field(..., description="Location where the party is held")
    contact_one: StudentDto = Field(..., description="First contact student")
    contact_two: ContactDto = Field(..., description="Contact information for the second contact")
    status: PartyStatus


class PartyStudentDto(PartyDto):
    """Party DTO for the student view — location incidents restricted to type and date/time."""

    location: LocationStudentDto


class PartyDraft(BaseModel):
    """Proposed final state of a party being created or updated.

    Mirrors ``PartyDto`` minus ``id``; ``existing`` is set on update flows only.
    ``location`` is ``None`` for student paths when the student has no residence —
    the ``NO_RESIDENCE`` rule fires before any consumer reads location.
    """

    party_datetime: AwareDatetime
    location: LocationDto | None = None
    contact_one: StudentDto
    contact_two: ContactDto
    existing: PartyDto | None = None


class StudentCreatePartyDto(BaseModel):
    """Request body for a student registering their own party.

    The location is derived from the student's residence and ``contact_one`` is
    taken from the authenticated student, so neither is supplied here.
    """

    type: Literal["student"] = Field("student", description="Request type discriminator")
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    contact_two: ContactDto = Field(..., description="Contact information for the second contact")


class AdminCreatePartyDto(BaseModel):
    """Request body for an admin creating or updating a party on a student's behalf.

    Admins specify both contacts and the location explicitly, bypassing the
    residence/hold flow students go through.
    """

    type: Literal["admin"] = Field("admin", description="Request type discriminator")
    party_datetime: AwareDatetime = Field(..., description="Date and time of the party")
    google_place_id: str = Field(..., description="Google Maps place ID of the location")
    contact_one_student_id: int = Field(..., description="Account ID of the first contact student")
    contact_two: ContactDto = Field(..., description="Contact information for the second contact")


# Discriminated union for party creation/update requests
CreatePartyDto = Annotated[StudentCreatePartyDto | AdminCreatePartyDto, Field(discriminator="type")]


class PartyRuleError(BaseModel):
    """Structured detail for a party rule violation (HTTP 400).

    Party validation failures return a machine-readable ``code`` alongside a
    human-readable ``message`` so the frontend can branch on the specific rule.
    See ``PartyRule`` in ``party_service.py`` for the full set of codes.
    """

    code: str = Field(..., description="Machine-readable rule code, e.g. PARTY_DATE_TOO_SOON")
    message: str = Field(..., description="Human-readable explanation of the violation")


class PartyRuleErrorResponse(BaseModel):
    """Error envelope returned when a party rule is violated.

    Wraps `PartyRuleError` under ``detail`` — the structured counterpart to
    the standard ``{"detail": str}`` error body.
    """

    detail: PartyRuleError


class PaginatedPartiesResponse(PaginatedResponse[PartyDto]):
    """Paginated list of parties for the staff/admin view."""

    pass


class ContactPoliceDto(BaseModel):
    """Police-visible contact: name plus operational contact info only.

    Used for both ``contact_one`` and ``contact_two`` in `PartyPoliceDto`;
    PII such as email, PID, and onyen is intentionally omitted.
    """

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
    """Paginated list of parties for the police view."""

    pass


class ExactMatchDto(BaseModel):
    """The searched location plus the confirmed party at it, if any.

    Part of `ProximitySearchResponse`; ``location`` is ``None`` when the
    place has no DB record and ``party`` is ``None`` when no party falls in range.
    """

    google_place_id: str
    formatted_address: str
    location: LocationDto | None = Field(None, description="null if location not in DB")
    party: PartyPoliceDto | None = Field(None, description="null if no party in date range")


class ProximitySearchResponse(BaseModel):
    """Result of a police proximity search: the exact match plus nearby parties."""

    exact_match: ExactMatchDto
    nearby: list[PartyPoliceDto]
