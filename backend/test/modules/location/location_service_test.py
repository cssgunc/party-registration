from datetime import datetime
from unittest.mock import MagicMock, patch

import googlemaps
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_model import (
    AddressData,
    AutocompleteResult,
    Location,
    LocationData,
)
from src.modules.location.location_service import (
    GoogleMapsAPIException,
    InvalidPlaceIdException,
    LocationConflictException,
    LocationNotFoundException,
    LocationService,
    PlaceNotFoundException,
)


@pytest.fixture
def mock_gmaps_client() -> MagicMock:
    """Create a mock Google Maps client"""
    return MagicMock()


@pytest.fixture
def location_service(mock_gmaps_client: MagicMock) -> LocationService:
    """Create LocationService with mocked Google Maps client (for Google Maps API tests)"""
    return LocationService(gmaps_client=mock_gmaps_client)


@pytest.fixture
def location_service_db(
    test_async_session: AsyncSession, mock_gmaps_client: MagicMock
) -> LocationService:
    """Create LocationService with database session and mocked Google Maps client (for CRUD tests)"""
    return LocationService(gmaps_client=mock_gmaps_client, session=test_async_session)


@pytest.fixture
def sample_location_data() -> LocationData:
    """Create sample location data for testing"""
    return LocationData(
        google_place_id="ChIJ123abc",
        formatted_address="123 Main St, Chapel Hill, NC 27514, USA",
        latitude=35.9132,
        longitude=-79.0558,
        street_number="123",
        street_name="Main Street",
        unit=None,
        city="Chapel Hill",
        county="Orange County",
        state="NC",
        country="US",
        zip_code="27514",
        warning_count=0,
        citation_count=0,
        hold_expiration=None,
    )


@pytest.fixture
def sample_location_data_2() -> LocationData:
    """Create another sample location data for testing"""
    return LocationData(
        google_place_id="ChIJ456def",
        formatted_address="456 Oak Ave, Durham, NC 27701, USA",
        latitude=35.9940,
        longitude=-78.8986,
        street_number="456",
        street_name="Oak Avenue",
        unit="Apt 2B",
        city="Durham",
        county="Durham County",
        state="NC",
        country="US",
        zip_code="27701",
        warning_count=1,
        citation_count=2,
        hold_expiration=datetime(2025, 12, 31, 23, 59, 59),
    )


@pytest_asyncio.fixture
async def test_location(test_async_session: AsyncSession) -> Location:
    """Create a test location entity directly in the database"""
    location_entity = LocationEntity(
        google_place_id="ChIJ123abc",
        formatted_address="123 Main St, Chapel Hill, NC 27514, USA",
        latitude=35.9132,
        longitude=-79.0558,
        street_number="123",
        street_name="Main Street",
        unit=None,
        city="Chapel Hill",
        county="Orange County",
        state="NC",
        country="US",
        zip_code="27514",
        warning_count=0,
        citation_count=0,
        hold_expiration=None,
    )
    test_async_session.add(location_entity)
    await test_async_session.commit()
    await test_async_session.refresh(location_entity)
    return location_entity.to_model()


@pytest_asyncio.fixture
async def test_location_2(test_async_session: AsyncSession) -> Location:
    """Create a second test location entity directly in the database"""
    location_entity = LocationEntity(
        google_place_id="ChIJ456def",
        formatted_address="456 Oak Ave, Durham, NC 27701, USA",
        latitude=35.9940,
        longitude=-78.8986,
        street_number="456",
        street_name="Oak Avenue",
        unit="Apt 2B",
        city="Durham",
        county="Durham County",
        state="NC",
        country="US",
        zip_code="27701",
        warning_count=1,
        citation_count=2,
        hold_expiration=datetime(2025, 12, 31, 23, 59, 59),
    )
    test_async_session.add(location_entity)
    await test_async_session.commit()
    await test_async_session.refresh(location_entity)
    return location_entity.to_model()


