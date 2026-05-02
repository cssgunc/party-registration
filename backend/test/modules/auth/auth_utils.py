import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.modules.account.account_model import AccountDto, AccountRole
from src.modules.auth.auth_model import AccessTokenPayload
from src.modules.auth.refresh_token_entity import RefreshTokenEntity
from src.modules.police.police_model import PoliceAccountDto


class AuthTestUtils:
    """Test utilities for auth module."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_one(
        self,
        account_id: int | None = None,
        police_id: int | None = None,
        token_hash: str | None = None,
        expires_at: datetime | None = None,
    ) -> RefreshTokenEntity:
        """Create a refresh token entity in the database."""
        if token_hash is None:
            token_hash = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()

        if expires_at is None:
            expires_at = datetime.now(UTC) + timedelta(days=7)

        entity = RefreshTokenEntity(
            token_hash=token_hash, account_id=account_id, police_id=police_id, expires_at=expires_at
        )

        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def get_refresh_token_entity(self, token: str) -> RefreshTokenEntity | None:
        """Get refresh token entity from DB by raw token."""
        payload = jwt.decode(
            token,
            env.REFRESH_TOKEN_SECRET_KEY,
            algorithms=[env.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        jti = payload.get("jti")
        if not jti:
            return None
        token_hash = hashlib.sha256(jti.encode()).hexdigest()
        result = await self.session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    @staticmethod
    def create_mock_access_token(
        account: AccountDto | None = None,
        police: PoliceAccountDto | None = None,
        expired: bool = False,
    ) -> str:
        """
        Create a mock JWT access token for testing.

        Args:
            account: Account to create token for (mutually exclusive with police)
            police: Police account to create token for (mutually exclusive with account)
            expired: Whether to create an expired token

        Returns:
            str: JWT access token
        """
        if account and police:
            raise ValueError("Cannot create token for both account and police")

        if not account and not police:
            account = AccountDto(
                id=1,
                email="test@unc.edu",
                first_name="Test",
                last_name="User",
                pid="111111111",
                onyen="testuser",
                role=AccountRole.STUDENT,
            )

        if expired:
            expires_at = datetime.now(UTC) - timedelta(hours=1)
        else:
            expires_at = datetime.now(UTC) + timedelta(minutes=env.ACCESS_TOKEN_EXPIRE_MINUTES)

        if account:
            payload = AccessTokenPayload(
                sub=str(account.id),
                role=account.role.value,
                exp=expires_at,
                iat=datetime.now(UTC),
            ).model_dump()
        else:
            assert police is not None
            payload = AccessTokenPayload(
                sub=str(police.id),
                role=police.role.value,
                exp=expires_at,
                iat=datetime.now(UTC),
            ).model_dump()

        return jwt.encode(payload, env.JWT_SECRET_KEY, algorithm=env.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str, secret_key: str | None = None) -> dict:
        """Decode a JWT token without expiry validation (for testing)."""
        if secret_key is None:
            secret_key = env.JWT_SECRET_KEY
        return jwt.decode(
            token,
            secret_key,
            algorithms=[env.JWT_ALGORITHM],
            options={"verify_exp": False},
        )

    @staticmethod
    def assert_account_token_payload(
        payload: dict | AccessTokenPayload, account: AccountDto
    ) -> None:
        """Assert that a decoded access token payload matches the given account."""
        if isinstance(payload, AccessTokenPayload):
            payload = payload.model_dump(mode="json")
        assert payload["sub"] == str(account.id)
        assert payload["role"] == account.role.value
        for field in ("email", "first_name", "last_name", "pid", "onyen"):
            assert field not in payload, f"Account token should not contain '{field}'"

    @staticmethod
    def assert_police_token_payload(
        payload: dict | AccessTokenPayload, police: PoliceAccountDto
    ) -> None:
        """Assert that a decoded access token payload matches the given police account."""
        if isinstance(payload, AccessTokenPayload):
            payload = payload.model_dump(mode="json")
        assert payload["sub"] == str(police.id)
        assert payload["role"] == police.role.value
        for field in ("first_name", "last_name", "pid", "onyen"):
            assert field not in payload, f"Police token should not contain '{field}'"

    @staticmethod
    def assert_expiration_approx(
        expires_at: datetime, expected_seconds: int, tolerance: int = 5
    ) -> None:
        """Assert that an expiration time is approximately the expected number of seconds away."""
        actual_seconds = (expires_at - datetime.now(UTC)).total_seconds()
        assert abs(actual_seconds - expected_seconds) < tolerance, (
            f"Expected expiration in ~{expected_seconds} seconds, but got {actual_seconds} seconds"
        )
