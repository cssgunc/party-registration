from datetime import datetime
from typing import Any, TypedDict, Unpack, override
from unittest.mock import MagicMock

import googlemaps
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_model import (
    AddressData,
    AutocompleteResult,
    LocationData,
    LocationDto,
)
from test.utils.resource_test_utils import ResourceTestUtils


class LocationOverrides(TypedDict, total=False):
    google_place_id: str
    formatted_address: str
    latitude: float
    longitude: float
    street_number: str | None
    street_name: str | None
    unit: str | None
    city: str | None
    county: str | None
    state: str | None
    country: str | None
    zip_code: str | None
    warning_count: int
    citation_count: int
    hold_expiration: datetime | None


class LocationTestUtils(
    ResourceTestUtils[
        LocationEntity,
        LocationData,
        LocationDto | AddressData | AutocompleteResult,
    ]
):
    def __init__(self, session: AsyncSession):
        super().__init__(
            session,
            entity_class=LocationEntity,
            data_class=LocationData,
        )

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        defaults = {
            "google_place_id": f"ChIJTestPlace{count:04d}",
            "latitude": 35.913517 + (count * 0.001),
            "longitude": -79.055229 + (count * 0.001),
            "street_number": str(100 + count),
            "street_name": f"Test St {count}",
            "unit": f"Unit {count}",
            "city": f"Chapel Hill {count}",
            "county": f"Orange County {count}",
            "state": ["NC", "VA", "SC", "GA"][count % 4],
            "country": "US",
            "zip_code": f"275{14 + count % 10}",
            "warning_count": count % 5,
            "citation_count": count % 3,
            "hold_expiration": None if count % 2 == 0 else None,
        }
        defaults["formatted_address"] = (
            f"{defaults['street_number']} {defaults['street_name']} {defaults['unit']}, "
            f"{defaults['city']}, {defaults['state']} {defaults['zip_code']}, {defaults['country']}"
        )
        return defaults

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: LocationOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_dict(self, **overrides: Unpack[LocationOverrides]) -> dict:
        return await super().next_dict(**overrides)

    @override
    async def next_data(self, **overrides: Unpack[LocationOverrides]) -> LocationData:
        return await super().next_data(**overrides)

    @override
    async def next_entity(self, **overrides: Unpack[LocationOverrides]) -> LocationEntity:
        return await super().next_entity(**overrides)

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[LocationOverrides]
    ) -> list[LocationEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[LocationOverrides]) -> LocationEntity:
        return await super().create_one(**overrides)

    def next_address_data(self, **overrides: Unpack[LocationOverrides]) -> AddressData:
        """Generate address data without OCSL-specific fields."""
        data = self.get_or_default(
            overrides,
            {
                "google_place_id",
                "formatted_address",
                "latitude",
                "longitude",
                "street_number",
                "street_name",
                "unit",
                "city",
                "county",
                "state",
                "country",
                "zip_code",
            },
        )
        self.count += 1
        return AddressData(**data)

    @override
    def assert_matches(
        self,
        resource1: LocationEntity
        | LocationData
        | LocationDto
        | AddressData
        | AutocompleteResult
        | None,
        resource2: LocationEntity
        | LocationData
        | LocationDto
        | AddressData
        | AutocompleteResult
        | None,
    ) -> None:
        """Assert that two location resources match, with special handling for float comparison."""
        assert resource1 is not None, "First resource is None"
        assert resource2 is not None, "Second resource is None"

        # Convert to dicts for comparison
        dict1 = (
            resource1.model_dump()
            if isinstance(resource1, BaseModel)
            else self.entity_to_dict(resource1)
        )
        dict2 = (
            resource2.model_dump()
            if isinstance(resource2, BaseModel)
            else self.entity_to_dict(resource2)
        )

        # Handle latitude and longitude with approximate comparison
        shared_keys = dict1.keys() & dict2.keys()
        for key in shared_keys:
            if key in ("latitude", "longitude"):
                # Use approximate comparison for floating point coordinates
                assert abs(float(dict1[key]) - float(dict2[key])) < 1e-6, (
                    f"Mismatch on field '{key}': {dict1[key]} != {dict2[key]}"
                )
            else:
                # Use exact comparison for other fields
                assert dict1[key] == dict2[key], (
                    f"Mismatch on field '{key}': {dict1[key]} != {dict2[key]}"
                )


