from datetime import UTC, datetime
from io import BytesIO

import openpyxl
import pytest
from httpx import AsyncClient
from src.modules.incident.incident_model import IncidentSeverity
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import LocationTestUtils
from test.utils.http.test_templates import generate_auth_required_tests

test_incident_csv_authentication = generate_auth_required_tests(
    ({"admin", "staff", "police"}, "GET", "/api/incidents/csv", None),
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
    async def test_get_incidents_csv_empty(self):
        """Test Excel export with no incidents returns header row only."""
        response = await self.staff_client.get("/api/incidents/csv")
        assert response.status_code == 200
        assert (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            in response.headers["content-type"]
        )

        workbook = openpyxl.load_workbook(BytesIO(response.content))
        sheet = workbook.active
        assert sheet is not None
        rows = list(sheet.values)

        # Should only have header row
        assert len(rows) == 1

        expected_headers = ("Severity", "Address", "Date", "Time", "Description")
        assert rows[0] == expected_headers
        assert sheet["A1"].font.bold is True

    @pytest.mark.asyncio
    async def test_get_incidents_csv_with_data(self):
        """Test Excel export with incidents returns correct data rows."""
        location = await self.location_utils.create_one()
        await self.incident_utils.create_one(
            location_id=location.id,
            severity=IncidentSeverity.WARNING,
            incident_datetime=datetime(2026, 3, 15, 14, 30, 0, tzinfo=UTC),
            description="Test incident description",
        )

        response = await self.staff_client.get("/api/incidents/csv")
        assert response.status_code == 200
        assert (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            in response.headers["content-type"]
        )

        workbook = openpyxl.load_workbook(BytesIO(response.content))
        sheet = workbook.active
        assert sheet is not None
        rows = list(sheet.values)

        # Should have header + 1 data row
        assert len(rows) == 2

        expected_headers = ("Severity", "Address", "Date", "Time", "Description")
        assert rows[0] == expected_headers

        data_row = rows[1]
        # Severity should be capitalized
        assert data_row[0] == "Warning"
        # Address should match location formatted address
        assert data_row[1] == location.formatted_address
        # Date format YYYY-MM-DD
        assert data_row[2] == "2026-03-15"
        # Time format H:MM AM/PM (no leading zero)
        assert data_row[3] == "2:30 PM"
        # Description
        assert data_row[4] == "Test incident description"

    @pytest.mark.asyncio
    async def test_get_incidents_csv_student_forbidden(self, student_client: AsyncClient):
        """Test that students cannot access the incidents CSV endpoint."""
        response = await student_client.get("/api/incidents/csv")
        assert response.status_code == 403
