from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from src.modules.incident.incident_model import IncidentSeverity
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import LocationTestUtils
from test.utils.http.test_templates import (
    assert_excel_response,
    generate_auth_required_tests,
    generate_csv_empty_test,
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

        response = await self.staff_client.get("/api/incidents/csv?severity=in_person_warning")
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
        # "in_person_warning" < "remote_warning" alphabetically
        assert rows[1][0] == "In Person Warning"
        assert rows[2][0] == "Remote Warning"
