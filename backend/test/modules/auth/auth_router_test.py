import pytest
from httpx import AsyncClient
from src.core.config import env
from src.core.exceptions import CredentialsException
from src.modules.account.account_model import AccountData, AccountRole
from src.modules.auth.auth_model import PoliceCredentialsDto, TokensDto
from src.modules.auth.auth_service import AuthService, InvalidRefreshTokenException
from src.modules.police.police_model import PoliceAccountDto

from test.modules.account.account_utils import AccountTestUtils
from test.modules.auth.auth_utils import AuthTestUtils
from test.modules.police.police_utils import PoliceTestUtils
from test.modules.student.student_utils import StudentTestUtils
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
    async def test_exchange_new_account_success(self, account_utils: AccountTestUtils) -> None:
        """Test exchanging account data for tokens creates new account."""
        account_data = await account_utils.next_data()

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, TokensDto)
        assert data.access_token
        assert data.refresh_token

        payload = self.auth_utils.decode_token(data.access_token)
        assert payload["email"] == account_data.email
        assert payload["first_name"] == account_data.first_name
        assert payload["role"] == account_data.role.value

    @pytest.mark.asyncio
    async def test_exchange_existing_account_updates(self, account_utils: AccountTestUtils) -> None:
        """Test exchanging existing account data updates the account."""
        existing_account = await account_utils.create_one(email="existing@unc.edu", role="student")

        updated_data = AccountData(
            email="existing@unc.edu",
            first_name="Updated",
            last_name="Name",
            pid=existing_account.pid,
            onyen=existing_account.onyen,
            role=AccountRole.ADMIN,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=updated_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, TokensDto)

        payload = self.auth_utils.decode_token(data.access_token)
        assert payload["first_name"] == "Updated"
        assert payload["last_name"] == "Name"
        assert payload["role"] == "admin"

    @pytest.mark.asyncio
    async def test_exchange_missing_internal_secret(self, account_utils: AccountTestUtils) -> None:
        """Test exchange without internal secret returns 422."""
        account_data = await account_utils.next_data()

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_exchange_invalid_internal_secret(self, account_utils: AccountTestUtils) -> None:
        """Test exchange with invalid internal secret returns 403."""
        account_data = await account_utils.next_data()

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": "invalid-secret"},
        )

        assert response.status_code == 403

    # ========================= /auth/police/login Tests =========================

    @pytest.mark.asyncio
    async def test_police_login_success(self, police_utils: PoliceTestUtils) -> None:
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

        payload = self.auth_utils.decode_token(data.access_token)
        self.auth_utils.assert_police_token_payload(
            payload, PoliceAccountDto(email=police_entity.email)
        )

    @pytest.mark.asyncio
    async def test_police_login_wrong_password(self, police_utils: PoliceTestUtils) -> None:
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
    async def test_police_login_wrong_email(self, police_utils: PoliceTestUtils) -> None:
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
    async def test_police_login_missing_internal_secret(
        self, police_utils: PoliceTestUtils
    ) -> None:
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
    async def test_refresh_access_token_success(
        self, auth_service: AuthService, account_utils: AccountTestUtils
    ) -> None:
        """Test refreshing access token with valid refresh token."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

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
    async def test_refresh_with_revoked_token(
        self, auth_service: AuthService, account_utils: AccountTestUtils
    ) -> None:
        """Test that a previously valid, now-revoked refresh token is rejected."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        refresh_token, _ = await auth_service.create_refresh_token(account.id)

        # Revoke the token
        await auth_service.revoke_refresh_token(refresh_token)

        # Attempt to use the revoked token
        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_access_token_missing_internal_secret(
        self, auth_service: AuthService, account_utils: AccountTestUtils
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
    async def test_logout_success(
        self, auth_service: AuthService, account_utils: AccountTestUtils
    ) -> None:
        """Test logout revokes refresh token."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        tokens = await auth_service.exchange_account_for_tokens(account)

        headers = {"Authorization": f"Bearer {tokens.access_token}"}

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": tokens.refresh_token},
            headers=headers,
        )

        assert response.status_code == 204

        with pytest.raises(InvalidRefreshTokenException):
            await auth_service.validate_refresh_token(tokens.refresh_token)

    @pytest.mark.asyncio
    async def test_logout_missing_access_token(
        self, auth_service: AuthService, account_utils: AccountTestUtils
    ) -> None:
        """Test logout without access token fails."""
        account_entity = await account_utils.create_one()
        refresh_token, _ = await auth_service.create_refresh_token(account_entity.id)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logout_expired_access_token(self, account_utils: AccountTestUtils) -> None:
        """Test logout with expired access token fails."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        expired_token = self.auth_utils.create_mock_access_token(account=account, expired=True)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": "any-refresh-token"},
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401


class TestAuthMiddleware:
    """Tests for the authentication middleware (authenticate_by_role)."""

    unauthenticated_client: AsyncClient
    auth_utils: AuthTestUtils
    auth_service: AuthService
    student_utils: StudentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        unauthenticated_client: AsyncClient,
        auth_utils: AuthTestUtils,
        auth_service: AuthService,
        student_utils: StudentTestUtils,
    ):
        self.unauthenticated_client = unauthenticated_client
        self.auth_utils = auth_utils
        self.auth_service = auth_service
        self.student_utils = student_utils

    @pytest.mark.asyncio
    async def test_valid_account_token_authenticates(self, account_utils: AccountTestUtils) -> None:
        """Valid account token passes middleware and authenticates request."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        tokens = await self.auth_service.exchange_account_for_tokens(account)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": tokens.refresh_token},
            headers={"Authorization": f"Bearer {tokens.access_token}"},
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_valid_police_token_authenticates(self, police_utils: PoliceTestUtils) -> None:
        """Valid police token passes middleware and authenticates request."""
        police_entity = await police_utils.create_one()
        police_dto = police_entity.to_dto()

        tokens = await self.auth_service.exchange_police_for_tokens(police_dto)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": tokens.refresh_token},
            headers={"Authorization": f"Bearer {tokens.access_token}"},
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self) -> None:
        """Invalid token is rejected with 401."""
        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": "any"},
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_returns_401(self, account_utils: AccountTestUtils) -> None:
        """Expired token is rejected with 401."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()
        expired_token = self.auth_utils.create_mock_access_token(account=account, expired=True)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": "any"},
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_missing_token_returns_401(self) -> None:
        """Request with no Authorization header is rejected with 401."""
        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": "any"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_wrong_role_returns_403(self, account_utils: AccountTestUtils) -> None:
        """Student token on admin/staff-only route returns 403."""
        account_entity = await account_utils.create_one(role="student")
        token, _ = self.auth_service.create_account_access_token(account_entity.to_dto())

        response = await self.unauthenticated_client.get(
            "/api/parties/1",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_account_token_payload_has_correct_id(
        self, account_utils: AccountTestUtils
    ) -> None:
        """Middleware correctly uses sub as the account id when looking up the student."""
        account_entity = await account_utils.create_one(role="student")
        await self.student_utils.create_one(account_id=account_entity.id)
        token, _ = self.auth_service.create_account_access_token(account_entity.to_dto())

        response = await self.unauthenticated_client.get(
            "/api/students/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == account_entity.id
