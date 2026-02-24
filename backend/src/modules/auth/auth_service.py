import hashlib
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import uuid4

import jwt
from fastapi import Depends
from pydantic import TypeAdapter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import CredentialsException, ForbiddenException
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
        """
        Hash a JWT token ID (jti) using SHA256.

        Args:
            jti: The JWT token ID to hash

        Returns:
            str: Hexadecimal SHA256 hash of the jti
        """
        return hashlib.sha256(jti.encode()).hexdigest()

    # JWT Operations (instance methods)
    def create_account_access_token(self, account: AccountDto) -> tuple[str, datetime]:
        """
        Create a JWT access token for a university account.

        Returns:
            tuple[str, datetime]: (token, expiration_time)
        """
        expires_delta = timedelta(minutes=env.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_at = datetime.now(UTC) + expires_delta

        payload = AccountAccessTokenPayload(
            sub=account.id,
            email=account.email,
            first_name=account.first_name,
            last_name=account.last_name,
            pid=account.pid,
            onyen=account.onyen,
            role=account.role.value,
            exp=expires_at,
            iat=datetime.now(UTC),
        )

        token = jwt.encode(payload.model_dump(), env.JWT_SECRET_KEY, algorithm=env.JWT_ALGORITHM)
        return token, expires_at

    def create_police_access_token(self, police: PoliceAccountDto) -> tuple[str, datetime]:
        """
        Create a JWT access token for a police account.

        Returns:
            tuple[str, datetime]: (token, expiration_time)
        """
        expires_delta = timedelta(minutes=env.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_at = datetime.now(UTC) + expires_delta

        payload = PoliceAccessTokenPayload(
            sub="police",
            email=police.email,
            role="police",
            exp=expires_at,
            iat=datetime.now(UTC),
        )

        token = jwt.encode(payload.model_dump(), env.JWT_SECRET_KEY, algorithm=env.JWT_ALGORITHM)
        return token, expires_at

    def decode_access_token(
        self, token: str
    ) -> AccountAccessTokenPayload | PoliceAccessTokenPayload:
        """
        Decode and validate a JWT access token.

        Args:
            token: The JWT token to decode

        Returns:
            AccountAccessTokenPayload | PoliceAccessTokenPayload: The validated token payload

        Raises:
            CredentialsException: If token is invalid, expired, or malformed
        """
        try:
            payload = jwt.decode(
                token,
                env.JWT_SECRET_KEY,
                algorithms=[env.JWT_ALGORITHM],
                options={"verify_sub": False},
            )
            return TypeAdapter(AccessTokenPayload).validate_python(payload)
        except jwt.ExpiredSignatureError as e:
            raise CredentialsException() from e
        except jwt.InvalidTokenError as e:
            raise CredentialsException() from e
        except Exception as e:
            # Catch Pydantic validation errors
            raise CredentialsException() from e

    # Refresh Token Management (async methods)
    async def create_refresh_token(
        self, account_id: int | Literal["police"]
    ) -> tuple[str, datetime]:
        """
        Create a refresh token and store its hash in the database.

        Args:
            account_id: Account ID or "police" sentinel for police tokens

        Returns:
            tuple[str, datetime]: (token, expiration_time)
        """
        expires_delta = timedelta(days=env.REFRESH_TOKEN_EXPIRE_DAYS)
        expires_at = datetime.now(UTC) + expires_delta
        jti = str(uuid4())

        # Map "police" sentinel to None for DB storage
        db_account_id = None if account_id == "police" else account_id

        # JWT sub must be a string; use "police" sentinel for police tokens
        payload = RefreshTokenPayload(
            jti=jti,
            sub=str(account_id) if isinstance(account_id, int) else "police",
            exp=expires_at,
            iat=datetime.now(UTC),
        )

        token = jwt.encode(
            payload.model_dump(), env.REFRESH_TOKEN_SECRET_KEY, algorithm=env.JWT_ALGORITHM
        )

        # Hash the jti and store in database
        token_hash = self._hash_token_id(jti)
        refresh_token_entity = RefreshTokenEntity(
            account_id=db_account_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        self.session.add(refresh_token_entity)
        await self.session.commit()

        return token, expires_at

    async def validate_refresh_token(self, token: str) -> int | None:
        """
        Validate a refresh token against the database allow-list.

        Args:
            token: The refresh token to validate

        Returns:
            int | None: Account ID (None for police tokens)

        Raises:
            InvalidRefreshTokenException: If token is invalid or not in allow-list

        Note:
            Expired tokens are automatically deleted from the database
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

        # Hash the jti and look it up in the database
        token_hash = self._hash_token_id(jti)
        result = await self.session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
        )
        refresh_token_entity = result.scalar_one_or_none()

        if refresh_token_entity is None:
            raise InvalidRefreshTokenException()

        # Check if token is expired and clean up if so
        if refresh_token_entity.expires_at < datetime.now(UTC):
            await self.session.delete(refresh_token_entity)
            await self.session.commit()
            raise InvalidRefreshTokenException()

        return refresh_token_entity.account_id

    async def revoke_refresh_token(self, token: str) -> None:
        """
        Revoke a refresh token by removing it from the database allow-list.

        Args:
            token: The refresh token to revoke

        Note:
            Silently succeeds if token doesn't exist or is invalid
        """
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
            # Silently fail for invalid tokens
            pass

    # High-Level Operations
    async def exchange_account_for_tokens(self, account: AccountDto) -> TokensDto:
        """
        Exchange an account for a token pair (access + refresh).

        Args:
            account: The account to create tokens for

        Returns:
            TokensDto: Token pair with expiration times
        """
        access_token, access_expires = self.create_account_access_token(account)
        refresh_token, refresh_expires = await self.create_refresh_token(account.id)

        return TokensDto(
            access_token=access_token,
            access_token_expires=access_expires,
            refresh_token=refresh_token,
            refresh_token_expires=refresh_expires,
        )

    async def exchange_police_for_tokens(self, police: PoliceAccountDto) -> TokensDto:
        """
        Exchange a police account for a token pair (access + refresh).

        Args:
            police: The police account to create tokens for

        Returns:
            TokensDto: Token pair with expiration times
        """
        access_token, access_expires = self.create_police_access_token(police)
        refresh_token, refresh_expires = await self.create_refresh_token("police")

        return TokensDto(
            access_token=access_token,
            access_token_expires=access_expires,
            refresh_token=refresh_token,
            refresh_token_expires=refresh_expires,
        )

    async def refresh_access_token(self, refresh_token: str) -> AccessTokenDto:
        """
        Refresh an access token using a valid refresh token.

        Args:
            refresh_token: The refresh token

        Returns:
            AccessTokenDto: New access token with expiration

        Raises:
            InvalidRefreshTokenException: If refresh token is invalid
        """
        account_id = await self.validate_refresh_token(refresh_token)

        if account_id is None:
            # Police token
            police = await self.police_service.get_police()
            police_dto = police.to_dto()
            access_token, access_expires = self.create_police_access_token(police_dto)
        else:
            # Account token
            account = await self.account_service.get_account_by_id(account_id)
            access_token, access_expires = self.create_account_access_token(account)

        return AccessTokenDto(access_token=access_token, access_token_expires=access_expires)