@pytest_asyncio.fixture
async def test_locations_multiple(test_async_session: AsyncSession) -> list[Location]:
    """Create multiple test location entities directly in the database"""
    location_entities = [
        LocationEntity(
            google_place_id="ChIJ123abc",
            formatted_address="123 Main St, Chapel Hill, NC 27514, USA",
            latitude=35.9132,
            longitude=-79.0558,
            street_number="123",
            street_name="Main Street",
            city="Chapel Hill",
            county="Orange County",
            state="NC",
            country="US",
            zip_code="27514",
            warning_count=0,
            citation_count=0,
        ),
        LocationEntity(
            google_place_id="ChIJ456def",
            formatted_address="456 Oak Ave, Durham, NC 27701, USA",
            latitude=35.9940,
            longitude=-78.8986,
            street_number="456",
            street_name="Oak Avenue",
            unit="Apt 2B",
            city="Durham",
            county="Durham County",
            state="NC",
            country="US",
            zip_code="27701",
            warning_count=1,
            citation_count=2,
            hold_expiration=datetime(2025, 12, 31, 23, 59, 59),
        ),
    ]

    for entity in location_entities:
        test_async_session.add(entity)
    await test_async_session.commit()

    locations = []
    for entity in location_entities:
        await test_async_session.refresh(entity)
        locations.append(entity.to_model())

    return locations


@pytest.mark.asyncio
async def test_create_location(
    location_service_db: LocationService, sample_location_data: LocationData
) -> None:
    """Test creating a new location"""
    location = await location_service_db.create_location(sample_location_data)

    assert location is not None
    assert location.id is not None
    assert location.google_place_id == "ChIJ123abc"
    assert location.formatted_address == "123 Main St, Chapel Hill, NC 27514, USA"
    assert location.latitude == 35.9132
    assert location.longitude == -79.0558
    assert location.street_number == "123"
    assert location.street_name == "Main Street"
    assert location.unit is None
    assert location.city == "Chapel Hill"
    assert location.county == "Orange County"
    assert location.state == "NC"
    assert location.country == "US"
    assert location.zip_code == "27514"
    assert location.warning_count == 0
    assert location.citation_count == 0
    assert location.hold_expiration is None


@pytest.mark.asyncio
async def test_create_location_with_full_data(
    location_service_db: LocationService, sample_location_data_2: LocationData
) -> None:
    """Test creating a location with all optional fields populated"""
    location = await location_service_db.create_location(sample_location_data_2)

    assert location is not None
    assert location.id is not None
    assert location.google_place_id == "ChIJ456def"
    assert location.unit == "Apt 2B"
    assert location.warning_count == 1
    assert location.citation_count == 2
    assert location.hold_expiration == datetime(2025, 12, 31, 23, 59, 59)


@pytest.mark.asyncio
async def test_create_location_conflict(
    location_service_db: LocationService, sample_location_data: LocationData
) -> None:
    """Test creating a location with duplicate google_place_id raises conflict exception"""
    await location_service_db.create_location(sample_location_data)

    with pytest.raises(
        LocationConflictException,
        match="Location with Google Place ID ChIJ123abc already exists",
    ):
        await location_service_db.create_location(sample_location_data)


@pytest.mark.asyncio
async def test_get_locations_empty(location_service_db: LocationService) -> None:
    """Test getting all locations when none exist"""
    locations = await location_service_db.get_locations()
    assert locations == []


@pytest.mark.asyncio
async def test_get_locations(
    location_service_db: LocationService, test_locations_multiple: list[Location]
) -> None:
    """Test getting all locations"""
    locations = await location_service_db.get_locations()

    assert len(locations) == 2
    place_ids = sorted([loc.google_place_id for loc in locations])
    assert place_ids == ["ChIJ123abc", "ChIJ456def"]


@pytest.mark.asyncio
async def test_get_location_by_id(
    location_service_db: LocationService, test_location: Location
) -> None:
    """Test getting a location by its ID"""
    fetched = await location_service_db.get_location_by_id(test_location.id)

    assert fetched.id == test_location.id
    assert fetched.google_place_id == test_location.google_place_id
    assert fetched.formatted_address == test_location.formatted_address


@pytest.mark.asyncio
async def test_get_location_by_id_not_found(
    location_service_db: LocationService,
) -> None:
    """Test getting a location by non-existent ID raises not found exception"""
    with pytest.raises(
        LocationNotFoundException, match="Location with ID 999 not found"
    ):
        await location_service_db.get_location_by_id(999)


