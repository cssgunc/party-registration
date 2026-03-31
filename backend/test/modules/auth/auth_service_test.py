from datetime import UTC, datetime, timedelta

import jwt
import pytest
from sqlalchemy import select
from src.core.config import env
from src.core.exceptions import CredentialsException
from src.modules.account.account_model import AccountDto
from src.modules.auth.auth_model import AccountAccessTokenPayload, PoliceAccessTokenPayload
from src.modules.auth.auth_service import AuthService, InvalidRefreshTokenException
from src.modules.auth.refresh_token_entity import RefreshTokenEntity
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
    async def test_create_account_access_token(self, account_utils: AccountTestUtils) -> None:
        """Test creating access token for account."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        token, expires_at = self.auth_service.create_account_access_token(account)

        payload = self.auth_utils.decode_token(token)
        self.auth_utils.assert_account_token_payload(payload, account)
        self.auth_utils.assert_expiration_approx(expires_at, 900)

    @pytest.mark.asyncio
    async def test_create_police_access_token(self) -> None:
        """Test creating access token for police."""
        police = PoliceAccountDto(email="police@unc.edu")

        token, expires_at = self.auth_service.create_police_access_token(police)

        payload = self.auth_utils.decode_token(token)
        self.auth_utils.assert_police_token_payload(payload, police)
        self.auth_utils.assert_expiration_approx(expires_at, 900)

    # ========================= JWT Validation Tests =========================

    @pytest.mark.asyncio
    async def test_decode_access_token_valid(self, account_utils: AccountTestUtils) -> None:
        """Test decoding a valid account access token."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        token = self.auth_utils.create_mock_access_token(account=account)
        payload = self.auth_service.decode_access_token(token)

        assert isinstance(payload, AccountAccessTokenPayload)
        self.auth_utils.assert_account_token_payload(payload, account)

    @pytest.mark.asyncio
    async def test_decode_police_access_token(self) -> None:
        """Test decoding a valid police access token."""
        police = PoliceAccountDto(email="police@unc.edu")

        token = self.auth_utils.create_mock_access_token(police=police)
        payload = self.auth_service.decode_access_token(token)

        assert isinstance(payload, PoliceAccessTokenPayload)
        self.auth_utils.assert_police_token_payload(payload, police)

    @pytest.mark.asyncio
    async def test_decode_access_token_invalid_account_id(
        self, account_utils: AccountTestUtils
    ) -> None:
        """Test decoding a valid JWT with a nonexistent account id.

        decode_access_token does not check the DB, so decoding itself succeeds.
        DB lookup failure happens downstream in route handlers.
        """
        data = account_utils.get_or_default()
        fake_account = AccountDto(id=99999, **data)

        token = self.auth_utils.create_mock_access_token(account=fake_account)
        payload = self.auth_service.decode_access_token(token)

        assert isinstance(payload, AccountAccessTokenPayload)
        assert payload.sub == 99999

    @pytest.mark.asyncio
    async def test_decode_access_token_expired(self, account_utils: AccountTestUtils) -> None:
        """Test decoding an expired token raises CredentialsException."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        token = self.auth_utils.create_mock_access_token(account=account, expired=True)

        with pytest.raises(CredentialsException):
            self.auth_service.decode_access_token(token)

    @pytest.mark.asyncio
    async def test_decode_access_token_invalid(self) -> None:
        """Test decoding an invalid token raises CredentialsException."""
        with pytest.raises(CredentialsException):
            self.auth_service.decode_access_token("invalid.token.here")

    # ========================= Refresh Token Tests =========================

    @pytest.mark.asyncio
    async def test_create_refresh_token_account(self, account_utils: AccountTestUtils) -> None:
        """Test creating refresh token for account."""
        account_entity = await account_utils.create_one()
        account_id = account_entity.id

        token, expires_at = await self.auth_service.create_refresh_token(account_id)

        payload = self.auth_utils.decode_token(token, env.REFRESH_TOKEN_SECRET_KEY)
        assert payload["sub"] == str(account_id)
        assert "jti" in payload
        self.auth_utils.assert_expiration_approx(expires_at, 7 * 24 * 60 * 60)

        entity = await self.auth_utils.get_refresh_token_entity(token)
        assert entity is not None
        assert entity.account_id == account_id

    @pytest.mark.asyncio
    async def test_create_refresh_token_police(self) -> None:
        """Test creating refresh token for police."""
        token, expires_at = await self.auth_service.create_refresh_token("police")

        payload = self.auth_utils.decode_token(token, env.REFRESH_TOKEN_SECRET_KEY)
        assert payload["sub"] == "police"
        assert "jti" in payload
        self.auth_utils.assert_expiration_approx(expires_at, 7 * 24 * 60 * 60)

        entity = await self.auth_utils.get_refresh_token_entity(token)
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
    async def test_validate_police_refresh_token(self) -> None:
        """Test validating a police refresh token returns None."""
        token, _ = await self.auth_service.create_refresh_token("police")

        result = await self.auth_service.validate_refresh_token(token)

        assert result is None

    @pytest.mark.asyncio
    async def test_validate_refresh_token_expired(self) -> None:
        """Test validating an expired refresh token raises exception."""
        jti = "test-jti-expired"
        token_hash = AuthService._hash_token_id(jti)
        await self.auth_utils.create_one(
            account_id=None,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) - timedelta(hours=1),
        )

        payload = {
            "jti": jti,
            "sub": "police",
            "exp": datetime.now(UTC) + timedelta(hours=1),
            "iat": datetime.now(UTC),
        }
        token = jwt.encode(payload, env.REFRESH_TOKEN_SECRET_KEY, algorithm=env.JWT_ALGORITHM)

        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.validate_refresh_token(token)

        # Verify the expired token was deleted from the database
        result = await self.auth_service.session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
        )
        deleted_entity = result.scalar_one_or_none()
        assert deleted_entity is None

    @pytest.mark.asyncio
    async def test_validate_refresh_token_not_in_allowlist(self) -> None:
        """Test validating a token not in the database allow-list."""
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

        validated_id = await self.auth_service.validate_refresh_token(token)
        assert validated_id == account_id

        await self.auth_service.revoke_refresh_token(token)

        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.validate_refresh_token(token)

    @pytest.mark.asyncio
    async def test_revoke_refresh_token_nonexistent(self) -> None:
        """Test revoking a nonexistent token silently succeeds."""
        payload = {
            "jti": "nonexistent",
            "sub": "police",
            "exp": datetime.now(UTC) + timedelta(days=7),
            "iat": datetime.now(UTC),
        }
        token = jwt.encode(payload, env.REFRESH_TOKEN_SECRET_KEY, algorithm=env.JWT_ALGORITHM)

        await self.auth_service.revoke_refresh_token(token)

    @pytest.mark.asyncio
    async def test_revoke_refresh_token_invalid(self) -> None:
        """Test revoking an invalid token silently succeeds."""
        await self.auth_service.revoke_refresh_token("invalid.token")

    # ========================= High-Level Operations Tests =========================

    @pytest.mark.asyncio
    async def test_exchange_account_for_tokens(self, account_utils: AccountTestUtils) -> None:
        """Test exchanging account for token pair."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        tokens = await self.auth_service.exchange_account_for_tokens(account)

        access_payload = self.auth_utils.decode_token(tokens.access_token)
        self.auth_utils.assert_account_token_payload(access_payload, account)

        refresh_payload = self.auth_utils.decode_token(
            tokens.refresh_token, env.REFRESH_TOKEN_SECRET_KEY
        )
        assert refresh_payload["sub"] == str(account.id)

    @pytest.mark.asyncio
    async def test_exchange_police_for_tokens(self) -> None:
        """Test exchanging police account for token pair."""
        police = PoliceAccountDto(email="police@unc.edu")

        tokens = await self.auth_service.exchange_police_for_tokens(police)

        access_payload = self.auth_utils.decode_token(tokens.access_token)
        self.auth_utils.assert_police_token_payload(access_payload, police)

        refresh_payload = self.auth_utils.decode_token(
            tokens.refresh_token, env.REFRESH_TOKEN_SECRET_KEY
        )
        assert refresh_payload["sub"] == "police"

    @pytest.mark.asyncio
    async def test_refresh_access_token_account(self, account_utils: AccountTestUtils) -> None:
        """Test refreshing access token for account."""
        account_entity = await account_utils.create_one()
        account = account_entity.to_dto()

        refresh_token, _ = await self.auth_service.create_refresh_token(account.id)

        new_access = await self.auth_service.refresh_access_token(refresh_token)

        payload = self.auth_utils.decode_token(new_access.access_token)
        self.auth_utils.assert_account_token_payload(payload, account)

    @pytest.mark.asyncio
    async def test_refresh_access_token_police(self, police_utils: PoliceTestUtils) -> None:
        """Test refreshing access token for police."""
        police_entity = await police_utils.create_one()

        refresh_token, _ = await self.auth_service.create_refresh_token("police")

        new_access = await self.auth_service.refresh_access_token(refresh_token)

        payload = self.auth_utils.decode_token(new_access.access_token)
        assert payload["sub"] == "police"
        assert payload["email"] == police_entity.email

    @pytest.mark.asyncio
    async def test_refresh_access_token_invalid(self) -> None:
        """Test refreshing with invalid token raises exception."""
        with pytest.raises(InvalidRefreshTokenException):
            await self.auth_service.refresh_access_token("invalid.token")
