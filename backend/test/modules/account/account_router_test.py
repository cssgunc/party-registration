import pytest
from httpx import AsyncClient
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import AccountDto
from src.modules.account.account_service import (
    AccountConflictException,
    AccountNotFoundException,
    CannotDeleteOwnAccountException,
)
from test.modules.account.account_utils import AccountTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_paginated,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import generate_auth_required_tests, generate_filter_sort_tests

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

test_account_authentication = generate_auth_required_tests(
    ({"admin"}, "GET", "/api/accounts", None),
    ({"admin"}, "POST", "/api/accounts", AccountTestUtils.get_sample_data()),
    (
        {"admin"},
        "PUT",
        "/api/accounts/12345",
        {"role": "staff"},
    ),
    ({"admin"}, "DELETE", "/api/accounts/12345", None),
)


class TestAccountRouter:
    admin_client: AsyncClient
    account_utils: AccountTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, account_utils: AccountTestUtils, admin_client: AsyncClient):
        self.account_utils = account_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_get_all_accounts(
        self,
        accounts_two_per_role: list[AccountEntity],
    ):
        response = await self.admin_client.get("/api/accounts")
        paginated = assert_res_paginated(response, AccountDto, total_records=6)

        data_by_id = {account.id: account for account in paginated.items}

        for entity in accounts_two_per_role:
            assert entity.id in data_by_id, f"Account {entity.id} not found in response"
            self.account_utils.assert_matches(entity, data_by_id[entity.id])

    @pytest.mark.asyncio
    async def test_get_accounts_by_role(self, accounts_two_per_role: list[AccountEntity]):
        """Test filtering accounts by role."""
        response = await self.admin_client.get("/api/accounts", params={"role": "student"})

        paginated = assert_res_paginated(response, AccountDto, total_records=2)

        assert all(a.role == AccountRole.STUDENT for a in paginated.items)

    @pytest.mark.asyncio
    async def test_get_accounts_pagination(self, accounts_two_per_role: list[AccountEntity]):
        """Test pagination on accounts endpoint."""
        response = await self.admin_client.get(
            "/api/accounts", params={"page_number": 1, "page_size": 2}
        )

        paginated = assert_res_paginated(
            response, AccountDto, total_records=6, page_number=1, page_size=2
        )
        assert len(paginated.items) == 2

    @pytest.mark.asyncio
    async def test_get_accounts_sort_by_email(self, accounts_two_per_role: list[AccountEntity]):
        """Test sorting accounts by email."""
        response = await self.admin_client.get(
            "/api/accounts", params={"sort_by": "email", "sort_order": "asc"}
        )

        paginated = assert_res_paginated(response, AccountDto, total_records=6)
        emails = [a.email for a in paginated.items]
        assert emails == sorted(emails)

    @pytest.mark.parametrize("role", [AccountRole.ADMIN, AccountRole.STUDENT, AccountRole.STAFF])
    @pytest.mark.asyncio
    async def test_create_account(self, role: AccountRole):
        new_account = await self.account_utils.next_data(role=role.value)
        response = await self.admin_client.post(
            "/api/accounts", json=new_account.model_dump(mode="json")
        )
        data = assert_res_success(response, AccountDto)
        self.account_utils.assert_matches(new_account, data)

    @pytest.mark.asyncio
    async def test_create_account_duplicate_email(
        self,
        accounts_two_per_role: list[AccountEntity],
    ):
        """Test that creating an account with duplicate email returns 409."""
        new_account = await self.account_utils.next_dict(email=accounts_two_per_role[0].email)
        response = await self.admin_client.post("/api/accounts", json=new_account)
        assert_res_failure(response, AccountConflictException(email=new_account["email"]))

    @pytest.mark.asyncio
    async def test_create_account_duplicate_onyen(
        self,
        accounts_two_per_role: list[AccountEntity],
    ):
        """Test that creating an account with duplicate onyen returns 409."""
        new_account = await self.account_utils.next_dict(onyen=accounts_two_per_role[0].onyen)
        response = await self.admin_client.post("/api/accounts", json=new_account)
        assert_res_failure(response, AccountConflictException(onyen=new_account["onyen"]))

    @pytest.mark.asyncio
    async def test_create_account_duplicate_pid(
        self,
        accounts_two_per_role: list[AccountEntity],
    ):
        """Test that creating an account with duplicate PID returns 409."""
        new_account = await self.account_utils.next_dict(pid=accounts_two_per_role[0].pid)
        response = await self.admin_client.post("/api/accounts", json=new_account)
        assert_res_failure(response, AccountConflictException(pid=new_account["pid"]))

    @pytest.mark.parametrize(
        "invalid_data",
        [
            {"pid": "73012"},
            {"pid": "73012345678"},
            {"pid": "730abcdef"},
            {"email": "invalid-email"},
        ],
    )
    @pytest.mark.asyncio
    async def test_create_account_invalid_data(self, invalid_data: dict):
        new_account = await self.account_utils.next_dict(**invalid_data)
        response = await self.admin_client.post("/api/accounts", json=new_account)
        assert_res_validation_error(response, expected_fields=list(invalid_data.keys()))

    @pytest.mark.asyncio
    async def test_update_account_role(self, accounts_two_per_role: list[AccountEntity]) -> None:
        """Test updating an account's role."""
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
        """Test updating a non-existent account returns 404."""
        response = await self.admin_client.put("/api/accounts/99999", json={"role": "staff"})
        assert_res_failure(response, AccountNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_update_account_invalid_role(self, accounts_two_per_role: list[AccountEntity]):
        """Test that sending an invalid role returns 422."""
        account_to_update = accounts_two_per_role[0]
        response = await self.admin_client.put(
            f"/api/accounts/{account_to_update.id}",
            json={"role": "invalid_role"},
        )
        assert_res_validation_error(response, expected_fields=["role"])

    @pytest.mark.asyncio
    async def test_delete_account(self, accounts_two_per_role: list[AccountEntity]):
        """Test deleting an account successfully."""
        account_to_delete = accounts_two_per_role[0]
        response = await self.admin_client.delete(f"/api/accounts/{account_to_delete.id}")

        data = assert_res_success(response, AccountDto)
        self.account_utils.assert_matches(account_to_delete, data)
        assert data.id == account_to_delete.id

        accounts = await self.account_utils.get_all()
        assert len(accounts) == self.account_utils.count - 1

    @pytest.mark.asyncio
    async def test_delete_account_not_found(self):
        """Test deleting a non-existent account returns 404."""
        response = await self.admin_client.delete("/api/accounts/88888")
        assert_res_failure(response, AccountNotFoundException(88888))

    @pytest.mark.asyncio
    async def test_delete_own_account(self):
        """Test that an admin cannot delete their own account."""
        response = await self.admin_client.delete("/api/accounts/99999")
        assert_res_failure(response, CannotDeleteOwnAccountException())
