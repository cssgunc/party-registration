from typing import Self

from pydantic import AwareDatetime, BaseModel, Field
from src.core.models import PaginatedResponse

# Maximum allowed value for warning/citation counts to prevent overflow
MAX_COUNT = 999999


class AutocompleteInput(BaseModel):
    # Input for address autocomplete
    address: str


class AutocompleteResult(BaseModel):
    # Result from Google Maps autocomplete
    formatted_address: str
    place_id: str


class AddressData(BaseModel):
    # Location data without OCSL-specific fields
    google_place_id: str
    formatted_address: str
    latitude: float
    longitude: float
    street_number: str | None = None
    street_name: str | None = None
    unit: str | None = None
    city: str | None = None
    county: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None


class LocationData(AddressData):
    warning_count: int = Field(default=0, ge=0, le=MAX_COUNT)
    citation_count: int = Field(default=0, ge=0, le=MAX_COUNT)
    hold_expiration: AwareDatetime | None = None

    @classmethod
    def from_address(
        cls,
        address: AddressData,
        warning_count: int = 0,
        citation_count: int = 0,
        hold_expiration: AwareDatetime | None = None,
    ) -> Self:
        return cls(
            google_place_id=address.google_place_id,
            formatted_address=address.formatted_address,
            latitude=address.latitude,
            longitude=address.longitude,
            street_number=address.street_number,
            street_name=address.street_name,
            unit=address.unit,
            city=address.city,
            county=address.county,
            state=address.state,
            country=address.country,
            zip_code=address.zip_code,
            warning_count=warning_count,
            citation_count=citation_count,
            hold_expiration=hold_expiration,
        )


class Location(LocationData):
    id: int


PaginatedLocationResponse = PaginatedResponse[Location]


class LocationCreate(BaseModel):
    google_place_id: str
    warning_count: int = Field(default=0, ge=0, le=MAX_COUNT)
    citation_count: int = Field(default=0, ge=0, le=MAX_COUNT)
    hold_expiration: AwareDatetime | None = None
