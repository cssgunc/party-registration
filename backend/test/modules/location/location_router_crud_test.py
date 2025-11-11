from datetime import datetime
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import authenticate_admin
from src.core.database import get_session
from src.main import app
from src.modules.location.location_model import AddressData, Location
from src.modules.location.location_service import (
    GoogleMapsAPIException,
    InvalidPlaceIdException,
    LocationConflictException,
    LocationNotFoundException,
    LocationService,
    PlaceNotFoundException,
)
from src.modules.user.user_model import User


@pytest_asyncio.fixture()
async def mock_location_service() -> LocationService:
    mock_service = AsyncMock(spec=LocationService)
    return mock_service


@pytest_asyncio.fixture()
async def unauthenticated_client(test_async_session: AsyncSession):
    """Create an async test client WITHOUT authentication override."""

    async def override_get_session():
        yield test_async_session

    app.dependency_overrides[get_session] = override_get_session
    # Note: We do NOT override authenticate_admin here

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def client(
    test_async_session: AsyncSession, mock_location_service: LocationService
):
    """Create an async test client with database session and authentication override."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_admin():
        return User(id=1, email="admin@test.com")

    def get_mock_location_service():
        return mock_location_service

    app.dependency_overrides[LocationService] = get_mock_location_service
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_admin] = override_authenticate_admin

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_address_data() -> AddressData:
    """Create sample address data returned from Google Maps API."""
    return AddressData(
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
    )


@pytest.fixture
def sample_address_data_existing() -> AddressData:
    """Create sample address data for an existing location (used in conflict tests)."""
    return AddressData(
        google_place_id="ChIJ_existing",
        formatted_address="456 Existing Ave, Durham, NC 27701, USA",
        latitude=35.9940,
        longitude=-78.8986,
        street_number="456",
        street_name="Existing Avenue",
        unit=None,
        city="Durham",
        county="Durham County",
        state="NC",
        country="US",
        zip_code="27701",
    )


@pytest.fixture
def sample_location() -> Location:
    """Create sample location for testing."""
    return Location(
        id=1,
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
def sample_location_2() -> Location:
    """Create another sample location for testing."""
    return Location(
        id=2,
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


@pytest.mark.asyncio
async def test_get_locations_empty(client: AsyncClient, mock_location_service: AsyncMock):
    """Test GET /locations/ with no locations in database."""
    mock_location_service.get_locations.return_value = []

    response = await client.get("/locations/")
    assert response.status_code == 200

    data = response.json()
    assert data == []
    mock_location_service.get_locations.assert_called_once()


@pytest.mark.asyncio
async def test_get_locations_with_data(
    client: AsyncClient, sample_location: Location, sample_location_2: Location, mock_location_service: AsyncMock
):
    """Test GET /locations/ returns multiple locations."""
    mock_location_service.get_locations.return_value = [sample_location, sample_location_2]

    response = await client.get("/locations/")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2

    # Verify first location
    assert data[0]["id"] == 1
    assert data[0]["google_place_id"] == "ChIJ123abc"
    assert data[0]["formatted_address"] == "123 Main St, Chapel Hill, NC 27514, USA"
    assert data[0]["latitude"] == 35.9132
    assert data[0]["longitude"] == -79.0558
    assert data[0]["warning_count"] == 0
    assert data[0]["citation_count"] == 0

    # Verify second location
    assert data[1]["id"] == 2
    assert data[1]["google_place_id"] == "ChIJ456def"
    assert data[1]["unit"] == "Apt 2B"
    assert data[1]["warning_count"] == 1
    assert data[1]["citation_count"] == 2

    mock_location_service.get_locations.assert_called_once()


@pytest.mark.asyncio
async def test_get_location_by_id_success(
    client: AsyncClient, sample_location: Location, mock_location_service: AsyncMock
):
    """Test GET /locations/{location_id} successfully retrieves a location."""
    mock_location_service.get_location_by_id.return_value = sample_location

    response = await client.get("/locations/1")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == 1
    assert data["google_place_id"] == "ChIJ123abc"
    assert data["formatted_address"] == "123 Main St, Chapel Hill, NC 27514, USA"
    assert data["street_number"] == "123"
    assert data["street_name"] == "Main Street"
    assert data["city"] == "Chapel Hill"
    assert data["state"] == "NC"
    assert data["zip_code"] == "27514"

    mock_location_service.get_location_by_id.assert_called_once_with(1)


@pytest.mark.asyncio
async def test_get_location_by_id_not_found(client: AsyncClient, mock_location_service: AsyncMock):
    """Test GET /locations/{location_id} with non-existent ID returns 404."""
    mock_location_service.get_location_by_id.side_effect = LocationNotFoundException(
        location_id=999
    )

    response = await client.get("/locations/999")
    assert response.status_code == 404

    data = response.json()
    assert "not found" in data["message"].lower()

    mock_location_service.get_location_by_id.assert_called_once_with(999)


@pytest.mark.asyncio
async def test_create_location_success(
    client: AsyncClient, sample_location: Location, sample_address_data: AddressData, mock_location_service: AsyncMock
):
    """Test POST /locations/ successfully creates a location."""
    mock_location_service.get_place_details.return_value = sample_address_data
    mock_location_service.create_location.return_value = sample_location

    request_data = {
        "google_place_id": "ChIJ123abc",
        "warning_count": 0,
        "citation_count": 0,
        "hold_expiration": None,
    }

    response = await client.post("/locations/", json=request_data)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] == 1
    assert data["google_place_id"] == "ChIJ123abc"
    assert data["formatted_address"] == "123 Main St, Chapel Hill, NC 27514, USA"
    assert data["warning_count"] == 0
    assert data["citation_count"] == 0

    mock_location_service.get_place_details.assert_called_once_with("ChIJ123abc")
    mock_location_service.create_location.assert_called_once()


@pytest.mark.asyncio
async def test_create_location_with_warnings_and_citations(
    client: AsyncClient, sample_address_data: AddressData, mock_location_service: AsyncMock
):
    """Test POST /locations/ creates location with warnings and citations."""
    mock_location_service.get_place_details.return_value = sample_address_data

    location_with_warnings = Location(
        id=1,
        **sample_address_data.model_dump(),
        warning_count=3,
        citation_count=2,
        hold_expiration=datetime(2026, 1, 1, 0, 0, 0),
    )
    mock_location_service.create_location.return_value = location_with_warnings

    request_data = {
        "google_place_id": "ChIJ123abc",
        "warning_count": 3,
        "citation_count": 2,
        "hold_expiration": "2026-01-01T00:00:00",
    }

    response = await client.post("/locations/", json=request_data)
    assert response.status_code == 201

    data = response.json()
    assert data["warning_count"] == 3
    assert data["citation_count"] == 2
    assert data["hold_expiration"] == "2026-01-01T00:00:00"


@pytest.mark.asyncio
async def test_create_location_conflict(client: AsyncClient, sample_address_data: AddressData, mock_location_service: AsyncMock):
    """Test POST /locations/ with duplicate google_place_id returns 409."""
    mock_location_service.get_place_details.return_value = sample_address_data
    mock_location_service.create_location.side_effect = LocationConflictException(
        "ChIJ123abc"
    )

    request_data = {
        "google_place_id": "ChIJ123abc",
        "warning_count": 0,
        "citation_count": 0,
    }

    response = await client.post("/locations/", json=request_data)
    assert response.status_code == 409

    data = response.json()
    assert "already exists" in data["message"].lower()


@pytest.mark.asyncio
async def test_create_location_invalid_place_id(client: AsyncClient, mock_location_service: AsyncMock):
    """Test POST /locations/ with invalid place_id returns 400."""
    mock_location_service.get_place_details.side_effect = InvalidPlaceIdException(
        "invalid_id"
    )

    request_data = {
        "google_place_id": "invalid_id",
        "warning_count": 0,
        "citation_count": 0,
    }

    response = await client.post("/locations/", json=request_data)
    assert response.status_code == 400

    data = response.json()
    assert "invalid" in data["message"].lower()


@pytest.mark.asyncio
async def test_create_location_place_not_found(client: AsyncClient, mock_location_service: AsyncMock):
    """Test POST /locations/ with non-existent place_id returns 404."""
    mock_location_service.get_place_details.side_effect = PlaceNotFoundException(
        "ChIJ_nonexistent"
    )

    request_data = {
        "google_place_id": "ChIJ_nonexistent",
        "warning_count": 0,
        "citation_count": 0,
    }

    response = await client.post("/locations/", json=request_data)
    assert response.status_code == 404

    data = response.json()
    assert "not found" in data["message"].lower()


@pytest.mark.asyncio
async def test_create_location_google_maps_api_error(client: AsyncClient, mock_location_service: AsyncMock):
    """Test POST /locations/ with Google Maps API error returns 500."""
    mock_location_service.get_place_details.side_effect = GoogleMapsAPIException(
        "API quota exceeded"
    )

    request_data = {
        "google_place_id": "ChIJ123abc",
        "warning_count": 0,
        "citation_count": 0,
    }

    response = await client.post("/locations/", json=request_data)
    assert response.status_code == 500

    data = response.json()
    assert "google maps api" in data["message"].lower()


@pytest.mark.asyncio
async def test_update_location_success_same_place_id(
    client: AsyncClient, sample_location: Location, mock_location_service: AsyncMock
):
    """Test PUT /locations/{location_id} successfully updates location with same place_id."""
    mock_location_service.get_location_by_id.return_value = sample_location

    updated_location = Location(
        **sample_location.model_dump(exclude={"warning_count", "citation_count", "hold_expiration"}),
        warning_count=5,
        citation_count=3,
        hold_expiration=datetime(2026, 6, 15, 0, 0, 0),
    )
    mock_location_service.update_location.return_value = updated_location

    request_data = {
        "google_place_id": "ChIJ123abc",  # Same place_id
        "warning_count": 5,
        "citation_count": 3,
        "hold_expiration": "2026-06-15T00:00:00",
    }

    response = await client.put("/locations/1", json=request_data)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == 1
    assert data["google_place_id"] == "ChIJ123abc"
    assert data["warning_count"] == 5
    assert data["citation_count"] == 3
    assert data["hold_expiration"] == "2026-06-15T00:00:00"

    mock_location_service.get_location_by_id.assert_called_once_with(1)
    mock_location_service.update_location.assert_called_once()


@pytest.mark.asyncio
async def test_update_location_success_new_place_id(
    client: AsyncClient, sample_location: Location, mock_location_service: AsyncMock
):
    """Test PUT /locations/{location_id} successfully updates with new place_id."""
    mock_location_service.get_location_by_id.return_value = sample_location

    # New address data from Google Maps
    new_address_data = AddressData(
        google_place_id="ChIJ_new_place",
        formatted_address="789 New St, Raleigh, NC 27601, USA",
        latitude=35.7796,
        longitude=-78.6382,
        street_number="789",
        street_name="New Street",
        unit=None,
        city="Raleigh",
        county="Wake County",
        state="NC",
        country="US",
        zip_code="27601",
    )
    mock_location_service.get_place_details.return_value = new_address_data

    updated_location = Location(
        id=1,
        **new_address_data.model_dump(),
        warning_count=2,
        citation_count=1,
        hold_expiration=None,
    )
    mock_location_service.update_location.return_value = updated_location

    request_data = {
        "google_place_id": "ChIJ_new_place",
        "warning_count": 2,
        "citation_count": 1,
        "hold_expiration": None,
    }

    response = await client.put("/locations/1", json=request_data)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == 1
    assert data["google_place_id"] == "ChIJ_new_place"
    assert data["formatted_address"] == "789 New St, Raleigh, NC 27601, USA"
    assert data["city"] == "Raleigh"

    mock_location_service.get_location_by_id.assert_called_once_with(1)
    mock_location_service.get_place_details.assert_called_once_with("ChIJ_new_place")
    mock_location_service.update_location.assert_called_once()


@pytest.mark.asyncio
async def test_update_location_not_found(client: AsyncClient, mock_location_service: AsyncMock):
    """Test PUT /locations/{location_id} with non-existent ID returns 404."""
    mock_location_service.get_location_by_id.side_effect = LocationNotFoundException(
        location_id=999
    )

    request_data = {
        "google_place_id": "ChIJ123abc",
        "warning_count": 0,
        "citation_count": 0,
    }

    response = await client.put("/locations/999", json=request_data)
    assert response.status_code == 404

    data = response.json()
    assert "not found" in data["message"].lower()


@pytest.mark.asyncio
async def test_update_location_conflict(client: AsyncClient, sample_location: Location, sample_address_data_existing: AddressData, mock_location_service: AsyncMock):
    """Test PUT /locations/{location_id} with conflicting place_id returns 409."""
    mock_location_service.get_location_by_id.return_value = sample_location
    mock_location_service.get_place_details.return_value = sample_address_data_existing
    mock_location_service.update_location.side_effect = LocationConflictException(
        "ChIJ_existing"
    )

    request_data = {
        "google_place_id": "ChIJ_existing",
        "warning_count": 0,
        "citation_count": 0,
    }

    response = await client.put("/locations/1", json=request_data)
    assert response.status_code == 409

    data = response.json()
    assert "already exists" in data["message"].lower()


@pytest.mark.asyncio
async def test_update_location_invalid_new_place_id(
    client: AsyncClient, sample_location: Location, mock_location_service: AsyncMock
):
    """Test PUT /locations/{location_id} with invalid new place_id returns 400."""
    # Mock location with different place_id
    existing_location = Location(**sample_location.model_dump())
    existing_location.google_place_id = "ChIJ_old"
    mock_location_service.get_location_by_id.return_value = existing_location

    mock_location_service.get_place_details.side_effect = InvalidPlaceIdException(
        "invalid_new_id"
    )

    request_data = {
        "google_place_id": "invalid_new_id",
        "warning_count": 0,
        "citation_count": 0,
    }

    response = await client.put("/locations/1", json=request_data)
    assert response.status_code == 400

    data = response.json()
    assert "invalid" in data["message"].lower()


@pytest.mark.asyncio
async def test_delete_location_success(
    sample_location: Location, client: AsyncClient, mock_location_service: AsyncMock
):
    """Test DELETE /locations/{location_id} successfully deletes a location."""
    mock_location_service.delete_location.return_value = sample_location
    response = await client.delete("/locations/1")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == 1
    assert data["google_place_id"] == "ChIJ123abc"

    mock_location_service.delete_location.assert_called_once_with(1)

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delete_location_not_found(client: AsyncClient, mock_location_service: AsyncMock):
    """Test DELETE /locations/{location_id} with non-existent ID returns 404."""
    mock_location_service.delete_location.side_effect = LocationNotFoundException(
        location_id=999
    )

    response = await client.delete("/locations/999")
    assert response.status_code == 404

    data = response.json()
    assert "not found" in data["message"].lower()

    mock_location_service.delete_location.assert_called_once_with(999)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method,endpoint",
    [
        ("GET", "/locations/"),
        ("GET", "/locations/1"),
        ("POST", "/locations/"),
        ("PUT", "/locations/1"),
        ("DELETE", "/locations/1"),
    ],
)
async def test_admin_authentication_required(
    unauthenticated_client: AsyncClient, method: str, endpoint: str
):
    """
    Parameterized test to verify all location routes require admin authentication.
    Tests that requests without authentication return 401 Unauthorized.
    """
    request_data = {
        "google_place_id": "ChIJ123abc",
        "warning_count": 0,
        "citation_count": 0,
    }

    if method == "GET":
        response = await unauthenticated_client.get(endpoint)
    elif method == "POST":
        response = await unauthenticated_client.post(endpoint, json=request_data)
    elif method == "PUT":
        response = await unauthenticated_client.put(endpoint, json=request_data)
    else:
        response = await unauthenticated_client.delete(endpoint)

    assert response.status_code == 401, (
        f"{method} {endpoint} should require authentication"
    )

    # Check that the response indicates authentication is required
    response_json = response.json()
    if "detail" in response_json:
        assert "not authenticated" in response_json["detail"].lower()
    else:
        # Handle different response formats
        assert response.status_code == 401
