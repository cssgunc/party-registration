import pytest
from httpx import AsyncClient
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import (
    AccountDto,
    AggregateAccountDto,
    InviteTokenRole,
)
from src.modules.account.account_service import (
    AccountNotFoundException,
    CannotDeleteOwnAccountException,
    InviteConflictException,
)
from test.modules.account.account_utils import AccountTestUtils
from test.modules.account.invite_token_utils import InviteTokenTestUtils
from test.modules.police.police_utils import PoliceTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_paginated,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import (
    assert_excel_response,
    generate_auth_required_tests,
    generate_csv_empty_test,
    generate_filter_sort_tests,
    generate_search_tests,
)

test_account_sort, test_account_filter = generate_filter_sort_tests(
    "/api/accounts",
    AccountDto,
    sort_fields=[
        "id",
        "email",
        "first_name",
        "last_name",
        "pid",
        "role",
    ],
    filter_cases=[
        ("id", 0),
        ("email", "nonexistent"),
        ("first_name", "nonexistent"),
        ("last_name", "nonexistent"),
        ("pid", 0),
        ("role", "admin"),
    ],
)

test_account_search_no_results, test_account_search_ok = generate_search_tests(
    "/api/accounts",
    AccountDto,
)

test_account_authentication = generate_auth_required_tests(
    ({"admin"}, "GET", "/api/accounts", None),
    ({"admin"}, "POST", "/api/accounts", {"email": "invite@unc.edu", "role": "staff"}),
    ({"admin"}, "PUT", "/api/accounts/12345", {"role": "staff"}),
    ({"admin"}, "DELETE", "/api/accounts/12345", None),
    ({"admin"}, "GET", "/api/accounts/aggregate", None),
    ({"admin"}, "POST", "/api/accounts/invites/12345/resend", None),
    ({"admin"}, "DELETE", "/api/accounts/invites/12345", None),
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


class TestAccountRouter:
    admin_client: AsyncClient
    account_utils: AccountTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, account_utils: AccountTestUtils, admin_client: AsyncClient):
        self.account_utils = account_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_get_all_accounts_only_staff_admin(
        self,
        accounts_two_per_role: list[AccountEntity],
    ):
        response = await self.admin_client.get("/api/accounts")
        paginated = assert_res_paginated(response, AccountDto, total_records=4)

        returned_roles = {a.role for a in paginated.items}
        assert AccountRole.STUDENT not in returned_roles
        assert AccountRole.STAFF in returned_roles
        assert AccountRole.ADMIN in returned_roles

    @pytest.mark.asyncio
    async def test_get_accounts_student_filter_returns_empty(
        self, accounts_two_per_role: list[AccountEntity]
    ):
        response = await self.admin_client.get("/api/accounts", params={"role_eq": "student"})
        assert_res_paginated(response, AccountDto, total_records=0)

    @pytest.mark.asyncio
    async def test_get_accounts_pagination(self, accounts_two_per_role: list[AccountEntity]):
        response = await self.admin_client.get(
            "/api/accounts", params={"page_number": 1, "page_size": 2}
        )
        paginated = assert_res_paginated(
            response, AccountDto, total_records=4, page_number=1, page_size=2
        )
        assert len(paginated.items) == 2

    @pytest.mark.asyncio
    async def test_get_accounts_sort_by_email(self, accounts_two_per_role: list[AccountEntity]):
        response = await self.admin_client.get(
            "/api/accounts", params={"sort_by": "email", "sort_order": "asc"}
        )
        paginated = assert_res_paginated(response, AccountDto, total_records=4)
        emails = [a.email for a in paginated.items]
        assert emails == sorted(emails)

    @pytest.mark.parametrize("role", [InviteTokenRole.ADMIN, InviteTokenRole.STAFF])
    @pytest.mark.asyncio
    async def test_create_invite_returns_204(self, role: InviteTokenRole):
        data = {"email": f"newinvite-{role.value}@unc.edu", "role": role.value}
        response = await self.admin_client.post("/api/accounts", json=data)
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_create_invite_conflict_existing_account(
        self, accounts_two_per_role: list[AccountEntity]
    ):
        existing_email = accounts_two_per_role[0].email
        response = await self.admin_client.post(
            "/api/accounts", json={"email": existing_email, "role": "staff"}
        )
        assert_res_failure(response, InviteConflictException(existing_email))

    @pytest.mark.asyncio
    async def test_create_invite_conflict_existing_token(
        self, invite_token_utils: InviteTokenTestUtils
    ):
        invite = await invite_token_utils.create_one()
        invite_email = invite.email
        response = await self.admin_client.post(
            "/api/accounts", json={"email": invite_email, "role": "staff"}
        )
        assert_res_failure(response, InviteConflictException(invite_email))

    @pytest.mark.asyncio
    async def test_create_invite_replaces_expired_token(
        self, invite_token_utils: InviteTokenTestUtils
    ):
        expired_invite = await invite_token_utils.create_expired(email="expired-reinvite@unc.edu")

        response = await self.admin_client.post(
            "/api/accounts",
            json={"email": expired_invite.email, "role": "admin"},
        )

        assert response.status_code == 204
        invites = await invite_token_utils.get_all()
        assert len(invites) == 1
        assert invites[0].email == expired_invite.email
        assert invites[0].id != expired_invite.id
        assert invites[0].role == InviteTokenRole.ADMIN

    @pytest.mark.parametrize(
        "invalid_data",
        [
            {"email": "invalid-email", "role": "staff"},
            {"email": "valid@unc.edu", "role": "student"},
            {"email": "valid@unc.edu", "role": "invalid_role"},
        ],
    )
    @pytest.mark.asyncio
    async def test_create_invite_invalid_data(self, invalid_data: dict):
        response = await self.admin_client.post("/api/accounts", json=invalid_data)
        assert_res_validation_error(response)

    @pytest.mark.asyncio
    async def test_update_account_role(self, accounts_two_per_role: list[AccountEntity]) -> None:
        account_to_update = accounts_two_per_role[0]
        response = await self.admin_client.put(
            f"/api/accounts/{account_to_update.id}",
            json={"role": "admin"},
        )
        data = assert_res_success(response, AccountDto)
        expected = AccountDto(
            id=account_to_update.id,
            role=AccountRole.ADMIN,
            email=account_to_update.email,
            first_name=account_to_update.first_name,
            last_name=account_to_update.last_name,
            pid=account_to_update.pid,
            onyen=account_to_update.onyen,
        )
        self.account_utils.assert_matches(expected, data)

    @pytest.mark.asyncio
    async def test_update_account_not_found(self):
        response = await self.admin_client.put("/api/accounts/99999", json={"role": "staff"})
        assert_res_failure(response, AccountNotFoundException(id=99999))

    @pytest.mark.asyncio
    async def test_update_account_invalid_role(self, accounts_two_per_role: list[AccountEntity]):
        account_to_update = accounts_two_per_role[0]
        response = await self.admin_client.put(
            f"/api/accounts/{account_to_update.id}",
            json={"role": "invalid_role"},
        )
        assert_res_validation_error(response, expected_fields=["role"])

    @pytest.mark.asyncio
    async def test_delete_account(self, accounts_two_per_role: list[AccountEntity]):
        account_to_delete = accounts_two_per_role[0]
        response = await self.admin_client.delete(f"/api/accounts/{account_to_delete.id}")

        data = assert_res_success(response, AccountDto)
        self.account_utils.assert_matches(account_to_delete, data)
        assert data.id == account_to_delete.id

        accounts = await self.account_utils.get_all()
        assert len(accounts) == self.account_utils.count - 1

    @pytest.mark.asyncio
    async def test_delete_account_not_found(self):
        response = await self.admin_client.delete("/api/accounts/88888")
        assert_res_failure(response, AccountNotFoundException(id=88888))

    @pytest.mark.asyncio
    async def test_delete_own_account(self, accounts_two_per_role: list[AccountEntity]):
        response = await self.admin_client.delete("/api/accounts/99999")
        assert_res_failure(response, CannotDeleteOwnAccountException())

        accounts = await self.account_utils.get_all()
        assert len(accounts) == len(accounts_two_per_role)


