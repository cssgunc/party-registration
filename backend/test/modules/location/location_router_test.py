import googlemaps.exceptions
import pytest
import pytest_asyncio
from httpx import AsyncClient
from src.core.exceptions import InternalServerException
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_model import AutocompleteResult, LocationDto
from src.modules.location.location_service import (
    LocationConflictException,
    LocationNotFoundException,
)
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils
from test.utils.http.assertions import assert_res_failure, assert_res_paginated, assert_res_success
from test.utils.http.test_templates import generate_auth_required_tests

test_location_authentication = generate_auth_required_tests(
    ({"admin", "staff"}, "GET", "/api/locations/", None),
    ({"admin"}, "POST", "/api/locations/", {"google_place_id": "ChIJ123abc"}),
    ({"admin", "staff"}, "GET", "/api/locations/1", None),
    ({"admin"}, "PUT", "/api/locations/1", {"google_place_id": "ChIJ123abc"}),
    ({"admin"}, "DELETE", "/api/locations/1", None),
    (
        {"admin", "staff", "student", "police"},
        "POST",
        "/api/locations/autocomplete",
        {"address": "123 Main St"},
    ),
)


@pytest_asyncio.fixture
async def sample_locations(location_utils: LocationTestUtils) -> list[LocationEntity]:
    """Create sample locations for testing."""
    return await location_utils.create_many(i=3)


class TestLocationListRouter:
    """Tests for GET /api/locations/ endpoint."""

    admin_client: AsyncClient
    staff_client: AsyncClient
    location_utils: LocationTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        location_utils: LocationTestUtils,
        admin_client: AsyncClient,
        staff_client: AsyncClient,
    ):
        self.location_utils = location_utils
        self.admin_client = admin_client
        self.staff_client = staff_client

    @pytest.mark.asyncio
    async def test_list_locations_empty(self):
        """Test listing locations when database is empty."""
        response = await self.staff_client.get("/api/locations/")

        paginated = assert_res_paginated(
            response, LocationDto, total_records=0, page_size=0, total_pages=1
        )
        assert paginated.items == []

    @pytest.mark.asyncio
    async def test_list_locations_with_data(self, sample_locations: list[LocationEntity]):
        """Test listing locations when multiple locations exist."""
        response = await self.staff_client.get("/api/locations/")

        paginated = assert_res_paginated(
            response, LocationDto, total_records=3, page_size=3, total_pages=1
        )
        assert len(paginated.items) == 3

        data_by_id = {loc.id: loc for loc in paginated.items}
        for entity in sample_locations:
            assert entity.id in data_by_id
            self.location_utils.assert_matches(entity, data_by_id[entity.id])


