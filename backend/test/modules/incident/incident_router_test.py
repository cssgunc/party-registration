from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from src.modules.incident.incident_model import IncidentDto, IncidentSeverity
from src.modules.incident.incident_service import IncidentNotFoundException
from src.modules.location.location_service import PlaceNotFoundException
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import (
    assert_excel_response,
    generate_auth_required_tests,
    generate_csv_empty_test,
)

test_incident_authentication = generate_auth_required_tests(
    ({"admin", "staff", "officer", "police_admin"}, "GET", "/api/incidents", None),
    (
        {"admin", "staff", "officer", "police_admin"},
        "GET",
        "/api/locations/1/incidents",
        None,
    ),
    (
        {"admin", "officer", "police_admin"},
        "POST",
        "/api/incidents",
        IncidentTestUtils.get_sample_create_data(),
    ),
    (
        {"admin", "officer", "police_admin"},
        "PUT",
        "/api/incidents/1",
        IncidentTestUtils.get_sample_update_data(),
    ),
    ({"admin", "officer", "police_admin"}, "DELETE", "/api/incidents/1", None),
)

INCIDENT_HEADERS = ("Severity", "Address", "Date", "Time", "Description", "Reference ID")

test_incident_csv_authentication = generate_auth_required_tests(
    ({"admin", "staff", "officer", "police_admin"}, "GET", "/api/incidents/csv", None),
)

test_incident_csv_empty = generate_csv_empty_test(
    "staff",
    "/api/incidents/csv",
    INCIDENT_HEADERS,
)


