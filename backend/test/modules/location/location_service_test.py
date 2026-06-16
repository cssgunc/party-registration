from datetime import UTC, datetime

import googlemaps
import pytest
from src.modules.location.location_base_model import AddressData
from src.modules.location.location_service import (
    GoogleMapsAPIException,
    InvalidPlaceIdException,
    LocationConflictException,
    LocationNotFoundException,
    LocationService,
    PlaceNotFoundException,
)
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils


class TestLocationServiceCRUD:
    """Tests for Location CRUD operations"""

    location_utils: LocationTestUtils
    location_service: LocationService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        location_utils: LocationTestUtils,
        location_service: LocationService,
    ):
        self.location_utils = location_utils
        self.location_service = location_service

    @pytest.mark.asyncio
    async def test_create_location(self):
        """Test creating a new location"""
        data = await self.location_utils.next_data()

        location = await self.location_service.create_location(data)

        self.location_utils.assert_matches(location, data)

    @pytest.mark.asyncio
    async def test_create_location_with_full_data(self):
        """Test creating a location with all optional fields populated"""
        data = await self.location_utils.next_data(
            unit="Apt 2B",
            hold_expiration=datetime(2025, 12, 31, 23, 59, 59, tzinfo=UTC),
        )

        location = await self.location_service.create_location(data)

        self.location_utils.assert_matches(location, data)

    @pytest.mark.asyncio
    async def test_create_location_conflict(self):
        """Test creating a location with duplicate google_place_id raises conflict exception"""
        data = await self.location_utils.next_data()
        await self.location_service.create_location(data)

        with pytest.raises(LocationConflictException):
            await self.location_service.create_location(data)

    @pytest.mark.asyncio
    async def test_get_location_by_id(self):
        """Test getting a location by its ID"""
        location = await self.location_utils.create_one()

        fetched = await self.location_service.get_location_by_id(location.id)

        self.location_utils.assert_matches(fetched, location)

    @pytest.mark.asyncio
    async def test_get_location_by_id_not_found(self):
        """Test getting a location by non-existent ID raises not found exception"""
        with pytest.raises(LocationNotFoundException):
            await self.location_service.get_location_by_id(999)

    @pytest.mark.asyncio
    async def test_get_location_by_place_id(self):
        """Test getting a location by its Google Place ID"""
        location = await self.location_utils.create_one()

        fetched = await self.location_service.get_location_by_place_id(location.google_place_id)

        self.location_utils.assert_matches(fetched, location)

    @pytest.mark.asyncio
    async def test_get_location_by_place_id_not_found(self):
        """Test getting a location by non-existent place ID raises not found exception"""
        with pytest.raises(LocationNotFoundException):
            await self.location_service.get_location_by_place_id("invalid_place_id")

    @pytest.mark.asyncio
    async def test_update_location(self):
        """Test updating a location"""
        location = await self.location_utils.create_one()
        update_data = await self.location_utils.next_data()

        updated = await self.location_service.update_location(location.id, update_data)

        self.location_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_location_not_found(self):
        """Test updating a non-existent location raises not found exception"""
        update_data = await self.location_utils.next_data()

        with pytest.raises(LocationNotFoundException):
            await self.location_service.update_location(999, update_data)

    @pytest.mark.asyncio
    async def test_update_location_conflict(self):
        """
        Test updating a location with another location's google_place_id raises conflict exception
        """
        locations = await self.location_utils.create_many(i=2)
        location1 = locations[0]
        location2 = locations[1]

        # Try to update location2 to have location1's place_id (should fail)
        conflict_data = await self.location_utils.next_data(
            google_place_id=location1.google_place_id
        )

        with pytest.raises(LocationConflictException):
            await self.location_service.update_location(location2.id, conflict_data)

    @pytest.mark.asyncio
    async def test_update_location_same_place_id(self):
        """Test updating a location with the same google_place_id works (no conflict with itself)"""
        location = await self.location_utils.create_one()

        update_data = await self.location_utils.next_data(
            google_place_id=location.google_place_id,
        )

        updated = await self.location_service.update_location(location.id, update_data)

        self.location_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_location_data_persistence(self):
        """Test that all location data fields are properly persisted"""
        data = await self.location_utils.next_data()

        await self.location_service.create_location(data)

        # Fetch from database to verify persistence
        all_locations = await self.location_utils.get_all()
        assert len(all_locations) == 1
        self.location_utils.assert_matches(all_locations[0], data)

    @pytest.mark.asyncio
    async def test_location_incidents_field_defaults_to_empty_list(self):
        """Test that Location DTO incidents field defaults to empty list."""
        data = await self.location_utils.next_data()

        created = await self.location_service.create_location(data)

        # Verify incidents field exists and is empty list
        assert hasattr(created, "incidents")
        assert created.incidents == []
        assert isinstance(created.incidents, list)

    @pytest.mark.asyncio
    async def test_location_serialization_includes_incidents(self):
        """Test that Location DTO properly serializes with incidents field."""
        data = await self.location_utils.next_data()

        created = await self.location_service.create_location(data)

        # Test model_dump includes incidents
        serialized = created.model_dump()
        assert "incidents" in serialized
        assert serialized["incidents"] == []

        # Test JSON serialization
        json_str = created.model_dump_json()
        assert "incidents" in json_str