class TestLocationCRUDRouter:
    """Tests for CRUD operations on /api/locations/ endpoints."""

    admin_client: AsyncClient
    staff_client: AsyncClient
    location_utils: LocationTestUtils
    gmaps_utils: GmapsMockUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        location_utils: LocationTestUtils,
        gmaps_utils: GmapsMockUtils,
        admin_client: AsyncClient,
        staff_client: AsyncClient,
    ):
        self.location_utils = location_utils
        self.gmaps_utils = gmaps_utils
        self.admin_client = admin_client
        self.staff_client = staff_client

    @pytest.mark.asyncio
    async def test_get_location_by_id_success(self):
        """Test getting a location by ID successfully."""
        location = await self.location_utils.create_one()

        response = await self.staff_client.get(f"/api/locations/{location.id}")
        data = assert_res_success(response, LocationDto)

        self.location_utils.assert_matches(location, data)

    @pytest.mark.asyncio
    async def test_get_location_by_id_not_found(self):
        """Test getting a non-existent location."""
        response = await self.staff_client.get("/api/locations/999")
        assert_res_failure(response, LocationNotFoundException(999))

    @pytest.mark.asyncio
    async def test_create_location_success(self):
        """Test successfully creating a location."""
        location_data = await self.location_utils.next_data()

        self.gmaps_utils.mock_place_details(**location_data.model_dump())

        request_data = location_data.model_dump(
            mode="json",
            include={"google_place_id", "hold_expiration"},
        )

        response = await self.admin_client.post("/api/locations/", json=request_data)
        data = assert_res_success(response, LocationDto, status=201)

        self.location_utils.assert_matches(location_data, data)

    @pytest.mark.asyncio
    async def test_create_location_duplicate_place_id(self):
        """Test creating a location with duplicate google_place_id."""
        location = await self.location_utils.create_one()
        location_data = await self.location_utils.next_data(
            google_place_id=location.google_place_id
        )

        self.gmaps_utils.mock_place_details(**location_data.model_dump())

        request_data = location_data.model_dump(
            mode="json",
            include={"google_place_id", "hold_expiration"},
        )

        response = await self.admin_client.post("/api/locations/", json=request_data)
        assert_res_failure(response, LocationConflictException(location.google_place_id))

    @pytest.mark.asyncio
    async def test_update_location_success(self):
        """Test successfully updating a location."""
        location = await self.location_utils.create_one()
        update_data = await self.location_utils.next_data(
            google_place_id=location.google_place_id,  # Keep same place_id
        )

        request_data = update_data.model_dump(
            mode="json",
            include={"google_place_id", "hold_expiration"},
        )

        response = await self.admin_client.put(f"/api/locations/{location.id}", json=request_data)
        data = assert_res_success(response, LocationDto)

        assert data.id == location.id
        # When place_id unchanged, address data stays the same, only expiration can update
        assert data.google_place_id == location.google_place_id
        assert data.hold_expiration is None

    @pytest.mark.asyncio
    async def test_update_location_not_found(self):
        """Test updating a non-existent location."""
        update_data = await self.location_utils.next_data()

        request_data = update_data.model_dump(
            mode="json",
            include={"google_place_id", "hold_expiration"},
        )

        response = await self.admin_client.put("/api/locations/999", json=request_data)
        assert_res_failure(response, LocationNotFoundException(999))

    @pytest.mark.asyncio
    async def test_update_location_duplicate_place_id(self):
        """Test updating location with another location's google_place_id."""
        locations = await self.location_utils.create_many(i=2)
        update_data = await self.location_utils.next_data(
            google_place_id=locations[0].google_place_id
        )

        self.gmaps_utils.mock_place_details(**update_data.model_dump())

        request_data = update_data.model_dump(
            mode="json",
            include={"google_place_id", "hold_expiration"},
        )

        response = await self.admin_client.put(
            f"/api/locations/{locations[1].id}", json=request_data
        )
        assert_res_failure(response, LocationConflictException(locations[0].google_place_id))

    @pytest.mark.asyncio
    async def test_delete_location_success(self):
        """Test successfully deleting a location."""
        location = await self.location_utils.create_one()

        response = await self.admin_client.delete(f"/api/locations/{location.id}")
        data = assert_res_success(response, LocationDto)

        self.location_utils.assert_matches(location, data)

        # Verify deletion
        locations = await self.location_utils.get_all()
        assert len(locations) == 0

    @pytest.mark.asyncio
    async def test_delete_location_not_found(self):
        """Test deleting a non-existent location."""
        response = await self.admin_client.delete("/api/locations/999")
        assert_res_failure(response, LocationNotFoundException(999))


class TestLocationAutocompleteRouter:
    """Tests for autocomplete endpoint."""

    admin_client: AsyncClient
    gmaps_utils: GmapsMockUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        admin_client: AsyncClient,
        gmaps_utils: GmapsMockUtils,
    ):
        self.admin_client = admin_client
        self.gmaps_utils = gmaps_utils

    @pytest.mark.asyncio
    async def test_autocomplete_success(self):
        """Test that the endpoint returns multiple address suggestions successfully"""
        # Generate mock predictions
        mock_predictions = self.gmaps_utils.mock_autocomplete_predictions(count=2)

        response = await self.admin_client.post(
            "/api/locations/autocomplete", json={"address": "123 Main St"}
        )

        data = assert_res_success(response, list[AutocompleteResult])
        assert len(data) == 2

        # Verify predictions match expected values
        for i, prediction in enumerate(mock_predictions):
            expected = AutocompleteResult(
                formatted_address=prediction["description"],
                google_place_id=prediction["place_id"],
            )
            self.gmaps_utils.location_utils.assert_matches(data[i], expected)

    @pytest.mark.asyncio
    async def test_autocomplete_empty_results(self):
        """Test that the endpoint returns an empty list when no addresses match"""
        self.gmaps_utils.mock_autocomplete.return_value = []

        response = await self.admin_client.post(
            "/api/locations/autocomplete",
            json={"address": "nonexistentaddress12345xyz"},
        )

        data = assert_res_success(response, list[AutocompleteResult])
        assert data == []

    @pytest.mark.asyncio
    async def test_autocomplete_missing_address(self):
        """Test that the endpoint returns 422 when address field is missing"""
        response = await self.admin_client.post("/api/locations/autocomplete", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_autocomplete_empty_string(self):
        """Test that the endpoint handles empty string gracefully"""
        self.gmaps_utils.mock_autocomplete.return_value = []

        response = await self.admin_client.post("/api/locations/autocomplete", json={"address": ""})

        data = assert_res_success(response, list[AutocompleteResult])
        assert data == []

    @pytest.mark.asyncio
    async def test_autocomplete_api_exception(self):
        """Test that API exceptions are handled correctly"""
        self.gmaps_utils.mock_autocomplete_error(googlemaps.exceptions.ApiError("REQUEST_DENIED"))

        response = await self.admin_client.post(
            "/api/locations/autocomplete",
            json={"address": "123 Test St"},
        )

        assert_res_failure(
            response,
            InternalServerException("Failed to fetch address suggestions. Please try again later."),
        )