class GmapsMockUtils:
    def __init__(
        self,
        *,
        location_utils: LocationTestUtils,
        mock_place: MagicMock,
        mock_autocomplete: MagicMock,
    ):
        self.location_utils = location_utils
        self.mock_place = mock_place
        self.mock_autocomplete = mock_autocomplete

    def mock_autocomplete_predictions(
        self, count: int = 2, **overrides: Unpack[LocationOverrides]
    ) -> list[dict]:
        """Generate mock autocomplete predictions for Google Maps API testing.

        Args:
            count: Number of predictions to generate
            **overrides: Optional overrides for specific fields

        Returns:
            List of mock prediction dictionaries matching Google Maps API format
        """
        predictions = []
        for i in range(count):
            data = self.location_utils.get_or_default(
                overrides,
                {"google_place_id", "formatted_address"},
            )
            predictions.append(
                {
                    "description": data["formatted_address"],
                    "place_id": data["google_place_id"],
                }
            )

        self.mock_autocomplete.return_value = predictions

        return predictions

    def mock_place_details(self, **overrides: Unpack[LocationOverrides]) -> dict:
        """Generate mock place details response for Google Maps API testing.

        Args:
            **overrides: Optional overrides for specific location fields

        Returns:
            Mock place details response matching Google Maps API format
        """
        data = self.location_utils.get_or_default(overrides)

        address_components = []

        if data.get("street_number"):
            address_components.append(
                {
                    "long_name": data["street_number"],
                    "short_name": data["street_number"],
                    "types": ["street_number"],
                }
            )

        if data.get("street_name"):
            address_components.append(
                {
                    "long_name": data["street_name"],
                    "short_name": data["street_name"],
                    "types": ["route"],
                }
            )

        if data.get("unit"):
            address_components.append(
                {
                    "long_name": data["unit"],
                    "short_name": data["unit"],
                    "types": ["subpremise"],
                }
            )

        if data.get("city"):
            address_components.append(
                {
                    "long_name": data["city"],
                    "short_name": data["city"],
                    "types": ["locality", "political"],
                }
            )

        if data.get("county"):
            address_components.append(
                {
                    "long_name": data["county"],
                    "short_name": data["county"],
                    "types": ["administrative_area_level_2", "political"],
                }
            )

        if data.get("state"):
            address_components.append(
                {
                    "long_name": data["state"],
                    "short_name": data["state"],
                    "types": ["administrative_area_level_1", "political"],
                }
            )

        if data.get("country"):
            address_components.append(
                {
                    "long_name": data["country"],
                    "short_name": data["country"],
                    "types": ["country", "political"],
                }
            )

        if data.get("zip_code"):
            address_components.append(
                {
                    "long_name": data["zip_code"],
                    "short_name": data["zip_code"],
                    "types": ["postal_code"],
                }
            )

        mock_response = {
            "result": {
                "formatted_address": data["formatted_address"],
                "geometry": {
                    "location": {
                        "lat": float(data["latitude"]),
                        "lng": float(data["longitude"]),
                    }
                },
                "address_components": address_components,
            }
        }

        self.mock_place.return_value = mock_response

        return mock_response

    def mock_place_error(self, error: Exception, *, error_status: str | None = None) -> None:
        if error_status is not None:
            assert isinstance(error, googlemaps.exceptions.ApiError)
            error.status = error_status
        self.mock_place.side_effect = error

    def mock_autocomplete_error(
        self,
        error: Exception,
    ) -> None:
        self.mock_autocomplete.side_effect = error

    def assert_autocomplete_matches(
        self,
        result: AutocompleteResult,
        expected_description: str,
        expected_place_id: str,
    ):
        """Assert that an AutocompleteResult matches expected values."""
        assert isinstance(result, AutocompleteResult), (
            f"Expected AutocompleteResult, got {type(result)}"
        )
        assert result.formatted_address == expected_description, (
            f"Description mismatch: {result.formatted_address} != {expected_description}"
        )
        assert result.google_place_id == expected_place_id, (
            f"Place ID mismatch: {result.google_place_id} != {expected_place_id}"
        )
