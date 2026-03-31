from io import BytesIO

import openpyxl
import pytest
from httpx import AsyncClient
from src.modules.account.account_entity import AccountRole
from test.modules.account.account_utils import AccountTestUtils
from test.utils.http.test_templates import generate_auth_required_tests

test_account_csv_authentication = generate_auth_required_tests(
    ({"admin"}, "GET", "/api/accounts/csv", None),
)


class TestAccountCSVRouter:
    """Tests for GET /api/accounts/csv endpoint."""

    admin_client: AsyncClient
    account_utils: AccountTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, account_utils: AccountTestUtils, admin_client: AsyncClient):
        self.account_utils = account_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_get_accounts_csv_empty(self):
        """Test Excel export with no accounts returns header row only."""
        response = await self.admin_client.get("/api/accounts/csv")
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

        expected_headers = ("Onyen", "Email", "First Name", "Last Name", "PID", "Role")
        assert rows[0] == expected_headers
        assert sheet["A1"].font.bold is True

    @pytest.mark.asyncio
    async def test_get_accounts_csv_with_data(self):
        """Test Excel export with accounts returns correct data rows including capitalized Role."""
        account1 = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        account2 = await self.account_utils.create_one(role=AccountRole.ADMIN.value)

        response = await self.admin_client.get("/api/accounts/csv")
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

        expected_headers = ("Onyen", "Email", "First Name", "Last Name", "PID", "Role")
        assert rows[0] == expected_headers

        # Build a map by onyen for easy assertion
        data_rows = {row[0]: row for row in rows[1:]}

        # Assert account1 (student)
        assert account1.onyen in data_rows
        row1 = data_rows[account1.onyen]
        assert row1[0] == account1.onyen
        assert row1[1] == account1.email
        assert row1[2] == account1.first_name
        assert row1[3] == account1.last_name
        assert row1[4] == account1.pid
        assert row1[5] == "Student"  # capitalized

        # Assert account2 (admin)
        assert account2.onyen in data_rows
        row2 = data_rows[account2.onyen]
        assert row2[5] == "Admin"  # capitalized

    @pytest.mark.asyncio
    async def test_get_accounts_csv_staff_forbidden(self, staff_client: AsyncClient):
        """Test that staff cannot access the accounts CSV endpoint."""
        response = await staff_client.get("/api/accounts/csv")
        assert response.status_code == 403