class TestLocationServiceWithIncidents:
    """Tests for Location service with incidents relationship"""

    location_utils: LocationTestUtils
    incident_utils: IncidentTestUtils
    location_service: LocationService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        location_utils: LocationTestUtils,
        incident_utils: IncidentTestUtils,
        location_service: LocationService,
    ):
        self.location_utils = location_utils
        self.incident_utils = incident_utils
        self.location_service = location_service

    @pytest.mark.asyncio
    async def test_get_location_with_incidents(self):
        """Test getting a location that has incidents includes the incidents."""
        location = await self.location_utils.create_one()
        incident1, incident2 = await self.incident_utils.create_many(i=2, location_id=location.id)

        # Fetch the location
        fetched = await self.location_service.get_location_by_id(location.id)

        # Verify incidents are included, ordered earliest-first by incident_datetime
        assert len(fetched.incidents) == 2
        self.incident_utils.assert_matches(fetched.incidents[0], incident1)
        self.incident_utils.assert_matches(fetched.incidents[1], incident2)

    @pytest.mark.asyncio
    async def test_update_location_retains_incidents(self):
        """Test that updating a location retains its incidents."""
        location = await self.location_utils.create_one()

        # Add incidents to the location
        incident = await self.incident_utils.create_one(
            location_id=location.id,
        )

        # Update the location
        update_data = await self.location_utils.next_data(
            google_place_id=location.google_place_id,
        )

        updated = await self.location_service.update_location(location.id, update_data)

        # Verify location was updated
        self.location_utils.assert_matches(updated, update_data)

        # Verify incidents are retained
        assert len(updated.incidents) == 1
        self.incident_utils.assert_matches(updated.incidents[0], incident)


class TestLocationServiceGoogleMapsAutocomplete:
    """Tests for Google Maps autocomplete functionality"""

    gmaps_utils: GmapsMockUtils
    location_service: LocationService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        gmaps_utils: GmapsMockUtils,
        location_service: LocationService,
    ):
        self.gmaps_utils = gmaps_utils
        self.location_service = location_service

    @pytest.mark.asyncio
    async def test_autocomplete_address_success(self):
        mock_predictions = self.gmaps_utils.mock_autocomplete_predictions(count=2)

        address = "123 Main St"
        results = await self.location_service.autocomplete_address(address)

        assert len(results) == 2
        for r, p in zip(results, mock_predictions, strict=False):
            self.gmaps_utils.assert_autocomplete_matches(
                result=r,
                expected_description=p["description"],
                expected_place_id=p["place_id"],
            )

        self.gmaps_utils.mock_autocomplete.assert_called_once_with(
            self.location_service.gmaps_client,
            input_text=address,
            types="address",
            language="en",
            location=(35.9132, -79.0558),
            radius=50000,
        )

    @pytest.mark.asyncio
    async def test_autocomplete_address_empty_results(self):
        self.gmaps_utils.mock_autocomplete.return_value = []

        results = await self.location_service.autocomplete_address("nonexistent address")

        assert results == []

    @pytest.mark.asyncio
    async def test_autocomplete_address_api_error(self):
        self.gmaps_utils.mock_autocomplete_error(Exception("API Error"))

        with pytest.raises(GoogleMapsAPIException, match="Failed to autocomplete address"):
            await self.location_service.autocomplete_address("123 Main St")

    @pytest.mark.parametrize(
        "exception_type,exception_arg,error_match",
        [
            (googlemaps.exceptions.Timeout, "Timed out", "Request timed out"),
            (googlemaps.exceptions.TransportError, "Network error", "Transport error"),
        ],
    )
    @pytest.mark.asyncio
    async def test_autocomplete_googlemaps_exceptions(
        self,
        exception_type: type[Exception],
        exception_arg: str,
        error_match: str,
    ):
        """Test that googlemaps exceptions in autocomplete are properly wrapped"""
        self.gmaps_utils.mock_autocomplete_error(exception_type(exception_arg))

        with pytest.raises(GoogleMapsAPIException, match=error_match):
            await self.location_service.autocomplete_address("123 Main St")


