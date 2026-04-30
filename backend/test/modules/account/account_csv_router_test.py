import pytest
from httpx import AsyncClient
from src.modules.account.account_entity import AccountRole
from src.modules.account.account_model import InviteTokenRole
from test.modules.account.account_utils import AccountTestUtils
from test.modules.account.invite_token_utils import InviteTokenTestUtils
from test.modules.police.police_utils import PoliceTestUtils
from test.utils.http.test_templates import (
    assert_excel_response,
    generate_auth_required_tests,
    generate_csv_empty_test,
)

test_account_csv_authentication = generate_auth_required_tests(
    ({"admin"}, "GET", "/api/accounts/csv", None),
    ({"admin"}, "GET", "/api/accounts/aggregate/csv", None),
)

test_account_csv_empty = generate_csv_empty_test(
    "admin",
    "/api/accounts/csv",
    ("Onyen", "Email", "First Name", "Last Name", "PID", "Role"),
)

test_aggregate_account_csv_empty = generate_csv_empty_test(
    "admin",
    "/api/accounts/aggregate/csv",
    ("Email", "First Name", "Last Name", "Onyen", "PID", "Role", "Status"),
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
    async def test_get_accounts_csv_excludes_students(self):
        """CSV export only includes staff/admin accounts, not students."""
        _student = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        admin = await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        staff = await self.account_utils.create_one(role=AccountRole.STAFF.value)

        response = await self.admin_client.get("/api/accounts/csv")
        rows = assert_excel_response(
            response,
            ("Onyen", "Email", "First Name", "Last Name", "PID", "Role"),
            expected_row_count=3,
        )

        data_rows = {row[0]: row for row in rows[1:]}

        assert _student.onyen not in data_rows

        assert admin.onyen in data_rows
        assert data_rows[admin.onyen][5] == "Admin"

        assert staff.onyen in data_rows
        assert data_rows[staff.onyen][5] == "Staff"


class TestAggregateAccountCSVRouter:
    admin_client: AsyncClient
    account_utils: AccountTestUtils
    police_utils: PoliceTestUtils
    invite_token_utils: InviteTokenTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        account_utils: AccountTestUtils,
        admin_client: AsyncClient,
        police_utils: PoliceTestUtils,
        invite_token_utils: InviteTokenTestUtils,
    ):
        self.account_utils = account_utils
        self.admin_client = admin_client
        self.police_utils = police_utils
        self.invite_token_utils = invite_token_utils

    @pytest.mark.asyncio
    async def test_get_aggregate_accounts_csv_includes_all_sources(self):
        staff = await self.account_utils.create_one(role=AccountRole.STAFF.value)
        admin = await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        student = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        officer = await self.police_utils.create_verified_one()
        unverified_officer = await self.police_utils.create_one()
        invite = await self.invite_token_utils.create_one(role=InviteTokenRole.ADMIN)

        response = await self.admin_client.get("/api/accounts/aggregate/csv")
        rows = assert_excel_response(
            response,
            ("Email", "First Name", "Last Name", "Onyen", "PID", "Role", "Status"),
            expected_row_count=6,
        )

        data_rows = {row[0]: row for row in rows[1:]}

        assert student.email not in data_rows

        assert data_rows[staff.email] == (
            staff.email,
            staff.first_name,
            staff.last_name,
            staff.onyen,
            staff.pid,
            "Staff",
            "Active",
        )
        assert data_rows[admin.email] == (
            admin.email,
            admin.first_name,
            admin.last_name,
            admin.onyen,
            admin.pid,
            "Admin",
            "Active",
        )
        assert data_rows[officer.email] == (
            officer.email,
            None,
            None,
            None,
            None,
            "Officer",
            "Active",
        )
        assert data_rows[unverified_officer.email] == (
            unverified_officer.email,
            None,
            None,
            None,
            None,
            "Officer",
            "Unverified",
        )
        assert data_rows[invite.email] == (
            invite.email,
            None,
            None,
            None,
            None,
            "Admin",
            "Invited",
        )