class TestAccountListSearch:
    """Tests for full-table search on GET /api/accounts."""

    admin_client: AsyncClient
    account_utils: AccountTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, account_utils: AccountTestUtils, admin_client: AsyncClient):
        self.account_utils = account_utils
        self.admin_client = admin_client

    @pytest.mark.parametrize(
        "create_kwargs,search_term",
        [
            ({"first_name": "Uniquelynamed", "role": "staff"}, "Uniquelynamed"),
            ({"email": "searchme@unc.edu", "role": "admin"}, "searchme"),
            ({"first_name": "Uniquelynamed", "role": "staff"}, "uniquelynamed"),
        ],
    )
    @pytest.mark.asyncio
    async def test_search_matches_field(self, create_kwargs: dict, search_term: str):
        account1 = await self.account_utils.create_one(**create_kwargs)
        await self.account_utils.create_one(role="staff")

        response = await self.admin_client.get(f"/api/accounts?search={search_term}")
        paginated = assert_res_paginated(response, AccountDto, total_records=1)
        self.account_utils.assert_matches(paginated.items[0], account1.to_dto())


class TestAggregateAccountsRouter:
    admin_client: AsyncClient
    account_utils: AccountTestUtils
    police_utils: PoliceTestUtils
    invite_token_utils: InviteTokenTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        admin_client: AsyncClient,
        account_utils: AccountTestUtils,
        police_utils: PoliceTestUtils,
        invite_token_utils: InviteTokenTestUtils,
    ):
        self.admin_client = admin_client
        self.account_utils = account_utils
        self.police_utils = police_utils
        self.invite_token_utils = invite_token_utils

    @pytest.mark.asyncio
    async def test_aggregate_returns_all_sources(self):
        staff = await self.account_utils.create_one(role="staff")
        admin = await self.account_utils.create_one(role="admin")
        officer = await self.police_utils.create_verified_one()
        unverified_police = await self.police_utils.create_one()
        invite = await self.invite_token_utils.create_one(role=InviteTokenRole.STAFF)

        response = await self.admin_client.get("/api/accounts/aggregate")
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=5)

        by_email = {dto.email: dto for dto in paginated.items}

        self.account_utils.assert_aggregate_matches(by_email[staff.email], staff)
        self.account_utils.assert_aggregate_matches(by_email[admin.email], admin)
        self.account_utils.assert_aggregate_matches(by_email[officer.email], officer)
        self.account_utils.assert_aggregate_matches(
            by_email[unverified_police.email], unverified_police
        )
        self.account_utils.assert_aggregate_matches(by_email[invite.email], invite)

    @pytest.mark.asyncio
    async def test_aggregate_excludes_expired_invites(self):
        active_invite = await self.invite_token_utils.create_one(email="active-invite@unc.edu")
        expired_invite = await self.invite_token_utils.create_expired(
            email="expired-invite@unc.edu"
        )

        response = await self.admin_client.get("/api/accounts/aggregate")
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=1)

        assert [dto.email for dto in paginated.items] == [active_invite.email]
        assert all(dto.email != expired_invite.email for dto in paginated.items)

    @pytest.mark.asyncio
    async def test_aggregate_excludes_students(self):
        await self.account_utils.create_one(role="student")
        await self.account_utils.create_one(role="staff")

        response = await self.admin_client.get("/api/accounts/aggregate")
        assert_res_paginated(response, AggregateAccountDto, total_records=1)


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

    @pytest.mark.asyncio
    async def test_aggregate_empty(self):
        response = await self.admin_client.get("/api/accounts/aggregate")
        assert_res_paginated(response, AggregateAccountDto, total_records=0)

    @pytest.mark.asyncio
    async def test_aggregate_search_by_email(self):
        await self.account_utils.create_one(role="staff", email="findme-staff@unc.edu")
        await self.invite_token_utils.create_one(email="findme-invite@unc.edu")
        await self.account_utils.create_one(role="admin", email="other@unc.edu")

        response = await self.admin_client.get("/api/accounts/aggregate?search=findme")
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=2)
        assert all("findme" in dto.email for dto in paginated.items)

    @pytest.mark.asyncio
    async def test_aggregate_search_by_first_name(self):
        staff = await self.account_utils.create_one(role="staff", first_name="Uniquestaff")
        await self.account_utils.create_one(role="admin", first_name="Other")

        response = await self.admin_client.get("/api/accounts/aggregate?search=uniquestaff")
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=1)
        self.account_utils.assert_aggregate_matches(paginated.items[0], staff)

    @pytest.mark.asyncio
    async def test_aggregate_filter_by_status(self):
        await self.account_utils.create_one(role="staff")
        await self.invite_token_utils.create_one()
        officer = await self.police_utils.create_one()

        response = await self.admin_client.get(
            "/api/accounts/aggregate", params={"status_eq": "unverified"}
        )
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=1)
        self.account_utils.assert_aggregate_matches(paginated.items[0], officer)

    @pytest.mark.asyncio
    async def test_aggregate_filter_by_role(self):
        await self.account_utils.create_one(role="staff")
        admin = await self.account_utils.create_one(role="admin")
        await self.police_utils.create_verified_one()

        response = await self.admin_client.get(
            "/api/accounts/aggregate", params={"role_eq": "admin"}
        )
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=1)
        self.account_utils.assert_aggregate_matches(paginated.items[0], admin)

    @pytest.mark.asyncio
    async def test_aggregate_sort_by_email(self):
        await self.account_utils.create_one(role="staff", email="z-account@unc.edu")
        await self.account_utils.create_one(role="admin", email="a-account@unc.edu")

        response = await self.admin_client.get(
            "/api/accounts/aggregate", params={"sort_by": "email", "sort_order": "asc"}
        )
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=2)
        emails = [dto.email for dto in paginated.items]
        assert emails == sorted(emails)

    @pytest.mark.asyncio
    async def test_aggregate_pagination(self):
        for _ in range(5):
            await self.account_utils.create_one(role="staff")

        response = await self.admin_client.get(
            "/api/accounts/aggregate", params={"page_number": 1, "page_size": 3}
        )
        paginated = assert_res_paginated(
            response, AggregateAccountDto, total_records=5, page_number=1, page_size=3
        )
        assert len(paginated.items) == 3

    @pytest.mark.asyncio
    async def test_aggregate_invited_null_identity_fields(self):
        invite = await self.invite_token_utils.create_one(role=InviteTokenRole.ADMIN)

        response = await self.admin_client.get("/api/accounts/aggregate")
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=1)

        invite_row = paginated.items[0]
        self.account_utils.assert_aggregate_matches(invite_row, invite)

    @pytest.mark.asyncio
    async def test_aggregate_police_null_onyen_pid(self):
        await self.police_utils.create_verified_one()

        response = await self.admin_client.get("/api/accounts/aggregate")
        paginated = assert_res_paginated(response, AggregateAccountDto, total_records=1)

        police_row = paginated.items[0]
        assert police_row.first_name is None
        assert police_row.last_name is None
        assert police_row.onyen is None
        assert police_row.pid is None