@pytest.mark.asyncio
async def test_get_location_by_place_id(
    location_service_db: LocationService, test_location: Location
) -> None:
    """Test getting a location by its Google Place ID"""
    fetched = await location_service_db.get_location_by_place_id("ChIJ123abc")

    assert fetched.id == test_location.id
    assert fetched.google_place_id == "ChIJ123abc"
    assert fetched.formatted_address == test_location.formatted_address


@pytest.mark.asyncio
async def test_get_location_by_place_id_not_found(
    location_service_db: LocationService,
) -> None:
    """Test getting a location by non-existent place ID raises not found exception"""
    with pytest.raises(
        LocationNotFoundException,
        match="Location with Google Place ID invalid_place_id not found",
    ):
        await location_service_db.get_location_by_place_id("invalid_place_id")


@pytest.mark.asyncio
async def test_update_location(
    location_service_db: LocationService, test_location: Location
) -> None:
    """Test updating a location"""
    # Update the location
    update_data = LocationData(
        google_place_id="ChIJ123abc",  # same place ID
        formatted_address="123 Main Street, Chapel Hill, NC 27514, USA",  # slightly different
        latitude=35.9132,
        longitude=-79.0558,
        street_number="123",
        street_name="Main Street",
        unit="Suite 100",  # added unit
        city="Chapel Hill",
        county="Orange County",
        state="NC",
        country="US",
        zip_code="27514",
        warning_count=3,  # increased warnings
        citation_count=1,  # added citation
        hold_expiration=datetime(2026, 1, 1, 0, 0, 0),  # added hold
    )

    updated = await location_service_db.update_location(test_location.id, update_data)

    assert updated.id == test_location.id
    assert updated.formatted_address == "123 Main Street, Chapel Hill, NC 27514, USA"
    assert updated.unit == "Suite 100"
    assert updated.warning_count == 3
    assert updated.citation_count == 1
    assert updated.hold_expiration == datetime(2026, 1, 1, 0, 0, 0)


@pytest.mark.asyncio
async def test_update_location_not_found(
    location_service_db: LocationService, sample_location_data: LocationData
) -> None:
    """Test updating a non-existent location raises not found exception"""
    with pytest.raises(
        LocationNotFoundException, match="Location with ID 999 not found"
    ):
        await location_service_db.update_location(999, sample_location_data)


@pytest.mark.asyncio
async def test_update_location_conflict(
    location_service_db: LocationService, test_locations_multiple: list[Location]
) -> None:
    """Test updating a location with another location's google_place_id raises conflict exception"""
    location1 = test_locations_multiple[0]
    location2 = test_locations_multiple[1]

    # Try to update location2 to have location1's place_id
    conflict_data = LocationData(
        google_place_id=location1.google_place_id,  # location1's place_id
        formatted_address="456 Oak Ave, Durham, NC 27701, USA",
        latitude=35.9940,
        longitude=-78.8986,
        street_number="456",
        street_name="Oak Avenue",
        unit=None,
        city="Durham",
        county="Durham County",
        state="NC",
        country="US",
        zip_code="27701",
        warning_count=0,
        citation_count=0,
        hold_expiration=None,
    )

    with pytest.raises(
        LocationConflictException,
        match="Location with Google Place ID ChIJ123abc already exists",
    ):
        await location_service_db.update_location(location2.id, conflict_data)


@pytest.mark.asyncio
async def test_update_location_same_place_id(
    location_service_db: LocationService, test_location: Location
) -> None:
    """Test updating a location with the same google_place_id works (no conflict with itself)"""
    update_data = LocationData(
        google_place_id="ChIJ123abc",  # same place_id
        formatted_address="Updated Address",
        latitude=35.9132,
        longitude=-79.0558,
        street_number="123",
        street_name="Main Street",
        unit=None,
        city="Chapel Hill",
        county="Orange County",
        state="NC",
        country="US",
        zip_code="27514",
        warning_count=5,
        citation_count=2,
        hold_expiration=None,
    )

    updated = await location_service_db.update_location(test_location.id, update_data)

    assert updated.id == test_location.id
    assert updated.google_place_id == "ChIJ123abc"
    assert updated.formatted_address == "Updated Address"
    assert updated.warning_count == 5
    assert updated.citation_count == 2


