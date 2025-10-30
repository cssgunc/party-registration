from unittest.mock import MagicMock, patch

import pytest
from src.modules.location.location_model import AutocompleteResult, LocationData
from src.modules.location.location_service import (
    LocationService,
    LocationServiceException,
)


@pytest.fixture
def mock_gmaps_client() -> MagicMock:
    """Create a mock Google Maps client"""
    return MagicMock()


@pytest.fixture
def location_service(mock_gmaps_client: MagicMock) -> LocationService:
    """Create LocationService with mocked Google Maps client"""
    return LocationService(gmaps_client=mock_gmaps_client)


@patch("src.modules.location.location_service.places.places_autocomplete")
@pytest.mark.asyncio
async def test_autocomplete_address_success(
    mock_places_autocomplete: MagicMock,
    location_service: LocationService,
) -> None:
    # Mock the response from Google Maps API
    mock_predictions = [
        {"description": "123 Main St, Chapel Hill, NC, USA", "place_id": "ChIJ123abc"},
        {"description": "123 Main St, Durham, NC, USA", "place_id": "ChIJ456def"},
    ]

    mock_places_autocomplete.return_value = mock_predictions

    results = await location_service.autocomplete_address("123 Main St")

    assert len(results) == 2
    assert isinstance(results[0], AutocompleteResult)
    assert results[0].formatted_address == "123 Main St, Chapel Hill, NC, USA"
    assert results[0].place_id == "ChIJ123abc"
    assert results[1].formatted_address == "123 Main St, Durham, NC, USA"
    assert results[1].place_id == "ChIJ456def"

    mock_places_autocomplete.assert_called_once_with(
        location_service.gmaps_client,
        input_text="123 Main St",
        types="address",
        language="en",
        location=(35.9132, -79.0558),
        radius=50000,
    )


@patch("src.modules.location.location_service.places.places_autocomplete")
@pytest.mark.asyncio
async def test_autocomplete_address_empty_results(
    mock_places_autocomplete: MagicMock,
    location_service: LocationService,
) -> None:
    mock_places_autocomplete.return_value = []

    results = await location_service.autocomplete_address("nonexistent address")

    assert results == []


@patch("src.modules.location.location_service.places.places_autocomplete")
@pytest.mark.asyncio
async def test_autocomplete_address_api_error(
    mock_places_autocomplete: MagicMock,
    location_service: LocationService,
) -> None:
    mock_places_autocomplete.side_effect = Exception("API Error")

    with pytest.raises(
        LocationServiceException, match="Failed to autocomplete address"
    ):
        await location_service.autocomplete_address("123 Main St")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_success(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    mock_place_result = {
        "result": {
            "formatted_address": "123 Main St, Chapel Hill, NC 27514, USA",
            "geometry": {"location": {"lat": 35.9132, "lng": -79.0558}},
            "address_component": [
                {"long_name": "123", "short_name": "123", "types": ["street_number"]},
                {
                    "long_name": "Main Street",
                    "short_name": "Main St",
                    "types": ["route"],
                },
                {
                    "long_name": "Chapel Hill",
                    "short_name": "Chapel Hill",
                    "types": ["locality", "political"],
                },
                {
                    "long_name": "Orange County",
                    "short_name": "Orange County",
                    "types": ["administrative_area_level_2", "political"],
                },
                {
                    "long_name": "North Carolina",
                    "short_name": "NC",
                    "types": ["administrative_area_level_1", "political"],
                },
                {
                    "long_name": "United States",
                    "short_name": "US",
                    "types": ["country", "political"],
                },
                {"long_name": "27514", "short_name": "27514", "types": ["postal_code"]},
            ],
        }
    }

    mock_place.return_value = mock_place_result

    result = await location_service.get_place_details("ChIJ123abc")

    assert isinstance(result, LocationData)
    assert result.google_place_id == "ChIJ123abc"
    assert result.formatted_address == "123 Main St, Chapel Hill, NC 27514, USA"
    assert result.latitude == 35.9132
    assert result.longitude == -79.0558
    assert result.street_number == "123"
    assert result.street_name == "Main Street"
    assert result.city == "Chapel Hill"
    assert result.county == "Orange County"
    assert result.state == "NC"
    assert result.country == "US"
    assert result.zip_code == "27514"

    mock_place.assert_called_once_with(
        location_service.gmaps_client,
        place_id="ChIJ123abc",
        fields=["formatted_address", "geometry", "address_component"],
    )


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_not_found(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    mock_place.return_value = {}

    with pytest.raises(
        LocationServiceException, match="Place with ID invalid_place_id not found"
    ):
        await location_service.get_place_details("invalid_place_id")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_api_error(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    mock_place.side_effect = Exception("API Error")

    with pytest.raises(LocationServiceException, match="Failed to get place details"):
        await location_service.get_place_details("ChIJ123abc")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_missing_components(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    mock_place_result = {
        "result": {
            "formatted_address": "Somewhere",
            "geometry": {"location": {"lat": 0.0, "lng": 0.0}},
            "address_component": [],
        }
    }

    mock_place.return_value = mock_place_result

    result = await location_service.get_place_details("ChIJ123abc")

    assert isinstance(result, LocationData)
    assert result.google_place_id == "ChIJ123abc"
    assert result.formatted_address == "Somewhere"
    assert result.latitude == 0.0
    assert result.longitude == 0.0
    assert result.street_number is None
    assert result.street_name is None
    assert result.city is None
    assert result.county is None
    assert result.state is None
    assert result.country is None
    assert result.zip_code is None


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_missing_geometry(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    mock_place_result = {
        "result": {
            "formatted_address": "Somewhere",
            "geometry": {},
            "address_component": [],
        }
    }

    mock_place.return_value = mock_place_result

    with pytest.raises(LocationServiceException, match="No geometry data found"):
        await location_service.get_place_details("ChIJ123abc")
