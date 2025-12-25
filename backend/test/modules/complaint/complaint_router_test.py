from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from src.modules.complaint.complaint_model import Complaint
from src.modules.complaint.complaint_service import ComplaintNotFoundException
from test.modules.complaint.complaint_utils import ComplaintTestUtils
from test.modules.location.location_utils import LocationTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import generate_auth_required_tests

test_complaint_authentication = generate_auth_required_tests(
    ({"admin", "staff"}, "GET", "/api/locations/1/complaints", None),
    (
        {"admin"},
        "POST",
        "/api/locations/1/complaints",
        ComplaintTestUtils.get_sample_data(),
    ),
    (
        {"admin"},
        "PUT",
        "/api/locations/1/complaints/1",
        ComplaintTestUtils.get_sample_data(),
    ),
    ({"admin"}, "DELETE", "/api/locations/1/complaints/1", None),
)


class TestComplaintRouter:
    """Tests for complaint CRUD operations."""

    admin_client: AsyncClient
    complaint_utils: ComplaintTestUtils
    location_utils: LocationTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        complaint_utils: ComplaintTestUtils,
        location_utils: LocationTestUtils,
        admin_client: AsyncClient,
    ):
        self.complaint_utils = complaint_utils
        self.location_utils = location_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_get_complaints_by_location_success(self) -> None:
        """Test successfully getting all complaints for a location."""
        location = await self.location_utils.create_one()
        complaints = await self.complaint_utils.create_many(i=2, location_id=location.id)

        response = await self.admin_client.get(f"/api/locations/{location.id}/complaints")
        data = assert_res_success(response, list[Complaint])

        assert len(data) == 2
        data_by_id = {complaint.id: complaint for complaint in data}
        for complaint in complaints:
            assert complaint.id in data_by_id
            self.complaint_utils.assert_matches(complaint, data_by_id[complaint.id])

    @pytest.mark.asyncio
    async def test_get_complaints_by_location_empty(self) -> None:
        """Test getting complaints for a location with no complaints."""
        location = await self.location_utils.create_one()

        response = await self.admin_client.get(f"/api/locations/{location.id}/complaints")
        data = assert_res_success(response, list[Complaint])

        assert data == []

    @pytest.mark.asyncio
    async def test_create_complaint_success(self) -> None:
        """Test successfully creating a complaint."""
        location = await self.location_utils.create_one()
        complaint_data = await self.complaint_utils.next_data(location_id=location.id)

        response = await self.admin_client.post(
            f"/api/locations/{location.id}/complaints",
            json=complaint_data.model_dump(mode="json"),
        )
        data = assert_res_success(response, Complaint, status=201)

        self.complaint_utils.assert_matches(complaint_data, data)

    @pytest.mark.asyncio
    async def test_create_complaint_with_empty_description(self) -> None:
        """Test creating a complaint with empty description."""
        location = await self.location_utils.create_one()
        complaint_data = await self.complaint_utils.next_data(
            location_id=location.id, description=""
        )

        response = await self.admin_client.post(
            f"/api/locations/{location.id}/complaints",
            json=complaint_data.model_dump(mode="json"),
        )
        data = assert_res_success(response, Complaint, status=201)

        assert data.description == ""

    @pytest.mark.asyncio
    async def test_create_complaint_location_id_required(self) -> None:
        """Test creating a complaint without location_id fails validation."""
        location = await self.location_utils.create_one()
        complaint_data = {
            "complaint_datetime": "2025-11-18T20:30:00",
            "description": "Noise complaint",
        }

        response = await self.admin_client.post(
            f"/api/locations/{location.id}/complaints", json=complaint_data
        )

        assert_res_validation_error(response, expected_fields=["location_id"])

    @pytest.mark.asyncio
    async def test_update_complaint_success(self) -> None:
        """Test successfully updating a complaint."""
        complaint = await self.complaint_utils.create_one()
        update_data = await self.complaint_utils.next_data(
            location_id=complaint.location_id,
            complaint_datetime=datetime(2025, 11, 20, 23, 0, 0, tzinfo=timezone.utc),
            description="Updated description",
        )

        response = await self.admin_client.put(
            f"/api/locations/{complaint.location_id}/complaints/{complaint.id}",
            json=update_data.model_dump(mode="json"),
        )
        data = assert_res_success(response, Complaint)

        assert data.id == complaint.id
        self.complaint_utils.assert_matches(update_data, data)

    @pytest.mark.asyncio
    async def test_update_complaint_not_found(self) -> None:
        """Test updating a non-existent complaint."""
        location = await self.location_utils.create_one()
        update_data = await self.complaint_utils.next_data(location_id=location.id)

        response = await self.admin_client.put(
            f"/api/locations/{location.id}/complaints/999",
            json=update_data.model_dump(mode="json"),
        )

        assert_res_failure(response, ComplaintNotFoundException(999))

    @pytest.mark.asyncio
    async def test_update_complaint_location_id_required(self) -> None:
        """Test updating a complaint without location_id fails validation."""
        complaint = await self.complaint_utils.create_one()
        update_data = {
            "complaint_datetime": "2025-11-20T23:00:00",
            "description": "Updated description",
        }

        response = await self.admin_client.put(
            f"/api/locations/{complaint.location_id}/complaints/{complaint.id}",
            json=update_data,
        )

        assert_res_validation_error(response, expected_fields=["location_id"])

    @pytest.mark.asyncio
    async def test_delete_complaint_success(self) -> None:
        """Test successfully deleting a complaint."""
        complaint = await self.complaint_utils.create_one()

        response = await self.admin_client.delete(
            f"/api/locations/{complaint.location_id}/complaints/{complaint.id}"
        )
        data = assert_res_success(response, Complaint)

        self.complaint_utils.assert_matches(complaint, data)

    @pytest.mark.asyncio
    async def test_delete_complaint_not_found(self) -> None:
        """Test deleting a non-existent complaint."""
        location = await self.location_utils.create_one()

        response = await self.admin_client.delete(f"/api/locations/{location.id}/complaints/999")

        assert_res_failure(response, ComplaintNotFoundException(999))