class TestLocationServiceGoogleMapsPlaceDetails:
    """Tests for Google Maps place details functionality"""

    gmaps_utils: GmapsMockUtils
    location_service: LocationService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        gmaps_utils: GmapsMockUtils,
        location_service: LocationService,
    ):
        self.gmaps_utils = gmaps_utils
        self.location_service = location_service

    @pytest.mark.asyncio
    async def test_get_place_details_success(self):
        location_data = await self.gmaps_utils.location_utils.next_data()
        expected_address = AddressData(**location_data.model_dump())

        self.gmaps_utils.mock_place_details(**location_data.model_dump())

        result = await self.location_service.get_place_details(location_data.google_place_id)

        assert isinstance(result, AddressData)
        self.gmaps_utils.location_utils.assert_matches(result, expected_address)

        self.gmaps_utils.mock_place.assert_called_once_with(
            self.location_service.gmaps_client,
            place_id=location_data.google_place_id,
            fields=["formatted_address", "geometry", "address_component"],
        )

    @pytest.mark.asyncio
    async def test_get_place_details_not_found(self):
        self.gmaps_utils.mock_place.return_value = {}

        with pytest.raises(
            PlaceNotFoundException, match="Place with ID invalid_place_id not found"
        ):
            await self.location_service.get_place_details("invalid_place_id")

    @pytest.mark.asyncio
    async def test_get_place_details_api_error(self):
        self.gmaps_utils.mock_place_error(Exception("API Error"))

        with pytest.raises(GoogleMapsAPIException, match="Failed to get place details"):
            await self.location_service.get_place_details("ChIJ123abc")

    @pytest.mark.parametrize(
        "api_status,expected_exception,error_match",
        [
            ("NOT_FOUND", PlaceNotFoundException, "Place with ID.*not found"),
            ("INVALID_REQUEST", InvalidPlaceIdException, "Invalid place ID"),
            ("OVER_QUERY_LIMIT", GoogleMapsAPIException, "API error.*OVER_QUERY_LIMIT"),
        ],
    )
    @pytest.mark.asyncio
    async def test_get_place_details_api_error_statuses(
        self,
        api_status: str,
        expected_exception: type[Exception],
        error_match: str,
    ):
        """Test that Google Maps API error statuses raise appropriate exceptions"""
        api_error = googlemaps.exceptions.ApiError(api_status)
        self.gmaps_utils.mock_place_error(api_error, error_status=api_status)

        with pytest.raises(expected_exception, match=error_match):
            await self.location_service.get_place_details("ChIJ123abc")

    @pytest.mark.asyncio
    async def test_get_place_details_missing_components(self):
        # Create mock response with empty address components
        mock_place_result = {
            "result": {
                "formatted_address": "Somewhere",
                "geometry": {"location": {"lat": 0.0, "lng": 0.0}},
                "address_components": [],
            }
        }

        self.gmaps_utils.mock_place.return_value = mock_place_result

        result = await self.location_service.get_place_details("ChIJ123abc")

        assert isinstance(result, AddressData)
        expected_data = AddressData(
            google_place_id="ChIJ123abc",
            formatted_address="Somewhere",
            latitude=0.0,
            longitude=0.0,
            street_number=None,
            street_name=None,
            unit=None,
            city=None,
            county=None,
            state=None,
            country=None,
            zip_code=None,
        )
        self.gmaps_utils.location_utils.assert_matches(result, expected_data)

    @pytest.mark.asyncio
    async def test_get_place_details_missing_geometry(self):
        mock_place_result = {
            "result": {
                "formatted_address": "Somewhere",
                "geometry": {},
                "address_components": [],
            }
        }

        self.gmaps_utils.mock_place.return_value = mock_place_result

        with pytest.raises(GoogleMapsAPIException, match="No geometry data found"):
            await self.location_service.get_place_details("ChIJ123abc")

    @pytest.mark.parametrize(
        "exception_type,exception_arg,error_match",
        [
            (googlemaps.exceptions.Timeout, "Request timed out", "Request timed out"),
            (googlemaps.exceptions.HTTPError, 500, "HTTP error"),
            (googlemaps.exceptions.TransportError, "Connection failed", "Transport error"),
        ],
    )
    @pytest.mark.asyncio
    async def test_get_place_details_googlemaps_exceptions(
        self,
        exception_type: type[Exception],
        exception_arg: str | int,
        error_match: str,
    ):
        """Test that googlemaps exceptions are properly wrapped in GoogleMapsAPIException"""
        self.gmaps_utils.mock_place_error(exception_type(exception_arg))

        with pytest.raises(GoogleMapsAPIException, match=error_match):
            await self.location_service.get_place_details("ChIJ123abc")
