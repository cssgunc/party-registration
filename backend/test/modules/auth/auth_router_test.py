from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from src.core.config import env
from src.core.exceptions import (
    BadRequestException,
    CredentialsException,
    ForbiddenException,
)
from src.modules.account.account_model import AccountData, AccountDto, AccountRole, InviteTokenRole
from src.modules.auth.auth_model import AccessTokenDto, PoliceCredentialsDto, TokensDto
from src.modules.auth.auth_service import (
    AuthService,
    InvalidInternalSecretException,
    InvalidRefreshTokenException,
)
from src.modules.police.police_model import PoliceAccountDto, PoliceRole
from src.modules.police.police_service import PoliceConflictException
from src.modules.student.student_model import StudentDto

from test.modules.account.account_utils import AccountTestUtils
from test.modules.account.invite_token_utils import InviteTokenTestUtils
from test.modules.auth.auth_utils import AuthTestUtils
from test.modules.police.police_utils import PoliceTestUtils
from test.modules.student.student_utils import StudentTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_success,
    assert_res_validation_error,
)


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
    async def test_exchange_student_creates_account_if_not_found(
        self, account_utils: AccountTestUtils
    ) -> None:
        """Student exchange creates a new account when onyen doesn't exist."""
        account_data = await account_utils.next_data(role="student")

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, TokensDto)
        payload = self.auth_utils.decode_token(data.access_token)
        expected = AccountDto(
            id=int(payload["sub"]),
            email=account_data.email,
            first_name=account_data.first_name,
            last_name=account_data.last_name,
            pid=account_data.pid,
            onyen=account_data.onyen,
            role=AccountRole.STUDENT,
        )
        self.auth_utils.assert_account_token_payload(payload, expected)

    @pytest.mark.asyncio
    async def test_exchange_student_upserts_idp_fields_leaves_role(
        self, account_utils: AccountTestUtils
    ) -> None:
        """Student exchange overwrites IdP fields but never touches role."""
        existing = await account_utils.create_one(role="student")

        updated_data = AccountData(
            email="newemail@unc.edu",
            first_name="Updated",
            last_name="Name",
            pid="987654321",
            onyen=existing.onyen,
            role=AccountRole.STUDENT,
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=updated_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, TokensDto)
        payload = self.auth_utils.decode_token(data.access_token)
        expected = AccountDto(
            id=int(payload["sub"]),
            email=updated_data.email,
            first_name=updated_data.first_name,
            last_name=updated_data.last_name,
            pid=updated_data.pid,
            onyen=updated_data.onyen,
            role=AccountRole.STUDENT,
        )
        self.auth_utils.assert_account_token_payload(payload, expected)

    @pytest.mark.asyncio
    async def test_exchange_staff_success_via_invite(
        self, account_utils: AccountTestUtils, invite_token_utils: InviteTokenTestUtils
    ) -> None:
        """Staff exchange provisions an account when a valid invite token exists."""
        idp_data = await account_utils.next_data(role="staff")
        invite = await invite_token_utils.create_one(
            email=idp_data.email, role=InviteTokenRole.STAFF
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=idp_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        result = assert_res_success(response, TokensDto)
        payload = self.auth_utils.decode_token(result.access_token)
        assert "email" not in payload
        assert payload["role"] == AccountRole.STAFF.value

        remaining_tokens = await invite_token_utils.get_all()
        InviteTokenTestUtils.assert_token_deleted(invite, remaining_tokens)

    @pytest.mark.asyncio
    async def test_exchange_admin_success_via_invite(
        self, account_utils: AccountTestUtils, invite_token_utils: InviteTokenTestUtils
    ) -> None:
        """Admin exchange provisions an account when a valid invite token exists."""
        idp_data = await account_utils.next_data(role="admin")
        invite = await invite_token_utils.create_one(
            email=idp_data.email, role=InviteTokenRole.ADMIN
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=idp_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        result = assert_res_success(response, TokensDto)
        payload = self.auth_utils.decode_token(result.access_token)
        assert "email" not in payload
        assert payload["role"] == AccountRole.ADMIN.value

        remaining_tokens = await invite_token_utils.get_all()
        InviteTokenTestUtils.assert_token_deleted(invite, remaining_tokens)

    @pytest.mark.asyncio
    async def test_exchange_invite_role_overrides_payload_role(
        self, account_utils: AccountTestUtils, invite_token_utils: InviteTokenTestUtils
    ) -> None:
        """Role in the provisioned account comes from the invite token, not the SSO payload."""
        idp_data = await account_utils.next_data(role="admin")
        await invite_token_utils.create_one(email=idp_data.email, role=InviteTokenRole.STAFF)

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=idp_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        result = assert_res_success(response, TokensDto)
        payload = self.auth_utils.decode_token(result.access_token)
        assert payload["role"] == AccountRole.STAFF.value

    @pytest.mark.asyncio
    async def test_exchange_staff_no_invite_returns_403(
        self, account_utils: AccountTestUtils
    ) -> None:
        """Staff exchange returns 403 when no invite token exists for the email."""
        data = await account_utils.next_data(role="staff")

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert_res_failure(response, ForbiddenException("No matching invite token found"))

    @pytest.mark.asyncio
    async def test_exchange_admin_no_invite_returns_403(
        self, account_utils: AccountTestUtils
    ) -> None:
        """Admin exchange returns 403 when no invite token exists for the email."""
        data = await account_utils.next_data(role="admin")

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert_res_failure(response, ForbiddenException("No matching invite token found"))

    @pytest.mark.asyncio
    async def test_exchange_expired_invite_returns_403(
        self, account_utils: AccountTestUtils, invite_token_utils: InviteTokenTestUtils
    ) -> None:
        """Exchange returns 403 when the invite token is expired."""
        idp_data = await account_utils.next_data(role="staff")
        await invite_token_utils.create_expired(email=idp_data.email, role=InviteTokenRole.STAFF)

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=idp_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert_res_failure(response, ForbiddenException("Invite token has expired"))

    @pytest.mark.asyncio
    async def test_exchange_matches_existing_staff_account_by_pid_and_deletes_invite(
        self, account_utils: AccountTestUtils, invite_token_utils: InviteTokenTestUtils
    ) -> None:
        existing = await account_utils.create_one(role="staff")
        idp_data = await account_utils.next_data(
            role="staff",
            pid=existing.pid,
            onyen="updatedonyen",
            email="updated-staff@unc.edu",
        )
        invite = await invite_token_utils.create_one(
            email=idp_data.email, role=InviteTokenRole.STAFF
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=idp_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        result = assert_res_success(response, TokensDto)
        payload = self.auth_utils.decode_token(result.access_token)
        assert payload["sub"] == str(existing.id)
        assert payload["role"] == AccountRole.STAFF.value
        for field in ("email", "pid", "onyen", "first_name", "last_name"):
            assert field not in payload

        remaining_tokens = await invite_token_utils.get_all()
        InviteTokenTestUtils.assert_token_deleted(invite, remaining_tokens)

    @pytest.mark.asyncio
    async def test_exchange_existing_staff_account_pid_match_does_not_require_invite(
        self, account_utils: AccountTestUtils
    ) -> None:
        existing = await account_utils.create_one(role="staff")
        idp_data = await account_utils.next_data(
            role="staff",
            pid=existing.pid,
            onyen="newonyen",
            email="matched-by-pid@unc.edu",
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=idp_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        result = assert_res_success(response, TokensDto)
        payload = self.auth_utils.decode_token(result.access_token)
        assert payload["sub"] == str(existing.id)
        assert payload["role"] == AccountRole.STAFF.value
        for field in ("email", "pid", "onyen", "first_name", "last_name"):
            assert field not in payload

    @pytest.mark.asyncio
    async def test_exchange_missing_internal_secret(self, account_utils: AccountTestUtils) -> None:
        """Test exchange without internal secret returns 422."""
        account_data = await account_utils.next_data()

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
        )

        assert_res_validation_error(response)

    @pytest.mark.asyncio
    async def test_exchange_invalid_internal_secret(self, account_utils: AccountTestUtils) -> None:
        """Test exchange with invalid internal secret returns 403."""
        account_data = await account_utils.next_data()

        response = await self.unauthenticated_client.post(
            "/api/auth/exchange",
            json=account_data.model_dump(mode="json"),
            headers={"X-Internal-Secret": "invalid-secret"},
        )

        assert_res_failure(response, InvalidInternalSecretException())

    # ========================= /auth/police/login Tests =========================

    @pytest.mark.asyncio
    async def test_police_login_success(self, police_utils: PoliceTestUtils) -> None:
        """Test police login with valid credentials for a verified officer."""
        police_entity = await police_utils.create_verified_one()

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

        payload = self.auth_utils.decode_token(data.access_token)
        self.auth_utils.assert_police_token_payload(
            payload,
            PoliceAccountDto(
                id=police_entity.id,
                email=police_entity.email,
                role=PoliceRole.OFFICER,
                is_verified=True,
            ),
        )

    @pytest.mark.asyncio
    async def test_police_login_unverified_returns_403(self, police_utils: PoliceTestUtils) -> None:
        """Test that an unverified police officer cannot login."""
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

        assert_res_failure(response, ForbiddenException("EMAIL_NOT_VERIFIED"))

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

        assert_res_validation_error(response)

    # ========================= /auth/refresh Tests =========================

    @pytest.mark.asyncio
    async def test_refresh_access_token_success(
        self, auth_service: AuthService, account_utils: AccountTestUtils
    ) -> None:
        """Test refreshing access token with valid refresh token."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        refresh_token, _ = await auth_service.create_refresh_token(account_id=account.id)

        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        data = assert_res_success(response, AccessTokenDto)
        payload = self.auth_utils.decode_token(data.access_token)
        self.auth_utils.assert_account_token_payload(payload, account)

    @pytest.mark.asyncio
    async def test_refresh_access_token_invalid(self) -> None:
        """Test refreshing with invalid token fails."""
        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert_res_failure(response, InvalidRefreshTokenException())

    @pytest.mark.asyncio
    async def test_refresh_with_revoked_token(
        self, auth_service: AuthService, account_utils: AccountTestUtils
    ) -> None:
        """Test that a previously valid, now-revoked refresh token is rejected."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        refresh_token, _ = await auth_service.create_refresh_token(account_id=account.id)

        # Revoke the token
        await auth_service.revoke_refresh_token(refresh_token)

        # Attempt to use the revoked token
        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
            headers={"X-Internal-Secret": env.INTERNAL_API_SECRET},
        )

        assert_res_failure(response, InvalidRefreshTokenException())

    @pytest.mark.asyncio
    async def test_refresh_access_token_missing_internal_secret(
        self, auth_service: AuthService, account_utils: AccountTestUtils
    ) -> None:
        """Test refresh without internal secret returns 422."""
        account_entity = await account_utils.create_one()
        refresh_token, _ = await auth_service.create_refresh_token(account_id=account_entity.id)

        response = await self.unauthenticated_client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert_res_validation_error(response)

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
        refresh_token, _ = await auth_service.create_refresh_token(account_id=account_entity.id)

        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": refresh_token},
        )

        assert_res_failure(response, CredentialsException())

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

        assert_res_failure(response, CredentialsException())


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

        assert_res_failure(response, CredentialsException())

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

        assert_res_failure(response, CredentialsException())

    @pytest.mark.asyncio
    async def test_missing_token_returns_401(self) -> None:
        """Request with no Authorization header is rejected with 401."""
        response = await self.unauthenticated_client.post(
            "/api/auth/logout",
            json={"refresh_token": "any"},
        )

        assert_res_failure(response, CredentialsException())

    @pytest.mark.asyncio
    async def test_wrong_role_returns_403(self, account_utils: AccountTestUtils) -> None:
        """Student token on admin/staff-only route returns 403."""
        account_entity = await account_utils.create_one(role="student")
        token, _ = self.auth_service.create_account_access_token(account_entity.to_dto())

        response = await self.unauthenticated_client.get(
            "/api/parties/1",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert_res_failure(response, ForbiddenException("Insufficient privileges"))

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

        data = assert_res_success(response, StudentDto)
        assert data.id == account_entity.id


class TestPoliceSignupRouter:
    unauthenticated_client: AsyncClient
    police_utils: PoliceTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        unauthenticated_client: AsyncClient,
        police_utils: PoliceTestUtils,
        fast_bcrypt: None,
    ):
        self.unauthenticated_client = unauthenticated_client
        self.police_utils = police_utils

    @pytest.mark.asyncio
    async def test_signup_success_returns_204(self) -> None:
        """Test police signup returns 204 and creates an unverified record."""
        data = await self.police_utils.next_data()
        payload = {
            "email": data.email,
            "password": data.password,
            "confirm_password": data.password,
        }

        response = await self.unauthenticated_client.post(
            "/api/auth/police/signup",
            json=payload,
        )

        assert response.status_code == 204
        all_police = await self.police_utils.get_all()
        created = next(p for p in all_police if p.email == data.email)
        self.police_utils.assert_unverified(created)

    @pytest.mark.asyncio
    async def test_signup_duplicate_email_returns_409(self) -> None:
        """Test signup with a duplicate email returns 409."""
        existing = await self.police_utils.create_one()
        # Capture before the HTTP request, which triggers a session rollback that expires entities
        email = existing.email
        payload = {
            "email": email,
            "password": "somepassword",
            "confirm_password": "somepassword",
        }

        response = await self.unauthenticated_client.post(
            "/api/auth/police/signup",
            json=payload,
        )

        assert_res_failure(response, PoliceConflictException(email))

    @pytest.mark.asyncio
    async def test_signup_passwords_mismatch_returns_422(self) -> None:
        """Test signup with mismatched passwords returns 422."""
        data = await self.police_utils.next_data()
        payload = {
            "email": data.email,
            "password": "password1",
            "confirm_password": "password2",
        }

        response = await self.unauthenticated_client.post(
            "/api/auth/police/signup",
            json=payload,
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_signup_short_password_returns_422(self) -> None:
        """Test signup with a password shorter than 8 characters returns 422."""
        data = await self.police_utils.next_data()
        payload = {
            "email": data.email,
            "password": "short",
            "confirm_password": "short",
        }

        response = await self.unauthenticated_client.post(
            "/api/auth/police/signup",
            json=payload,
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_signup_wrong_domain_returns_400(self) -> None:
        """Test signup with an email from a non-CHPD domain returns 400."""
        payload = {
            "email": "officer@notchpd.com",
            "password": self.police_utils.TEST_PASSWORD,
            "confirm_password": self.police_utils.TEST_PASSWORD,
        }

        response = await self.unauthenticated_client.post(
            "/api/auth/police/signup",
            json=payload,
        )

        assert_res_failure(
            response,
            BadRequestException(f"CHPD email must use the @{env.CHPD_EMAIL_DOMAIN} domain"),
        )


class TestPoliceEmailVerificationRouter:
    unauthenticated_client: AsyncClient
    police_utils: PoliceTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        unauthenticated_client: AsyncClient,
        police_utils: PoliceTestUtils,
    ):
        self.unauthenticated_client = unauthenticated_client
        self.police_utils = police_utils

    @pytest.mark.asyncio
    async def test_verify_success_returns_204(self) -> None:
        """Test email verification with a valid token returns 204 and marks police as verified."""
        entity = await self.police_utils.create_with_token()

        response = await self.unauthenticated_client.post(
            "/api/auth/police/verify",
            json={"token": entity.verification_token},
        )

        assert response.status_code == 204
        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        self.police_utils.assert_verified(updated)

    @pytest.mark.asyncio
    async def test_verify_invalid_token_returns_400(self) -> None:
        """Test email verification with an invalid token returns 400."""
        response = await self.unauthenticated_client.post(
            "/api/auth/police/verify",
            json={"token": "not_a_real_token"},
        )

        assert_res_failure(response, BadRequestException("Invalid verification token"))

    @pytest.mark.asyncio
    async def test_verify_expired_token_returns_400(self) -> None:
        """Test email verification with an expired token returns 400."""
        entity = await self.police_utils.create_with_token(
            expires_at=datetime.now(UTC) - timedelta(hours=1)
        )

        response = await self.unauthenticated_client.post(
            "/api/auth/police/verify",
            json={"token": entity.verification_token},
        )

        assert_res_failure(response, BadRequestException("Verification token has expired"))


class TestPoliceRetryVerificationRouter:
    unauthenticated_client: AsyncClient
    police_utils: PoliceTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        unauthenticated_client: AsyncClient,
        police_utils: PoliceTestUtils,
    ):
        self.unauthenticated_client = unauthenticated_client
        self.police_utils = police_utils

    @pytest.mark.asyncio
    async def test_retry_verification_success_returns_204(self) -> None:
        """Retry verification returns 204 for an unverified account."""
        entity = await self.police_utils.create_with_token()
        original_token = entity.verification_token

        response = await self.unauthenticated_client.post(
            "/api/auth/police/retry-verification",
            json={"email": entity.email},
        )

        assert response.status_code == 204
        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        self.police_utils.assert_unverified(updated)
        assert updated.verification_token != original_token

    @pytest.mark.asyncio
    async def test_retry_verification_missing_account_returns_204(self) -> None:
        """Retry verification returns 204 for an unknown email to prevent enumeration."""
        response = await self.unauthenticated_client.post(
            "/api/auth/police/retry-verification",
            json={"email": "missing@unc.edu"},
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_retry_verification_verified_account_returns_204(self) -> None:
        """Retry verification returns 204 for an already-verified account to prevent enumeration."""
        entity = await self.police_utils.create_verified_one()

        response = await self.unauthenticated_client.post(
            "/api/auth/police/retry-verification",
            json={"email": entity.email},
        )

        assert response.status_code == 204
