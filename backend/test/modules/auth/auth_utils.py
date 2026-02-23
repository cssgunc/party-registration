import hashlib
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.modules.account.account_model import AccountDto, AccountRole
from src.modules.auth.refresh_token_entity import RefreshTokenEntity
from src.modules.police.police_model import PoliceAccountDto


class AuthTestUtils:
    """Test utilities for auth module."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_refresh_token_entity(
        self,
        account_id: int | None = None,
        token_hash: str | None = None,
        expires_at: datetime | None = None,
    ) -> RefreshTokenEntity:
        """Create a refresh token entity in the database."""
        if token_hash is None:
            # Generate a random hash for testing
            import uuid

            token_hash = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()

        if expires_at is None:
            expires_at = datetime.now(UTC) + timedelta(days=7)

        entity = RefreshTokenEntity(
            account_id=account_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

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
            # Create a default account token
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
            payload = {
                "sub": "account",
                "id": account.id,
                "email": account.email,
                "first_name": account.first_name,
                "last_name": account.last_name,
                "pid": account.pid,
                "onyen": account.onyen,
                "role": account.role.value,
                "exp": expires_at,
                "iat": datetime.now(UTC),
            }
        else:
            assert police is not None
            payload = {
                "sub": "police",
                "email": police.email,
                "exp": expires_at,
                "iat": datetime.now(UTC),
            }

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
            options={"verify_exp": False, "verify_sub": False},
        )