@pytest.mark.asyncio
async def test_delete_location(
    location_service_db: LocationService, test_location: Location
) -> None:
    """Test deleting a location"""
    deleted = await location_service_db.delete_location(test_location.id)

    assert deleted.id == test_location.id
    assert deleted.google_place_id == test_location.google_place_id

    # Verify it's actually deleted
    with pytest.raises(LocationNotFoundException):
        await location_service_db.get_location_by_id(test_location.id)


@pytest.mark.asyncio
async def test_delete_location_not_found(location_service_db: LocationService) -> None:
    """Test deleting a non-existent location raises not found exception"""
    with pytest.raises(
        LocationNotFoundException, match="Location with ID 999 not found"
    ):
        await location_service_db.delete_location(999)


@pytest.mark.asyncio
async def test_delete_location_verify_others_remain(
    location_service_db: LocationService, test_locations_multiple: list[Location]
) -> None:
    """Test that deleting one location doesn't affect others"""
    location1 = test_locations_multiple[0]
    location2 = test_locations_multiple[1]

    await location_service_db.delete_location(location1.id)

    # location2 should still exist
    fetched = await location_service_db.get_location_by_id(location2.id)
    assert fetched.id == location2.id

    # Only one location should remain
    all_locations = await location_service_db.get_locations()
    assert len(all_locations) == 1
    assert all_locations[0].id == location2.id


@pytest.mark.asyncio
async def test_location_data_persistence(location_service_db: LocationService) -> None:
    """Test that all location data fields are properly persisted"""
    data = LocationData(
        google_place_id="ChIJ_test_123",
        formatted_address="789 Test Blvd, Raleigh, NC 27601, USA",
        latitude=35.7796,
        longitude=-78.6382,
        street_number="789",
        street_name="Test Boulevard",
        unit="Floor 3",
        city="Raleigh",
        county="Wake County",
        state="NC",
        country="US",
        zip_code="27601",
        warning_count=10,
        citation_count=5,
        hold_expiration=datetime(2025, 6, 15, 12, 30, 0),
    )

    created = await location_service_db.create_location(data)
    fetched = await location_service_db.get_location_by_id(created.id)

    # Verify all fields are preserved
    assert fetched.google_place_id == "ChIJ_test_123"
    assert fetched.formatted_address == "789 Test Blvd, Raleigh, NC 27601, USA"
    assert fetched.latitude == 35.7796
    assert fetched.longitude == -78.6382
    assert fetched.street_number == "789"
    assert fetched.street_name == "Test Boulevard"
    assert fetched.unit == "Floor 3"
    assert fetched.city == "Raleigh"
    assert fetched.county == "Wake County"
    assert fetched.state == "NC"
    assert fetched.country == "US"
    assert fetched.zip_code == "27601"
    assert fetched.warning_count == 10
    assert fetched.citation_count == 5
    assert fetched.hold_expiration == datetime(2025, 6, 15, 12, 30, 0)


@pytest.mark.asyncio
async def test_location_complaints_field_defaults_to_empty_list(
    location_service_db: LocationService,
) -> None:
    """Test that Location DTO complaints field defaults to empty list."""
    data = LocationData(
        google_place_id="ChIJ_complaints_test",
        formatted_address="100 Complaint St, Chapel Hill, NC 27514, USA",
        latitude=35.9132,
        longitude=-79.0558,
        warning_count=0,
        citation_count=0,
        hold_expiration=None,
    )

    created = await location_service_db.create_location(data)

    # Verify complaints field exists and is empty list
    assert hasattr(created, "complaints")
    assert created.complaints == []
    assert isinstance(created.complaints, list)