class TestInviteDeleteRouter:
    admin_client: AsyncClient
    invite_token_utils: InviteTokenTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, admin_client: AsyncClient, invite_token_utils: InviteTokenTestUtils):
        self.admin_client = admin_client
        self.invite_token_utils = invite_token_utils

    @pytest.mark.asyncio
    async def test_delete_invite_returns_204(self):
        invite = await self.invite_token_utils.create_one()
        response = await self.admin_client.delete(f"/api/accounts/invites/{invite.id}")
        assert response.status_code == 204

        remaining = await self.invite_token_utils.get_all()
        self.invite_token_utils.assert_token_deleted(invite, remaining)

    @pytest.mark.asyncio
    async def test_delete_invite_not_found(self):
        response = await self.admin_client.delete("/api/accounts/invites/99999")
        assert response.status_code == 404


class TestInviteResendRouter:
    admin_client: AsyncClient
    invite_token_utils: InviteTokenTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, admin_client: AsyncClient, invite_token_utils: InviteTokenTestUtils):
        self.admin_client = admin_client
        self.invite_token_utils = invite_token_utils

    @pytest.mark.asyncio
    async def test_resend_invite_returns_204_and_extends_expiry(self):
        invite = await self.invite_token_utils.create_one()
        original_expires_at = invite.expires_at

        response = await self.admin_client.post(f"/api/accounts/invites/{invite.id}/resend")

        assert response.status_code == 204
        invites = await self.invite_token_utils.get_all()
        assert len(invites) == 1
        assert invites[0].id == invite.id
        assert invites[0].expires_at > original_expires_at

    @pytest.mark.asyncio
    async def test_resend_invite_not_found(self):
        response = await self.admin_client.post("/api/accounts/invites/99999/resend")
        assert response.status_code == 404
