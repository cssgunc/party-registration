import hashlib
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from fastapi import Depends
from pydantic import TypeAdapter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import BadRequestException, CredentialsException, ForbiddenException
from src.modules.account.account_model import AccountDto
from src.modules.account.account_service import AccountService
from src.modules.auth.auth_model import (
    AccessTokenDto,
    AccessTokenPayload,
    AccountAccessTokenPayload,
    PoliceAccessTokenPayload,
    RefreshTokenPayload,
    TokensDto,
)
from src.modules.auth.refresh_token_entity import RefreshTokenEntity
from src.modules.police.police_model import PoliceAccountDto
from src.modules.police.police_service import PoliceService


class InvalidRefreshTokenException(CredentialsException):
    """Raised when refresh token is invalid or expired."""

    pass


class InvalidInternalSecretException(ForbiddenException):
    """Raised when internal API secret is invalid."""

    def __init__(self):
        super().__init__("Invalid internal API secret")


class AuthService:
    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        account_service: AccountService = Depends(),
        police_service: PoliceService = Depends(),
    ):
        self.session = session
        self.account_service = account_service
        self.police_service = police_service

    # Helper Methods
    @staticmethod
    def _hash_token_id(jti: str) -> str:
        """Hash a JWT token ID (jti) using SHA256."""
        return hashlib.sha256(jti.encode()).hexdigest()

    # JWT Operations (instance methods)
    def create_account_access_token(self, account: AccountDto) -> tuple[str, datetime]:
        """Create a JWT access token for a university account."""
        expires_delta = timedelta(minutes=env.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_at = datetime.now(UTC) + expires_delta

        payload = AccountAccessTokenPayload(
            sub=str(account.id),
            email=account.email,
            first_name=account.first_name,
            last_name=account.last_name,
            pid=account.pid,
            onyen=account.onyen,
            role=account.role,
            exp=expires_at,
            iat=datetime.now(UTC),
        )

        token = jwt.encode(payload.model_dump(), env.JWT_SECRET_KEY, algorithm=env.JWT_ALGORITHM)
        return token, expires_at

    def create_police_access_token(self, police: PoliceAccountDto) -> tuple[str, datetime]:
        """Create a JWT access token for a police account."""
        expires_delta = timedelta(minutes=env.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_at = datetime.now(UTC) + expires_delta

        payload = PoliceAccessTokenPayload(
            sub=str(police.id),
            email=police.email,
            role=police.role.value,
            exp=expires_at,
            iat=datetime.now(UTC),
        )

        token = jwt.encode(payload.model_dump(), env.JWT_SECRET_KEY, algorithm=env.JWT_ALGORITHM)
        return token, expires_at

    def decode_access_token(
        self, token: str
    ) -> AccountAccessTokenPayload | PoliceAccessTokenPayload:
        """Decode and validate a JWT access token."""
        try:
            payload = jwt.decode(
                token,
                env.JWT_SECRET_KEY,
                algorithms=[env.JWT_ALGORITHM],
            )
            return TypeAdapter(AccessTokenPayload).validate_python(payload)
        except jwt.ExpiredSignatureError as e:
            raise CredentialsException() from e
        except jwt.InvalidTokenError as e:
            raise CredentialsException() from e
        except Exception as e:
            raise CredentialsException() from e

    # Refresh Token Management (async methods)
    async def create_refresh_token(
        self, *, account_id: int | None = None, police_id: int | None = None
    ) -> tuple[str, datetime]:
        """
        Create a refresh token and store its hash in the database.

        Exactly one of account_id or police_id must be provided.
        JWT sub is str(account_id) for accounts and str(police_id) for police tokens.
        """
        if (account_id is None) == (police_id is None):
            raise BadRequestException("Exactly one of account_id or police_id must be provided")

        expires_delta = timedelta(days=env.REFRESH_TOKEN_EXPIRE_DAYS)
        expires_at = datetime.now(UTC) + expires_delta
        jti = str(uuid4())

        sub = str(account_id) if account_id is not None else str(police_id)

        payload = RefreshTokenPayload(
            jti=jti,
            sub=sub,
            exp=expires_at,
            iat=datetime.now(UTC),
        )

        token = jwt.encode(
            payload.model_dump(), env.REFRESH_TOKEN_SECRET_KEY, algorithm=env.JWT_ALGORITHM
        )

        token_hash = self._hash_token_id(jti)
        refresh_token_entity = RefreshTokenEntity(
            token_hash=token_hash,
            account_id=account_id,
            police_id=police_id,
            expires_at=expires_at,
        )

        try:
            self.session.add(refresh_token_entity)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise InvalidRefreshTokenException() from e

        return token, expires_at

    async def validate_refresh_token(self, token: str) -> tuple[int, str]:
        """
        Validate a refresh token against the database allow-list.

        Returns:
            tuple[int, str]: (id, role) where role is "account" or "police"

        Raises:
            InvalidRefreshTokenException: If token is invalid or not in allow-list
        """
        try:
            payload = jwt.decode(
                token, env.REFRESH_TOKEN_SECRET_KEY, algorithms=[env.JWT_ALGORITHM]
            )
        except jwt.ExpiredSignatureError as e:
            raise InvalidRefreshTokenException() from e
        except jwt.InvalidTokenError as e:
            raise InvalidRefreshTokenException() from e

        jti = payload.get("jti")
        if not jti:
            raise InvalidRefreshTokenException()

        token_hash = self._hash_token_id(jti)
        result = await self.session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
        )
        refresh_token_entity = result.scalar_one_or_none()

        if refresh_token_entity is None:
            raise InvalidRefreshTokenException()

        if refresh_token_entity.expires_at < datetime.now(UTC):
            await self.session.delete(refresh_token_entity)
            await self.session.commit()
            raise InvalidRefreshTokenException()

        if refresh_token_entity.police_id is not None:
            return refresh_token_entity.police_id, "police"
        if refresh_token_entity.account_id is not None:
            return refresh_token_entity.account_id, "account"
        raise InvalidRefreshTokenException()

    async def revoke_refresh_token(self, token: str) -> None:
        """Revoke a refresh token by removing it from the database allow-list."""
        try:
            payload = jwt.decode(
                token,
                env.REFRESH_TOKEN_SECRET_KEY,
                algorithms=[env.JWT_ALGORITHM],
                options={"verify_exp": False},
            )
            jti = payload.get("jti")
            if jti:
                token_hash = self._hash_token_id(jti)
                result = await self.session.execute(
                    select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
                )
                refresh_token_entity = result.scalar_one_or_none()
                if refresh_token_entity:
                    await self.session.delete(refresh_token_entity)
                    await self.session.commit()
        except jwt.InvalidTokenError:
            pass

    # High-Level Operations
    async def exchange_account_for_tokens(self, account: AccountDto) -> TokensDto:
        """Exchange an account for a token pair (access + refresh)."""
        access_token, access_expires = self.create_account_access_token(account)
        refresh_token, refresh_expires = await self.create_refresh_token(account_id=account.id)

        return TokensDto(
            access_token=access_token,
            access_token_expires=access_expires,
            refresh_token=refresh_token,
            refresh_token_expires=refresh_expires,
        )

    async def exchange_police_for_tokens(self, police: PoliceAccountDto) -> TokensDto:
        """Exchange a police account for a token pair (access + refresh)."""
        access_token, access_expires = self.create_police_access_token(police)
        refresh_token, refresh_expires = await self.create_refresh_token(police_id=police.id)

        return TokensDto(
            access_token=access_token,
            access_token_expires=access_expires,
            refresh_token=refresh_token,
            refresh_token_expires=refresh_expires,
        )

    async def refresh_access_token(self, refresh_token: str) -> AccessTokenDto:
        """Refresh an access token using a valid refresh token."""
        token_id, role = await self.validate_refresh_token(refresh_token)

        if role == "police":
            police = await self.police_service.get_police_by_id(token_id)
            access_token, access_expires = self.create_police_access_token(police)
        else:
            account = await self.account_service.get_account_by(id=token_id)
            access_token, access_expires = self.create_account_access_token(account)

        return AccessTokenDto(access_token=access_token, access_token_expires=access_expires)
