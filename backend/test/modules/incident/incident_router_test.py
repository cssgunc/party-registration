from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from src.modules.incident.incident_model import IncidentDto, IncidentSeverity
from src.modules.incident.incident_service import IncidentNotFoundException
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import LocationTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import generate_auth_required_tests

test_incident_authentication = generate_auth_required_tests(
    ({"admin", "staff", "police"}, "GET", "/api/locations/1/incidents", None),
    (
        {"admin", "police"},
        "POST",
        "/api/locations/1/incidents",
        IncidentTestUtils.get_sample_create_data(),
    ),
    (
        {"admin", "police"},
        "PUT",
        "/api/locations/1/incidents/1",
        IncidentTestUtils.get_sample_create_data(),
    ),
    ({"admin", "police"}, "DELETE", "/api/locations/1/incidents/1", None),
)


class TestIncidentRouter:
    """Tests for incident CRUD operations."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils
    location_utils: LocationTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        incident_utils: IncidentTestUtils,
        location_utils: LocationTestUtils,
        admin_client: AsyncClient,
    ):
        self.incident_utils = incident_utils
        self.location_utils = location_utils
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
        """Test successfully creating an incident."""
        location = await self.location_utils.create_one()
        incident_data = await self.incident_utils.next_data(location_id=location.id)
        # Exclude location_id from request body (it comes from path)
        request_body = {
            k: v for k, v in incident_data.model_dump(mode="json").items() if k != "location_id"
        }

        response = await self.admin_client.post(
            f"/api/locations/{location.id}/incidents",
            json=request_body,
        )
        data = assert_res_success(response, IncidentDto, status=201)

        self.incident_utils.assert_matches(incident_data, data)

    @pytest.mark.asyncio
    async def test_create_incident_with_severity(self) -> None:
        """Test creating incidents with different severity levels."""
        location = await self.location_utils.create_one()

        for severity in IncidentSeverity:
            incident_data = await self.incident_utils.next_data(
                location_id=location.id, severity=severity
            )
            request_body = {
                k: v for k, v in incident_data.model_dump(mode="json").items() if k != "location_id"
            }

            response = await self.admin_client.post(
                f"/api/locations/{location.id}/incidents",
                json=request_body,
            )
            data = assert_res_success(response, IncidentDto, status=201)

            assert data.severity == severity

    @pytest.mark.asyncio
    async def test_create_incident_with_empty_description(self) -> None:
        """Test creating an incident with empty description."""
        location = await self.location_utils.create_one()
        incident_data = await self.incident_utils.next_data(location_id=location.id, description="")
        request_body = {
            k: v for k, v in incident_data.model_dump(mode="json").items() if k != "location_id"
        }

        response = await self.admin_client.post(
            f"/api/locations/{location.id}/incidents",
            json=request_body,
        )
        data = assert_res_success(response, IncidentDto, status=201)

        assert data.description == ""

    @pytest.mark.asyncio
    async def test_create_incident_severity_required(self) -> None:
        """Test creating an incident without severity fails validation."""
        location = await self.location_utils.create_one()
        incident_data = {
            "incident_datetime": "2025-11-18T20:30:00Z",
            "description": "Noise incident",
        }

        response = await self.admin_client.post(
            f"/api/locations/{location.id}/incidents", json=incident_data
        )

        assert_res_validation_error(response, expected_fields=["severity"])

    @pytest.mark.asyncio
    async def test_update_incident_success(self) -> None:
        """Test successfully updating an incident."""
        incident = await self.incident_utils.create_one()
        update_data = await self.incident_utils.next_data(
            location_id=incident.location_id,
            incident_datetime=datetime(2025, 11, 20, 23, 0, 0, tzinfo=UTC),
            description="Updated description",
            severity=IncidentSeverity.WARNING,
        )
        request_body = {
            k: v for k, v in update_data.model_dump(mode="json").items() if k != "location_id"
        }

        response = await self.admin_client.put(
            f"/api/locations/{incident.location_id}/incidents/{incident.id}",
            json=request_body,
        )
        data = assert_res_success(response, IncidentDto)

        assert data.id == incident.id
        self.incident_utils.assert_matches(update_data, data)

    @pytest.mark.asyncio
    async def test_update_incident_not_found(self) -> None:
        """Test updating a non-existent incident."""
        location = await self.location_utils.create_one()
        update_data = await self.incident_utils.next_data(location_id=location.id)
        request_body = {
            k: v for k, v in update_data.model_dump(mode="json").items() if k != "location_id"
        }

        response = await self.admin_client.put(
            f"/api/locations/{location.id}/incidents/999",
            json=request_body,
        )

        assert_res_failure(response, IncidentNotFoundException(999))

    @pytest.mark.asyncio
    async def test_delete_incident_success(self) -> None:
        """Test successfully deleting an incident."""
        incident = await self.incident_utils.create_one()

        response = await self.admin_client.delete(
            f"/api/locations/{incident.location_id}/incidents/{incident.id}"
        )
        data = assert_res_success(response, IncidentDto)

        self.incident_utils.assert_matches(incident, data)

    @pytest.mark.asyncio
    async def test_delete_incident_not_found(self) -> None:
        """Test deleting a non-existent incident."""
        location = await self.location_utils.create_one()

        response = await self.admin_client.delete(f"/api/locations/{location.id}/incidents/999")

        assert_res_failure(response, IncidentNotFoundException(999))
