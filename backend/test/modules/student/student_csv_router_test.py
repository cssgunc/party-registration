from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from test.modules.location.location_utils import LocationTestUtils
from test.modules.student.student_utils import StudentTestUtils
from test.utils.http.test_templates import (
    assert_excel_response,
    generate_auth_required_tests,
    generate_csv_empty_test,
)

STUDENT_HEADERS = (
    "Onyen",
    "PID",
    "First Name",
    "Last Name",
    "Email",
    "Phone Number",
    "Contact Preference",
    "Is Registered",
    "Residence Address",
)

test_student_csv_authentication = generate_auth_required_tests(
    ({"admin", "staff"}, "GET", "/api/students/csv", None),
)

test_student_csv_empty = generate_csv_empty_test(
    "staff",
    "/api/students/csv",
    STUDENT_HEADERS,
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
        rows = assert_excel_response(response, STUDENT_HEADERS, expected_row_count=3)

        # Build a map by PID for easy assertion
        data_rows = {row[1]: row for row in rows[1:]}

        # Assert student without residence
        pid_no_res = student_no_residence.account.pid
        assert pid_no_res in data_rows
        row_no_res = data_rows[pid_no_res]
        assert row_no_res[7] == "No"  # Is Registered
        assert row_no_res[8] == "-"  # Residence Address (no residence)
        # Phone number should be formatted as (XXX) XXX-XXXX
        phone_no_res = str(row_no_res[5])  # Phone Number
        assert "(" in phone_no_res and ")" in phone_no_res and "-" in phone_no_res
        # Contact preference should be capitalized
        assert str(row_no_res[6])[0].isupper()  # Contact Preference starts with uppercase

        # Assert student with residence
        pid_with_res = student_with_residence.account.pid
        assert pid_with_res in data_rows
        row_with_res = data_rows[pid_with_res]
        assert row_with_res[7] == "Yes"  # Is Registered
        assert row_with_res[8] == location.formatted_address  # Residence Address
        # Phone number should be formatted as (XXX) XXX-XXXX
        phone_with_res = str(row_with_res[5])  # Phone Number
        assert "(" in phone_with_res and ")" in phone_with_res and "-" in phone_with_res
        # Contact preference should be capitalized
        assert str(row_with_res[6])[0].isupper()  # Contact Preference starts with uppercase
