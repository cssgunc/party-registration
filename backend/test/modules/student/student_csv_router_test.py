from datetime import UTC, datetime
from io import BytesIO

import openpyxl
import pytest
from httpx import AsyncClient
from test.modules.location.location_utils import LocationTestUtils
from test.modules.student.student_utils import StudentTestUtils
from test.utils.http.test_templates import generate_auth_required_tests

test_student_csv_authentication = generate_auth_required_tests(
    ({"admin", "staff"}, "GET", "/api/students/csv", None),
)


class TestStudentCSVRouter:
    """Tests for GET /api/students/csv endpoint."""

    staff_client: AsyncClient
    student_utils: StudentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, student_utils: StudentTestUtils, staff_client: AsyncClient):
        self.student_utils = student_utils
        self.staff_client = staff_client

    @pytest.mark.asyncio
    async def test_get_students_csv_empty(self):
        """Test Excel export with no students returns header row only."""
        response = await self.staff_client.get("/api/students/csv")
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

        expected_headers = (
            "PID",
            "First Name",
            "Last Name",
            "Email",
            "Phone Number",
            "Contact Preference",
            "Is Registered",
            "Residence Address",
        )
        assert rows[0] == expected_headers
        assert sheet["A1"].font.bold is True

    @pytest.mark.asyncio
    async def test_get_students_csv_with_data(self, location_utils: LocationTestUtils):
        """Test Excel export with students returns correct data rows."""
        # Create a student without residence
        student_no_residence = await self.student_utils.create_one(last_registered=None)

        # Create a student with residence and last_registered set
        location = await location_utils.create_one()
        student_with_residence = await self.student_utils.create_one(
            last_registered=datetime.now(UTC),
        )
        await self.student_utils.set_student_residence(student_with_residence, location.id)

        response = await self.staff_client.get("/api/students/csv")
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

        expected_headers = (
            "PID",
            "First Name",
            "Last Name",
            "Email",
            "Phone Number",
            "Contact Preference",
            "Is Registered",
            "Residence Address",
        )
        assert rows[0] == expected_headers

        # Build a map by PID for easy assertion
        data_rows = {row[0]: row for row in rows[1:]}

        # Assert student without residence
        pid_no_res = student_no_residence.account.pid
        assert pid_no_res in data_rows
        row_no_res = data_rows[pid_no_res]
        assert row_no_res[6] == "No"  # Is Registered
        assert row_no_res[7] in ("", None)  # Residence Address (empty)

        # Assert student with residence
        pid_with_res = student_with_residence.account.pid
        assert pid_with_res in data_rows
        row_with_res = data_rows[pid_with_res]
        assert row_with_res[6] == "Yes"  # Is Registered
        assert row_with_res[7] == location.formatted_address  # Residence Address

    @pytest.mark.asyncio
    async def test_get_students_csv_police_forbidden(self, police_client: AsyncClient):
        """Test that police cannot access the student CSV endpoint."""
        response = await police_client.get("/api/students/csv")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_students_csv_student_forbidden(self, student_client: AsyncClient):
        """Test that students cannot access the student CSV endpoint."""
        response = await student_client.get("/api/students/csv")
        assert response.status_code == 403
