from pydantic import BaseModel


class AutocompleteInput(BaseModel):
    # Input for address autocomplete
    address: str


class AutocompleteResult(BaseModel):
    # Result from Google Maps autocomplete
    formatted_address: str
    place_id: str


class LocationData(BaseModel):
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