class TestIncidentRouter:
    """Tests for incident CRUD operations."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils
    location_utils: LocationTestUtils
    gmaps_utils: GmapsMockUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        incident_utils: IncidentTestUtils,
        location_utils: LocationTestUtils,
        gmaps_utils: GmapsMockUtils,
        admin_client: AsyncClient,
    ):
        self.incident_utils = incident_utils
        self.location_utils = location_utils
        self.gmaps_utils = gmaps_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_get_incidents_by_location_success(self) -> None:
        """Test successfully getting all incidents for a location."""
        location = await self.location_utils.create_one()
        incidents = await self.incident_utils.create_many(i=2, location_id=location.id)

        response = await self.admin_client.get(f"/api/locations/{location.id}/incidents")
        data = assert_res_success(response, list[IncidentDto])

        assert len(data) == 2
        data_by_id = {incident.id: incident for incident in data}
        for incident in incidents:
            assert incident.id in data_by_id
            self.incident_utils.assert_matches(incident, data_by_id[incident.id])

    @pytest.mark.asyncio
    async def test_get_incidents_by_location_empty(self) -> None:
        """Test getting incidents for a location with no incidents."""
        location = await self.location_utils.create_one()

        response = await self.admin_client.get(f"/api/locations/{location.id}/incidents")
        data = assert_res_success(response, list[IncidentDto])

        assert data == []

    @pytest.mark.asyncio
    async def test_create_incident_success(self) -> None:
        """Test successfully creating an incident linked to an existing location."""
        location = await self.location_utils.create_one()
        create_dto = await self.incident_utils.next_create_dto(
            location_place_id=location.google_place_id
        )

        response = await self.admin_client.post(
            "/api/incidents", json=create_dto.model_dump(mode="json")
        )
        data = assert_res_success(response, IncidentDto, status=201)

        self.incident_utils.assert_matches(data, create_dto)

    @pytest.mark.asyncio
    async def test_create_incident_auto_creates_location(self) -> None:
        """Test creating an incident with a place ID not in DB auto-creates the location."""
        location_data = await self.location_utils.next_data()
        self.gmaps_utils.mock_place_details(**location_data.model_dump())

        create_dto = await self.incident_utils.next_create_dto(
            location_place_id=location_data.google_place_id
        )

        response = await self.admin_client.post(
            "/api/incidents", json=create_dto.model_dump(mode="json")
        )
        data = assert_res_success(response, IncidentDto, status=201)

        all_locations = await self.location_utils.get_all()
        created_location = next((loc for loc in all_locations if loc.id == data.location_id), None)
        assert created_location is not None
        assert created_location.google_place_id == location_data.google_place_id

    @pytest.mark.asyncio
    async def test_create_incident_place_not_found(self) -> None:
        """Test creating an incident with an invalid place ID returns 404."""
        self.gmaps_utils.mock_place.return_value = {}  # No "result" key → PlaceNotFoundException

        create_dto = await self.incident_utils.next_create_dto(location_place_id="invalid-place-id")
        response = await self.admin_client.post(
            "/api/incidents", json=create_dto.model_dump(mode="json")
        )

        assert_res_failure(response, PlaceNotFoundException("invalid-place-id"))

    @pytest.mark.asyncio
    async def test_create_incident_with_severity(self) -> None:
        """Test creating incidents with different severity levels."""
        location = await self.location_utils.create_one()

        for severity in [sev.value for sev in IncidentSeverity]:
            create_dto = await self.incident_utils.next_create_dto(
                location_place_id=location.google_place_id, severity=severity
            )
            response = await self.admin_client.post(
                "/api/incidents", json=create_dto.model_dump(mode="json")
            )
            data = assert_res_success(response, IncidentDto, status=201)

            assert data.severity.value == severity

    @pytest.mark.asyncio
    async def test_create_incident_with_reference_id(self) -> None:
        """Test creating an incident with a reference_id."""
        location = await self.location_utils.create_one()
        create_dto = await self.incident_utils.next_create_dto(
            location_place_id=location.google_place_id,
            reference_id="CAD-2468",
        )

        response = await self.admin_client.post(
            "/api/incidents", json=create_dto.model_dump(mode="json")
        )
        data = assert_res_success(response, IncidentDto, status=201)

        assert data.reference_id == "CAD-2468"

    @pytest.mark.asyncio
    async def test_create_incident_reference_id_defaults_none(self) -> None:
        """Test creating an incident defaults reference_id to None."""
        location = await self.location_utils.create_one()
        create_dto = await self.incident_utils.next_create_dto(
            location_place_id=location.google_place_id,
            reference_id=None,
        )

        response = await self.admin_client.post(
            "/api/incidents", json=create_dto.model_dump(mode="json")
        )
        data = assert_res_success(response, IncidentDto, status=201)

        assert data.reference_id is None

    @pytest.mark.asyncio
    async def test_create_incident_with_empty_description(self) -> None:
        """Test creating an incident with empty description."""
        location = await self.location_utils.create_one()
        create_dto = await self.incident_utils.next_create_dto(
            location_place_id=location.google_place_id, description=""
        )

        response = await self.admin_client.post(
            "/api/incidents", json=create_dto.model_dump(mode="json")
        )
        data = assert_res_success(response, IncidentDto, status=201)

        assert data.description == ""

    @pytest.mark.asyncio
    async def test_create_incident_severity_required(self) -> None:
        """Test creating an incident without severity fails validation."""
        location = await self.location_utils.create_one()
        request_body = {
            **IncidentTestUtils.get_sample_create_data(),
            "location_place_id": location.google_place_id,
        }
        del request_body["severity"]

        response = await self.admin_client.post("/api/incidents", json=request_body)

        assert_res_validation_error(response, expected_fields=["severity"])

    @pytest.mark.asyncio
    async def test_create_incident_empty_place_id(self) -> None:
        """Test creating an incident with empty place ID fails validation."""
        request_body = {**IncidentTestUtils.get_sample_create_data(), "location_place_id": ""}

        response = await self.admin_client.post("/api/incidents", json=request_body)

        assert_res_validation_error(response, expected_fields=["location_place_id"])

    @pytest.mark.asyncio
    async def test_update_incident_success(self) -> None:
        """Test successfully updating an incident."""
        incident = await self.incident_utils.create_one()
        update_dto = await self.incident_utils.next_update_dto(
            description="Updated description",
            severity="in_person_warning",
            reference_id="CAD-UPDATE-1",
        )

        response = await self.admin_client.put(
            f"/api/incidents/{incident.id}",
            json=update_dto.model_dump(mode="json"),
        )
        data = assert_res_success(response, IncidentDto)

        assert data.id == incident.id
        self.incident_utils.assert_matches(data, update_dto)
        assert data.severity.value == "in_person_warning"
        assert data.reference_id == "CAD-UPDATE-1"

    @pytest.mark.asyncio
    async def test_update_incident_requires_location_place_id(self) -> None:
        """Test updating an incident requires location_place_id."""
        incident = await self.incident_utils.create_one()
        request_body = IncidentTestUtils.get_sample_update_data()
        del request_body["location_place_id"]

        response = await self.admin_client.put(f"/api/incidents/{incident.id}", json=request_body)

        assert_res_validation_error(response, expected_fields=["location_place_id"])

    @pytest.mark.asyncio
    async def test_update_incident_can_change_location(self) -> None:
        """Test updating an incident can change location via location_place_id."""
        original_location = await self.location_utils.create_one()
        incident = await self.incident_utils.create_one(location_id=original_location.id)

        updated_location_data = await self.location_utils.next_data()
        self.gmaps_utils.mock_place_details(**updated_location_data.model_dump())

        update_dto = await self.incident_utils.next_update_dto(
            location_place_id=updated_location_data.google_place_id
        )
        response = await self.admin_client.put(
            f"/api/incidents/{incident.id}",
            json=update_dto.model_dump(mode="json"),
        )
        data = assert_res_success(response, IncidentDto)

        assert data.location_id != original_location.id

    @pytest.mark.asyncio
    async def test_update_incident_can_clear_reference_id(self) -> None:
        """Test updating an incident can clear reference_id to null."""
        incident = await self.incident_utils.create_one(reference_id="CAD-CLEAR")

        update_dto = await self.incident_utils.next_update_dto(
            reference_id=None,
        )
        response = await self.admin_client.put(
            f"/api/incidents/{incident.id}",
            json=update_dto.model_dump(mode="json"),
        )
        data = assert_res_success(response, IncidentDto)

        assert data.reference_id is None

    @pytest.mark.asyncio
    async def test_update_incident_not_found(self) -> None:
        """Test updating a non-existent incident."""
        update_dto = await self.incident_utils.next_update_dto()

        response = await self.admin_client.put(
            "/api/incidents/999", json=update_dto.model_dump(mode="json")
        )

        assert_res_failure(response, IncidentNotFoundException(999))

    @pytest.mark.asyncio
    async def test_delete_incident_success(self) -> None:
        """Test successfully deleting an incident."""
        incident = await self.incident_utils.create_one()

        response = await self.admin_client.delete(f"/api/incidents/{incident.id}")
        data = assert_res_success(response, IncidentDto)

        self.incident_utils.assert_matches(incident, data)

    @pytest.mark.asyncio
    async def test_delete_incident_not_found(self) -> None:
        """Test deleting a non-existent incident."""
        response = await self.admin_client.delete("/api/incidents/999")

        assert_res_failure(response, IncidentNotFoundException(999))


class TestIncidentCSVRouter:
    """Tests for GET /api/incidents/csv endpoint."""

    staff_client: AsyncClient
    incident_utils: IncidentTestUtils
    location_utils: LocationTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        staff_client: AsyncClient,
        incident_utils: IncidentTestUtils,
        location_utils: LocationTestUtils,
    ):
        self.staff_client = staff_client
        self.incident_utils = incident_utils
        self.location_utils = location_utils

    @pytest.mark.asyncio
    async def test_get_incidents_csv_with_data(self):
        """Test Excel export with incidents returns correct data rows."""
        location = await self.location_utils.create_one()
        await self.incident_utils.create_one(
            location_id=location.id,
            severity=IncidentSeverity.IN_PERSON_WARNING,
            incident_datetime=datetime(2026, 3, 15, 14, 30, 0, tzinfo=UTC),
            description="Test incident description",
        )

        response = await self.staff_client.get("/api/incidents/csv")
        rows = assert_excel_response(response, INCIDENT_HEADERS, expected_row_count=2)

        data_row = rows[1]
        assert data_row[0] == "In Person Warning"
        assert data_row[1] == location.formatted_address
        assert data_row[2] == "2026-03-15"
        assert data_row[3] == "2:30 PM"
        assert data_row[4] == "Test incident description"

    @pytest.mark.asyncio
    async def test_get_incidents_csv_filter_by_severity(self):
        """CSV endpoint respects severity filter query param."""
        location = await self.location_utils.create_one()
        await self.incident_utils.create_one(
            location_id=location.id, severity=IncidentSeverity.IN_PERSON_WARNING
        )
        await self.incident_utils.create_one(
            location_id=location.id, severity=IncidentSeverity.REMOTE_WARNING
        )

        response = await self.staff_client.get("/api/incidents/csv?severity_eq=in_person_warning")
        rows = assert_excel_response(response, INCIDENT_HEADERS, expected_row_count=2)
        assert rows[1][0] == "In Person Warning"

    @pytest.mark.asyncio
    async def test_get_incidents_csv_sort_by_severity(self):
        """CSV endpoint respects sort_by query param."""
        location = await self.location_utils.create_one()
        await self.incident_utils.create_one(
            location_id=location.id, severity=IncidentSeverity.IN_PERSON_WARNING
        )
        await self.incident_utils.create_one(
            location_id=location.id, severity=IncidentSeverity.REMOTE_WARNING
        )

        response = await self.staff_client.get("/api/incidents/csv?sort_by=severity&sort_order=asc")
        rows = assert_excel_response(response, INCIDENT_HEADERS, expected_row_count=3)
        assert rows[1][0] == "In Person Warning"
        assert rows[2][0] == "Remote Warning"