@pytest.mark.asyncio
async def test_location_serialization_includes_complaints(
    location_service_db: LocationService,
) -> None:
    """Test that Location DTO properly serializes with complaints field."""
    data = LocationData(
        google_place_id="ChIJ_serialize_test",
        formatted_address="200 Serialize Ave, Chapel Hill, NC 27514, USA",
        latitude=35.9132,
        longitude=-79.0558,
        warning_count=0,
        citation_count=0,
        hold_expiration=None,
    )

    created = await location_service_db.create_location(data)

    # Test model_dump includes complaints
    serialized = created.model_dump()
    assert "complaints" in serialized
    assert serialized["complaints"] == []

    # Test JSON serialization
    json_str = created.model_dump_json()
    assert "complaints" in json_str


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

    with pytest.raises(GoogleMapsAPIException, match="Failed to autocomplete address"):
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
            "address_components": [
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

    assert isinstance(result, AddressData)
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
        PlaceNotFoundException, match="Place with ID invalid_place_id not found"
    ):
        await location_service.get_place_details("invalid_place_id")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_api_error(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    mock_place.side_effect = Exception("API Error")

    with pytest.raises(GoogleMapsAPIException, match="Failed to get place details"):
        await location_service.get_place_details("ChIJ123abc")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_api_not_found_status(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that Google Maps API NOT_FOUND status raises PlaceNotFoundException"""
    api_error = googlemaps.exceptions.ApiError("NOT_FOUND")
    api_error.status = "NOT_FOUND"
    mock_place.side_effect = api_error

    with pytest.raises(PlaceNotFoundException, match="Place with ID.*not found"):
        await location_service.get_place_details("ChIJ123abc")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_api_invalid_request_status(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that Google Maps API INVALID_REQUEST status raises InvalidPlaceIdException"""
    api_error = googlemaps.exceptions.ApiError("INVALID_REQUEST")
    api_error.status = "INVALID_REQUEST"
    mock_place.side_effect = api_error

    with pytest.raises(InvalidPlaceIdException, match="Invalid place ID"):
        await location_service.get_place_details("invalid_id")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_api_other_error_status(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that other Google Maps API errors raise GoogleMapsAPIException"""
    api_error = googlemaps.exceptions.ApiError("OVER_QUERY_LIMIT")
    api_error.status = "OVER_QUERY_LIMIT"
    mock_place.side_effect = api_error

    with pytest.raises(GoogleMapsAPIException, match="API error.*OVER_QUERY_LIMIT"):
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
            "address_components": [],
        }
    }

    mock_place.return_value = mock_place_result

    result = await location_service.get_place_details("ChIJ123abc")

    assert isinstance(result, AddressData)
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
            "address_components": [],
        }
    }

    mock_place.return_value = mock_place_result

    with pytest.raises(GoogleMapsAPIException, match="No geometry data found"):
        await location_service.get_place_details("ChIJ123abc")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_timeout_error(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that Timeout errors are properly wrapped in GoogleMapsAPIException"""
    mock_place.side_effect = googlemaps.exceptions.Timeout("Request timed out")

    with pytest.raises(GoogleMapsAPIException, match="Request timed out"):
        await location_service.get_place_details("ChIJ123abc")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_http_error(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that HTTP errors are properly wrapped in GoogleMapsAPIException"""
    mock_place.side_effect = googlemaps.exceptions.HTTPError(500)

    with pytest.raises(GoogleMapsAPIException, match="HTTP error"):
        await location_service.get_place_details("ChIJ123abc")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_get_place_details_transport_error(
    mock_place: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that Transport errors are properly wrapped in GoogleMapsAPIException"""
    mock_place.side_effect = googlemaps.exceptions.TransportError("Connection failed")

    with pytest.raises(GoogleMapsAPIException, match="Transport error"):
        await location_service.get_place_details("ChIJ123abc")


@patch("src.modules.location.location_service.places.places_autocomplete")
@pytest.mark.asyncio
async def test_autocomplete_timeout_error(
    mock_places_autocomplete: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that Timeout errors in autocomplete are properly wrapped"""
    mock_places_autocomplete.side_effect = googlemaps.exceptions.Timeout("Timed out")

    with pytest.raises(GoogleMapsAPIException, match="Request timed out"):
        await location_service.autocomplete_address("123 Main St")


@patch("src.modules.location.location_service.places.places_autocomplete")
@pytest.mark.asyncio
async def test_autocomplete_transport_error(
    mock_places_autocomplete: MagicMock,
    location_service: LocationService,
) -> None:
    """Test that Transport errors in autocomplete are properly wrapped"""
    mock_places_autocomplete.side_effect = googlemaps.exceptions.TransportError(
        "Network error"
    )

    with pytest.raises(GoogleMapsAPIException, match="Transport error"):
        await location_service.autocomplete_address("123 Main St")
