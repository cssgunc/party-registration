from datetime import UTC, datetime
from typing import Self

from pydantic import AwareDatetime, BaseModel


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
    hold_expiration: AwareDatetime | None = None

    @classmethod
    def from_address(
        cls,
        address: AddressData,
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
            hold_expiration=hold_expiration,
        )

    def has_active_hold(self) -> bool:
        """Check if the location currently has an active hold."""
        now = datetime.now(UTC)
        return self.hold_expiration is not None and self.hold_expiration > now
