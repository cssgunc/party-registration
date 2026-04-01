from io import BytesIO

import openpyxl
import pytest
from httpx import AsyncClient
from src.modules.incident.incident_model import IncidentSeverity
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import LocationTestUtils
from test.utils.http.test_templates import generate_auth_required_tests, generate_csv_empty_test

test_location_csv_authentication = generate_auth_required_tests(
    ({"admin", "staff"}, "GET", "/api/locations/csv", None),
)

test_location_csv_empty = generate_csv_empty_test(
    "staff",
    "/api/locations/csv",
    ("Address", "Complaint Count", "Warning Count", "Citation Count"),
)


class TestLocationCSVRouter:
    """Tests for GET /api/locations/csv endpoint."""

    staff_client: AsyncClient
    location_utils: LocationTestUtils
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        staff_client: AsyncClient,
        location_utils: LocationTestUtils,
        incident_utils: IncidentTestUtils,
    ):
        self.staff_client = staff_client
        self.location_utils = location_utils
        self.incident_utils = incident_utils

    @pytest.mark.asyncio
    async def test_get_locations_csv_with_data(self):
        """Test Excel export with locations and incidents returns correct counts."""
        # Create two locations
        location1 = await self.location_utils.create_one()
        location2 = await self.location_utils.create_one()

        # Add incidents to location1: 2 complaints, 1 warning, 3 citations
        await self.incident_utils.create_one(
            location_id=location1.id, severity=IncidentSeverity.COMPLAINT
        )
        await self.incident_utils.create_one(
            location_id=location1.id, severity=IncidentSeverity.COMPLAINT
        )
        await self.incident_utils.create_one(
            location_id=location1.id, severity=IncidentSeverity.WARNING
        )
        await self.incident_utils.create_one(
            location_id=location1.id, severity=IncidentSeverity.CITATION
        )
        await self.incident_utils.create_one(
            location_id=location1.id, severity=IncidentSeverity.CITATION
        )
        await self.incident_utils.create_one(
            location_id=location1.id, severity=IncidentSeverity.CITATION
        )

        # location2 has no incidents

        response = await self.staff_client.get("/api/locations/csv")
        assert response.status_code == 200
        assert (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            in response.headers["content-type"]
        )

        workbook = openpyxl.load_workbook(BytesIO(response.content))
        sheet = workbook.active
        assert sheet is not None
        rows = list(sheet.values)

        # Should have header + 2 data rows
        assert len(rows) == 3

        expected_headers = ("Address", "Complaint Count", "Warning Count", "Citation Count")
        assert rows[0] == expected_headers

        # Build map by formatted address for easy assertion
        data_rows = {row[0]: row for row in rows[1:]}

        # Assert location1 counts
        assert location1.formatted_address in data_rows
        row1 = data_rows[location1.formatted_address]
        assert row1[1] == 2  # complaints
        assert row1[2] == 1  # warnings
        assert row1[3] == 3  # citations

        # Assert location2 has zeros
        assert location2.formatted_address in data_rows
        row2 = data_rows[location2.formatted_address]
        assert row2[1] == 0  # complaints
        assert row2[2] == 0  # warnings
        assert row2[3] == 0  # citations

    @pytest.mark.asyncio
    async def test_get_locations_csv_police_forbidden(self, police_client: AsyncClient):
        """Test that police cannot access the location CSV endpoint."""
        response = await police_client.get("/api/locations/csv")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_locations_csv_student_forbidden(self, student_client: AsyncClient):
        """Test that students cannot access the location CSV endpoint."""
        response = await student_client.get("/api/locations/csv")
        assert response.status_code == 403
