from datetime import UTC, datetime
from typing import Self

from pydantic import AwareDatetime, BaseModel


class AddressData(BaseModel):
    """Raw address data returned by Google Maps, without OCSL-specific fields.

    Populated by `LocationService.get_place_details` and used as an intermediate
    form before converting to `LocationData` for persistence.
    """

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
    """Persistence-shaped location data that includes the optional OCSL hold.

    Extends `AddressData` with ``hold_expiration``, which is set by admins when
    a location is barred from hosting parties for a period of time.
    """

    hold_expiration: AwareDatetime | None = None

    @classmethod
    def from_address(
        cls,
        address: AddressData,
        hold_expiration: AwareDatetime | None = None,
    ) -> Self:
        """Build a `LocationData` from an `AddressData`, optionally attaching a hold.

        Args:
            address: Raw address data from Google Maps.
            hold_expiration: Optional hold expiry to attach; defaults to no hold.
        """
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
        """Return True if ``hold_expiration`` is set and is in the future (UTC)."""
        now = datetime.now(UTC)
        return self.hold_expiration is not None and self.hold_expiration > now
