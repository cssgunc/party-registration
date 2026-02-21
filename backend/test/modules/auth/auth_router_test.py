import pytest
from httpx import AsyncClient
from src.core.config import env
from src.core.exceptions import CredentialsException
from src.modules.account.account_model import AccountData, AccountRole
from src.modules.auth.auth_model import PoliceCredentialsDto, TokensDto

from test.modules.auth.auth_utils import AuthTestUtils
from test.utils.http.assertions import assert_res_failure, assert_res_success


class TestAuthRouter:
    """Tests for auth router endpoints."""

    admin_client: AsyncClient
    student_client: AsyncClient
    police_client: AsyncClient
    unauthenticated_client: AsyncClient
    auth_utils: AuthTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        admin_client: AsyncClient,
        student_client: AsyncClient,
        police_client: AsyncClient,
        unauthenticated_client: AsyncClient,
        auth_utils: AuthTestUtils,
    ):
        self.admin_client = admin_client
        self.student_client = student_client
        self.police_client = police_client
        self.unauthenticated_client = unauthenticated_client
        self.auth_utils = auth_utils

    # ========================= /auth/exchange Tests =========================

    @pytest.mark.asyncio
    async def test_exchange_new_account_success(self) -> None:
        """Test exchanging account data for tokens creates new account."""
        account_data = AccountData(
            email="newuser@unc.edu",
            first_name="New",
            last_name="User",
            pid="123456789",
            role=AccountRole.STUDENT,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, TokensDto)
        assert data.access_token
        assert data.refresh_token

        # Verify access token contains correct data
        payload = self.auth_utils.decode_token(data.access_token)
        assert payload["email"] == account_data.email
        assert payload["first_name"] == account_data.first_name
        assert payload["role"] == account_data.role.value

    @pytest.mark.asyncio
    async def test_exchange_existing_account_updates(self, account_utils) -> None:
        """Test exchanging existing account data updates the account."""
        # Create existing account
        existing_account = await account_utils.create_one(email="existing@unc.edu", role="student")

        # Exchange with updated data
        updated_data = AccountData(
            email="existing@unc.edu",
            first_name="Updated",
            last_name="Name",
            pid=existing_account.pid,
            role=AccountRole.ADMIN,  # Role changed
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=updated_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, TokensDto)

        # Verify access token has updated data
        payload = self.auth_utils.decode_token(data.access_token)
        assert payload["first_name"] == "Updated"
        assert payload["last_name"] == "Name"
        assert payload["role"] == "admin"

    @pytest.mark.asyncio
    async def test_exchange_missing_internal_secret(self) -> None:
        """Test exchange without internal secret returns 403."""
        account_data = AccountData(
            email="test@unc.edu",
            first_name="Test",
            last_name="User",
            pid="123456789",
            role=AccountRole.STUDENT,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
        )

        assert response.status_code == 422  # Missing header

    @pytest.mark.asyncio
    async def test_exchange_invalid_internal_secret(self) -> None:
        """Test exchange with invalid internal secret returns 403."""
        account_data = AccountData(
            email="test@unc.edu",
            first_name="Test",
            last_name="User",
            pid="123456789",
            role=AccountRole.STUDENT,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": "invalid-secret"},
        )

        assert response.status_code == 403

    # ========================= /auth/police/login Tests =========================

    @pytest.mark.asyncio
    async def test_police_login_success(self, police_utils) -> None:
        """Test police login with valid credentials."""
        police_entity = await police_utils.create_one()

        credentials = PoliceCredentialsDto(
            email=police_entity.email,
            password=police_utils.TEST_PASSWORD,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/police/login",
            json=credentials.model_dump(),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, TokensDto)
        assert data.access_token
        assert data.refresh_token

        # Verify access token
        payload = self.auth_utils.decode_token(data.access_token)
        assert payload["sub"] == "police"
        assert payload["email"] == police_entity.email

    @pytest.mark.asyncio
    async def test_police_login_wrong_password(self, police_utils) -> None:
        """Test police login with wrong password fails."""
        police_entity = await police_utils.create_one()

        credentials = PoliceCredentialsDto(
            email=police_entity.email,
            password="wrong-password",
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/police/login",
            json=credentials.model_dump(),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert_res_failure(response, CredentialsException())

    @pytest.mark.asyncio
    async def test_police_login_wrong_email(self, police_utils) -> None:
        """Test police login with wrong email fails."""
        await police_utils.create_one()

        credentials = PoliceCredentialsDto(
            email="wrong@unc.edu",
            password=police_utils.TEST_PASSWORD,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/police/login",
            json=credentials.model_dump(),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert_res_failure(response, CredentialsException())

    @pytest.mark.asyncio
    async def test_police_login_missing_internal_secret(self, police_utils) -> None:
        """Test police login without internal secret returns 422."""
        police_entity = await police_utils.create_one()

        credentials = PoliceCredentialsDto(
            email=police_entity.email,
            password=police_utils.TEST_PASSWORD,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/police/login",
            json=credentials.model_dump(),
        )

        assert response.status_code == 422

    # ========================= /auth/refresh Tests =========================

    @pytest.mark.asyncio
    async def test_refresh_access_token_success(self, auth_service, account_utils) -> None:
        """Test refreshing access token with valid refresh token."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        # Create refresh token
        refresh_token, _ = await auth_service.create_refresh_token(account.id)

        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "access_token_expires" in data

        # Verify new access token
        payload = self.auth_utils.decode_token(data["access_token"])
        assert payload["email"] == account.email

    @pytest.mark.asyncio
    async def test_refresh_access_token_invalid(self) -> None:
        """Test refreshing with invalid token fails."""
        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_access_token_missing_internal_secret(
        self, auth_service, account_utils
    ) -> None:
        """Test refresh without internal secret returns 422."""
        account_entity = await account_utils.create_one()
        refresh_token, _ = await auth_service.create_refresh_token(account_entity.id)

        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 422

    # ========================= /auth/logout Tests =========================

    @pytest.mark.asyncio
    async def test_logout_success(self, auth_service, account_utils) -> None:
        """Test logout revokes refresh token."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        # Create tokens
        tokens = await auth_service.exchange_account_for_tokens(account)

        # Create authenticated client with access token
        headers = {"Authorization": f"Bearer {tokens.access_token}"}

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": tokens.refresh_token},
            headers=headers,
        )

        assert response.status_code == 204

        # Verify refresh token is now invalid
        from src.modules.auth.auth_service import InvalidRefreshTokenException

        with pytest.raises(InvalidRefreshTokenException):
            await auth_service.validate_refresh_token(tokens.refresh_token)

    @pytest.mark.asyncio
    async def test_logout_missing_access_token(self, auth_service, account_utils) -> None:
        """Test logout without access token fails."""
        account_entity = await account_utils.create_one()
        refresh_token, _ = await auth_service.create_refresh_token(account_entity.id)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logout_expired_access_token(self, account_utils) -> None:
        """Test logout with expired access token fails."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        # Create expired access token
        expired_token = self.auth_utils.create_mock_access_token(account=account, expired=True)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": "any-refresh-token"},
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401
