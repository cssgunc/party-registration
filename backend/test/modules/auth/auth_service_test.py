from datetime import UTC, datetime, timedelta

import pytest
from src.core.config import env
from src.core.exceptions import CredentialsException
from src.modules.account.account_model import AccountDto, AccountRole
from src.modules.auth.auth_model import AccountAccessTokenPayload
from src.modules.auth.auth_service import AuthService, InvalidRefreshTokenException
from src.modules.police.police_model import PoliceAccountDto

from test.modules.account.account_utils import AccountTestUtils
from test.modules.auth.auth_utils import AuthTestUtils
from test.modules.police.police_utils import PoliceTestUtils


class TestAuthService:
    auth_utils: AuthTestUtils
    auth_service: AuthService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        auth_utils: AuthTestUtils,
        auth_service: AuthService,
    ):
        self.auth_utils = auth_utils
        self.auth_service = auth_service

    # ========================= JWT Creation Tests =========================

    @pytest.mark.asyncio
    async def test_create_account_access_token(self) -> None:
        """Test creating access token for account."""
        account = AccountDto(
            id=1,
            email="test@unc.edu",
            first_name="Test",
            last_name="User",
            pid="111111111",
            onyen="testuser",
            role=AccountRole.STUDENT,
        )

        token, expires_at = AuthService.create_account_access_token(account)

        # Decode and verify
        payload = self.auth_utils.decode_token(token)
        assert payload["sub"] == "account"
        assert payload["email"] == account.email
        assert payload["first_name"] == account.first_name
        assert payload["last_name"] == account.last_name
        assert payload["pid"] == account.pid
        assert payload["role"] == account.role.value

        # Verify expiration is ~15 minutes from now
        assert abs((expires_at - datetime.now(UTC)).total_seconds() - 900) < 5

    @pytest.mark.asyncio
    async def test_create_police_access_token(self) -> None:
        """Test creating access token for police."""
        police = PoliceAccountDto(email="police@unc.edu")

        token, expires_at = AuthService.create_police_access_token(police)

        # Decode and verify
        payload = self.auth_utils.decode_token(token)
        assert payload["sub"] == "police"
        assert payload["email"] == police.email
        assert "first_name" not in payload
        assert "role" not in payload

        # Verify expiration is ~15 minutes from now
        assert abs((expires_at - datetime.now(UTC)).total_seconds() - 900) < 5

    # ========================= JWT Validation Tests =========================

    @pytest.mark.asyncio
    async def test_decode_access_token_valid(self) -> None:
        """Test decoding a valid access token."""
        account = AccountDto(
            id=1,
            email="test@unc.edu",
            first_name="Test",
            last_name="User",
            pid="111111111",
            onyen="testuser",
            role=AccountRole.ADMIN,
        )

        token = self.auth_utils.create_mock_access_token(account=account)
        payload = AuthService.decode_access_token(token)

        assert isinstance(payload, AccountAccessTokenPayload)
        assert payload.sub == "account"
        assert payload.email == account.email
        assert payload.role == "admin"

    @pytest.mark.asyncio
    async def test_decode_access_token_expired(self) -> None:
        """Test decoding an expired token raises CredentialsException."""
        account = AccountDto(
            id=1,
            email="test@unc.edu",
            first_name="Test",
            last_name="User",
            pid="111111111",
            onyen="testuser",
            role=AccountRole.STUDENT,
        )

        token = self.auth_utils.create_mock_access_token(account=account, expired=True)

        with pytest.raises(CredentialsException):
            AuthService.decode_access_token(token)

    @pytest.mark.asyncio
    async def test_decode_access_token_invalid(self) -> None:
        """Test decoding an invalid token raises CredentialsException."""
        with pytest.raises(CredentialsException):
            AuthService.decode_access_token("invalid.token.here")

    # ========================= Refresh Token Tests =========================

    @pytest.mark.asyncio
    async def test_create_refresh_token_account(self, account_utils: AccountTestUtils) -> None:
        """Test creating refresh token for account."""
        account_entity = await account_utils.create_one()
        account_id = account_entity.id

        token, expires_at = await self.auth_service.create_refresh_token(account_id)

        # Decode and verify (sub is stored as string)
        payload = self.auth_utils.decode_token(token, env.REFRESH_TOKEN_SECRET_KEY)
        assert payload["sub"] == str(account_id)
        assert "jti" in payload

        # Verify expiration is ~7 days from now
        expected_seconds = 7 * 24 * 60 * 60
        actual_seconds = (expires_at - datetime.now(UTC)).total_seconds()
        assert abs(actual_seconds - expected_seconds) < 5

        # Verify token hash is stored in database
        jti = payload["jti"]
        token_hash = AuthService._hash_token_id(jti)

        # Query database to verify
        from sqlalchemy import select
        from src.modules.auth.refresh_token_entity import RefreshTokenEntity

        result = await self.auth_service.session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
        )
        entity = result.scalar_one_or_none()

        assert entity is not None
        assert entity.account_id == account_id
        assert entity.token_hash == token_hash

    @pytest.mark.asyncio
    async def test_create_refresh_token_police(self) -> None:
        """Test creating refresh token for police (account_id = None)."""
        token, _ = await self.auth_service.create_refresh_token(None)

        # Decode and verify (sub is "police" sentinel for police tokens)
        payload = self.auth_utils.decode_token(token, env.REFRESH_TOKEN_SECRET_KEY)
        assert payload["sub"] == "police"
        assert "jti" in payload

        # Verify token hash is stored in database
        jti = payload["jti"]
        token_hash = AuthService._hash_token_id(jti)

        from sqlalchemy import select
        from src.modules.auth.refresh_token_entity import RefreshTokenEntity

        result = await self.auth_service.session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
        )
        entity = result.scalar_one_or_none()

        assert entity is not None
        assert entity.account_id is None

    @pytest.mark.asyncio
    async def test_validate_refresh_token_valid(self, account_utils: AccountTestUtils) -> None:
        """Test validating a valid refresh token."""
        account_entity = await account_utils.create_one()
        account_id = account_entity.id
        token, _ = await self.auth_service.create_refresh_token(account_id)

        validated_account_id = await self.auth_service.validate_refresh_token(token)

        assert validated_account_id == account_id

    @pytest.mark.asyncio
    async def test_validate_refresh_token_expired(self) -> None:
        """Test validating an expired refresh token raises exception."""
        # Create police entity with past expiration (no FK constraint for None account_id)
        jti = "test-jti-expired"
        token_hash = AuthService._hash_token_id(jti)
        await self.auth_utils.create_refresh_token_entity(
            account_id=None,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) - timedelta(hours=1),
        )

        # Create matching JWT token
        import jwt

        payload = {
            "jti": jti,
            "sub": "police",  # police sentinel; JWT not expired yet but DB entity is expired
            "exp": datetime.now(UTC) + timedelta(hours=1),
            "iat": datetime.now(UTC),
        }
        token = jwt.encode(payload, env.REFRESH_TOKEN_SECRET_KEY, algorithm=env.JWT_ALGORITHM)

        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.validate_refresh_token(token)

        # Verify the expired token was deleted from the database
        from sqlalchemy import select
        from src.modules.auth.refresh_token_entity import RefreshTokenEntity

        result = await self.auth_service.session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
        )
        deleted_entity = result.scalar_one_or_none()
        assert deleted_entity is None

    @pytest.mark.asyncio
    async def test_validate_refresh_token_not_in_allowlist(self) -> None:
        """Test validating a token not in the database allow-list."""
        import jwt

        # Create token but don't store in database
        payload = {
            "jti": "not-in-db",
            "sub": "police",
            "exp": datetime.now(UTC) + timedelta(days=7),
            "iat": datetime.now(UTC),
        }
        token = jwt.encode(payload, env.REFRESH_TOKEN_SECRET_KEY, algorithm=env.JWT_ALGORITHM)

        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.validate_refresh_token(token)

    @pytest.mark.asyncio
    async def test_validate_refresh_token_invalid_jwt(self) -> None:
        """Test validating an invalid JWT raises exception."""
        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.validate_refresh_token("invalid.jwt.token")

    @pytest.mark.asyncio
    async def test_revoke_refresh_token(self, account_utils: AccountTestUtils) -> None:
        """Test revoking a refresh token removes it from database."""
        account_entity = await account_utils.create_one()
        account_id = account_entity.id
        token, _ = await self.auth_service.create_refresh_token(account_id)

        # Verify token is valid before revocation
        validated_id = await self.auth_service.validate_refresh_token(token)
        assert validated_id == account_id

        # Revoke token
        await self.auth_service.revoke_refresh_token(token)

        # Verify token is now invalid
        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.validate_refresh_token(token)

    @pytest.mark.asyncio
    async def test_revoke_refresh_token_nonexistent(self) -> None:
        """Test revoking a nonexistent token silently succeeds."""
        import jwt

        payload = {
            "jti": "nonexistent",
            "sub": "police",
            "exp": datetime.now(UTC) + timedelta(days=7),
            "iat": datetime.now(UTC),
        }
        token = jwt.encode(payload, env.REFRESH_TOKEN_SECRET_KEY, algorithm=env.JWT_ALGORITHM)

        # Should not raise exception
        await self.auth_service.revoke_refresh_token(token)

    @pytest.mark.asyncio
    async def test_revoke_refresh_token_invalid(self) -> None:
        """Test revoking an invalid token silently succeeds."""
        # Should not raise exception
        await self.auth_service.revoke_refresh_token("invalid.token")

    # ========================= High-Level Operations Tests =========================

    @pytest.mark.asyncio
    async def test_exchange_account_for_tokens(self, account_utils: AccountTestUtils) -> None:
        """Test exchanging account for token pair."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        tokens = await self.auth_service.exchange_account_for_tokens(account)

        # Verify access token
        access_payload = self.auth_utils.decode_token(tokens.access_token)
        assert access_payload["sub"] == "account"
        assert access_payload["email"] == account.email

        # Verify refresh token (sub is string)
        refresh_payload = self.auth_utils.decode_token(
            tokens.refresh_token, env.REFRESH_TOKEN_SECRET_KEY
        )
        assert refresh_payload["sub"] == str(account.id)

    @pytest.mark.asyncio
    async def test_exchange_police_for_tokens(self) -> None:
        """Test exchanging police account for token pair."""
        police = PoliceAccountDto(email="police@unc.edu")

        tokens = await self.auth_service.exchange_police_for_tokens(police)

        # Verify access token
        access_payload = self.auth_utils.decode_token(tokens.access_token)
        assert access_payload["sub"] == "police"
        assert access_payload["email"] == police.email

        # Verify refresh token (sub is "police" sentinel)
        refresh_payload = self.auth_utils.decode_token(
            tokens.refresh_token, env.REFRESH_TOKEN_SECRET_KEY
        )
        assert refresh_payload["sub"] == "police"

    @pytest.mark.asyncio
    async def test_refresh_access_token_account(self, account_utils: AccountTestUtils) -> None:
        """Test refreshing access token for account."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        # Create refresh token
        refresh_token, _ = await self.auth_service.create_refresh_token(account.id)

        # Refresh access token
        new_access = await self.auth_service.refresh_access_token(refresh_token)

        # Verify new access token
        payload = self.auth_utils.decode_token(new_access.access_token)
        assert payload["sub"] == "account"
        assert payload["email"] == account.email

    @pytest.mark.asyncio
    async def test_refresh_access_token_police(self, police_utils: PoliceTestUtils) -> None:
        """Test refreshing access token for police."""
        police_entity = await police_utils.create_one()

        # Create refresh token
        refresh_token, _ = await self.auth_service.create_refresh_token(None)

        # Refresh access token
        new_access = await self.auth_service.refresh_access_token(refresh_token)

        # Verify new access token
        payload = self.auth_utils.decode_token(new_access.access_token)
        assert payload["sub"] == "police"
        assert payload["email"] == police_entity.email

    @pytest.mark.asyncio
    async def test_refresh_access_token_invalid(self) -> None:
        """Test refreshing with invalid token raises exception."""
        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.refresh_access_token("invalid.token")
