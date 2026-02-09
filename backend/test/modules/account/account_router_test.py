import pytest
import pytest_asyncio
from httpx import AsyncClient
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import AccountDto
from src.modules.account.account_service import AccountConflictException, AccountNotFoundException
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import PoliceAccountDto
from src.modules.police.police_service import PoliceNotFoundException
from test.modules.account.account_utils import AccountTestUtils
from test.modules.police.police_utils import PoliceTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import generate_auth_required_tests


@pytest_asyncio.fixture
async def sample_police(police_utils: PoliceTestUtils) -> PoliceEntity:
    """Create sample police credentials for testing."""
    return await police_utils.create_one()


test_account_authentication = generate_auth_required_tests(
    ({"admin"}, "GET", "/api/accounts", None),
    ({"admin"}, "POST", "/api/accounts", AccountTestUtils.get_sample_data()),
    (
        {"admin"},
        "PUT",
        "/api/accounts/12345",
        AccountTestUtils.get_sample_data(),
    ),
    ({"admin"}, "DELETE", "/api/accounts/12345", None),
    ({"admin"}, "GET", "/api/accounts/police", None),
    (
        {"admin"},
        "PUT",
        "/api/accounts/police",
        PoliceTestUtils.get_sample_data(),
    ),
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
        data = assert_res_success(response, list[AccountDto])

        data_by_id = {account.id: account for account in data}

        for entity in accounts_two_per_role:
            assert entity.id in data_by_id, f"Account {entity.id} not found in response"
            self.account_utils.assert_matches(entity, data_by_id[entity.id])

    @pytest.mark.parametrize(
        "roles",
        [
            [AccountRole.STUDENT],
            [AccountRole.STAFF],
            [AccountRole.ADMIN],
            [AccountRole.STUDENT, AccountRole.ADMIN],
            [AccountRole.STUDENT, AccountRole.STAFF, AccountRole.ADMIN],
        ],
    )
    @pytest.mark.asyncio
    async def test_get_accounts_by_role(
        self, roles: list[AccountRole], accounts_two_per_role: list[AccountEntity]
    ):
        query_string = "&".join(f"role={role.value}" for role in roles)
        response = await self.admin_client.get(f"/api/accounts?{query_string}")

        data = assert_res_success(response, list[AccountDto])

        filtered_fixture = [a for a in accounts_two_per_role if a.role in roles]
        assert len(data) == len(filtered_fixture)

        data_by_id = {account.id: account for account in data}
        for entity in filtered_fixture:
            assert entity.id in data_by_id, f"Account {entity.id} not found in response"
            self.account_utils.assert_matches(entity, data_by_id[entity.id])

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
        assert_res_failure(
            response,
            AccountConflictException(f"Account with email {new_account['email']} already exists"),
        )

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
    async def test_update_account(self, accounts_two_per_role: list[AccountEntity]):
        """Test updating an existing account."""
        account_to_update = accounts_two_per_role[0]
        updated_data = await self.account_utils.next_data()
        response = await self.admin_client.put(
            f"/api/accounts/{account_to_update.id}",
            json=updated_data.model_dump(mode="json"),
        )
        data = assert_res_success(response, AccountDto)
        self.account_utils.assert_matches(updated_data, data)
        assert data.id == account_to_update.id

    @pytest.mark.asyncio
    async def test_update_account_change_email(self, accounts_two_per_role: list[AccountEntity]):
        """Test changing an account's email successfully."""
        account_to_update = accounts_two_per_role[0]
        updated_data = account_to_update.to_dto()
        updated_data.email = "newemail@example.com"
        response = await self.admin_client.put(
            f"/api/accounts/{account_to_update.id}",
            json=updated_data.model_dump(mode="json", exclude={"id"}),
        )
        response_data = assert_res_success(response, AccountDto)
        self.account_utils.assert_matches(updated_data, response_data)

    @pytest.mark.asyncio
    async def test_update_account_duplicate_email(self, accounts_two_per_role: list[AccountEntity]):
        """Test that updating to an email that already exists returns 409."""
        account_to_update = accounts_two_per_role[0]
        updated_data = await self.account_utils.next_dict(email=accounts_two_per_role[1].email)
        response = await self.admin_client.put(
            f"/api/accounts/{account_to_update.id}", json=updated_data
        )
        assert_res_failure(
            response,
            AccountConflictException(f"Account with email {updated_data['email']} already exists"),
        )

    @pytest.mark.asyncio
    async def test_update_account_not_found(self):
        """Test updating a non-existent account returns 404."""
        updated_data = await self.account_utils.next_dict()
        response = await self.admin_client.put("/api/accounts/99999", json=updated_data)
        assert_res_failure(response, AccountNotFoundException(99999))

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
    async def test_update_account_invalid_data(
        self, invalid_data: dict, accounts_two_per_role: list[AccountEntity]
    ):
        account_to_update = accounts_two_per_role[0]
        updated_account = await self.account_utils.next_dict(**invalid_data)
        response = await self.admin_client.put(
            f"/api/accounts/{account_to_update.id}", json=updated_account
        )
        assert_res_validation_error(response, expected_fields=list(invalid_data.keys()))

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
        response = await self.admin_client.delete("/api/accounts/99999")
        assert_res_failure(response, AccountNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_get_police_credentials(
        self, sample_police: PoliceEntity, police_utils: PoliceTestUtils
    ):
        """Test getting police credentials"""
        response = await self.admin_client.get("/api/accounts/police")
        data = assert_res_success(response, PoliceAccountDto)
        police_utils.assert_matches(sample_police, data)

    @pytest.mark.asyncio
    async def test_get_police_not_found(self):
        """Test getting police when not configured returns 500."""
        response = await self.admin_client.get("/api/accounts/police")
        assert_res_failure(response, PoliceNotFoundException())

    @pytest.mark.asyncio
    async def test_update_police_credentials(
        self, sample_police: PoliceEntity, police_utils: PoliceTestUtils
    ):
        """Test updating police credentials."""
        updated_data = await police_utils.next_data()
        response = await self.admin_client.put(
            "/api/accounts/police", json=updated_data.model_dump(mode="json")
        )
        data = assert_res_success(response, PoliceAccountDto)
        police_utils.assert_matches(updated_data, data)

    @pytest.mark.asyncio
    async def test_update_police_credentials_invalid_email(
        self, sample_police: PoliceEntity, police_utils: PoliceTestUtils
    ):
        """Test updating police with invalid email returns 422."""
        updated_data = await police_utils.next_dict(email="invalid-email")
        response = await self.admin_client.put("/api/accounts/police", json=updated_data)
        assert_res_validation_error(response, expected_fields=["email"])

    @pytest.mark.asyncio
    async def test_update_police_password_is_hashed(
        self, sample_police: PoliceEntity, police_utils: PoliceTestUtils
    ):
        """Test that password is hashed when updating police credentials."""
        previous_password = sample_police.hashed_password
        plain_password = "my_plain_password_123"
        updated_data = await police_utils.next_data(password=plain_password)
        response = await self.admin_client.put(
            "/api/accounts/police", json=updated_data.model_dump(mode="json")
        )

        assert_res_success(response, PoliceAccountDto)
        updated_police = await police_utils.get_police()
        police_utils.assert_matches(updated_data, updated_police)

        assert updated_police.hashed_password != plain_password, "Password should be hashed"
        assert updated_police.hashed_password != previous_password, "Password should be updated"

    @pytest.mark.asyncio
    async def test_update_police_not_found(self, police_utils: PoliceTestUtils):
        """Test updating police when not configured returns 500."""
        updated_data = await police_utils.next_data()
        response = await self.admin_client.put(
            "/api/accounts/police", json=updated_data.model_dump(mode="json")
        )
        assert_res_failure(response, PoliceNotFoundException())
