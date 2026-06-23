import hashlib
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import uuid4

import jwt
from fastapi import Depends
from pydantic import TypeAdapter
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import BadRequestException, CredentialsException, ForbiddenException
from src.modules.account.account_model import AccountData, AccountDto, AccountRole
from src.modules.account.account_service import AccountService
from src.modules.auth.auth_model import (
    AccessTokenDto,
    AccessTokenPayload,
    RefreshTokenPayload,
    TokensDto,
)
from src.modules.auth.refresh_token_entity import RefreshTokenEntity
from src.modules.police.police_model import PoliceAccountDto
from src.modules.police.police_service import PoliceService
from src.modules.student.student_service import StudentService


class InvalidRefreshTokenException(CredentialsException):
    """Raised when a refresh token is invalid, expired, or absent from the allow-list (HTTP 401)."""


class InvalidInternalSecretException(ForbiddenException):
    """Raised when the ``X-Internal-Secret`` header is missing or incorrect (HTTP 403)."""

    def __init__(self) -> None:
        super().__init__("Invalid internal API secret")


class AuthService:
    """Business-logic layer for JWT issuance, refresh-token management, and SAML provisioning.

    Handles the full token lifecycle: minting access and refresh tokens,
    validating and revoking refresh tokens against the DB allow-list, and
    provisioning UNC accounts from SAML assertions. Injected per request via
    FastAPI ``Depends``.
    """

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        account_service: AccountService = Depends(),
        police_service: PoliceService = Depends(),
        student_service: StudentService = Depends(),
    ):
        self.session = session
        self.account_service = account_service
        self.police_service = police_service
        self.student_service = student_service

    @staticmethod
    def _hash_token_id(jti: str) -> str:
        """Return the SHA-256 hex digest of a JWT token ID (``jti``)."""
        return hashlib.sha256(jti.encode()).hexdigest()

    def create_access_token(self, account: AccountDto | PoliceAccountDto) -> tuple[str, datetime]:
        """Mint a signed JWT access token for the given account or police user.

        Args:
            account: The authenticated principal — either a UNC account or a
                police account. The role is encoded in the token payload.

        Returns:
            A ``(token, expires_at)`` pair where ``expires_at`` is UTC-aware.
        """
        expires_delta = timedelta(minutes=env.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_at = datetime.now(UTC) + expires_delta

        payload = AccessTokenPayload(
            sub=str(account.id),
            role=account.role.value,
            exp=expires_at,
            iat=datetime.now(UTC),
        )

        token = jwt.encode(payload.model_dump(), env.JWT_SECRET_KEY, algorithm=env.JWT_ALGORITHM)
        return token, expires_at

    def decode_access_token(self, token: str) -> AccessTokenPayload:
        """Decode and validate a JWT access token, returning its typed payload.

        Raises:
            CredentialsException: If the token is malformed, expired, or has an
                invalid signature (HTTP 401).
        """
        try:
            payload = jwt.decode(
                token,
                env.JWT_SECRET_KEY,
                algorithms=[env.JWT_ALGORITHM],
            )
            return TypeAdapter(AccessTokenPayload).validate_python(payload)
        except Exception as e:
            raise CredentialsException() from e

    async def create_refresh_token(
        self, *, account_id: int | None = None, police_id: int | None = None
    ) -> tuple[str, datetime]:
        """Mint a refresh token and persist its SHA-256 hash to the allow-list table.

        Exactly one of ``account_id`` or ``police_id`` must be supplied; the
        other must be ``None``.  The raw token is returned to the caller but only
        its ``jti`` hash is stored in the DB — the raw value is never persisted.

        Args:
            account_id: ID of the UNC account this token belongs to.
            police_id: ID of the police account this token belongs to.

        Returns:
            A ``(token, expires_at)`` pair where ``expires_at`` is UTC-aware.

        Raises:
            BadRequestException: If both or neither of ``account_id``/``police_id``
                are provided.
            InvalidRefreshTokenException: If a DB integrity error occurs while
                storing the token hash (extremely rare race condition).
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

    async def revoke_refresh_token(self, token: str) -> None:
        """Remove a refresh token from the allow-list, preventing further use.

        Decodes the token's ``jti`` without expiry validation (so an already-expired
        token can still be cleanly revoked), then deletes the matching hash row.
        Silently succeeds if the token is malformed or the row is already gone.
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
                await self.session.execute(
                    delete(RefreshTokenEntity).where(RefreshTokenEntity.token_hash == token_hash)
                )
                await self.session.commit()
        except jwt.InvalidTokenError:
            pass

    async def provision_saml_account(self, data: AccountData) -> AccountDto:
        """Upsert a UNC account from a SAML assertion and resolve any pending invite.

        For STUDENT-role accounts, a student entity row is ensured to exist.
        This is called by `exchange_for_tokens` as part of the SAML SSO flow.
        """
        account = await self.account_service.upsert_idp_account(data)
        account = await self.account_service.resolve_invite(account, data.role)
        if data.role == AccountRole.STUDENT:
            await self.student_service.ensure_student_entity_exists(account.id)
        return account

    async def exchange_for_tokens(self, account: AccountDto | PoliceAccountDto) -> TokensDto:
        """Mint an access/refresh token pair for the given principal and return them.

        Args:
            account: The authenticated principal (UNC account or police account).

        Returns:
            A `TokensDto` with both tokens and their expiry timestamps.
        """
        access_token, access_expires = self.create_access_token(account)
        kwargs = (
            {"police_id": account.id}
            if isinstance(account, PoliceAccountDto)
            else {"account_id": account.id}
        )
        refresh_token, refresh_expires = await self.create_refresh_token(**kwargs)

        return TokensDto(
            access_token=access_token,
            access_token_expires=access_expires,
            refresh_token=refresh_token,
            refresh_token_expires=refresh_expires,
        )

    async def validate_refresh_token(self, token: str) -> tuple[int, Literal["account", "police"]]:
        """Validate a refresh token against the DB allow-list and return its owner.

        Decodes the JWT, looks up the ``jti`` hash in ``refresh_tokens``, checks
        expiry, and determines whether the owner is a UNC account or police user.
        Expired rows are deleted on read to self-clean the allow-list.

        Returns:
            A ``(id, principal_type)`` tuple identifying the token owner, where
            ``principal_type`` is ``"account"`` or ``"police"``.

        Raises:
            InvalidRefreshTokenException: If the token signature is invalid, it
                has expired, it is absent from the allow-list, or the DB row
                lacks both ``account_id`` and ``police_id``.
        """
        try:
            payload = jwt.decode(
                token, env.REFRESH_TOKEN_SECRET_KEY, algorithms=[env.JWT_ALGORITHM]
            )
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
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

    async def refresh_access_token(self, refresh_token: str) -> AccessTokenDto:
        """Issue a new access token after validating the supplied refresh token.

        Raises:
            InvalidRefreshTokenException: If the refresh token is invalid,
                expired, or absent from the allow-list (HTTP 401).
            AccountNotFoundException: If the token's subject account no longer
                exists (HTTP 404).
            PoliceNotFoundException: If the token's subject police user no longer
                exists (HTTP 404).
        """
        token_id, role = await self.validate_refresh_token(refresh_token)

        if role == "police":
            police = await self.police_service.get_police_by_id(token_id)
            access_token, access_expires = self.create_access_token(police)
        else:
            account = await self.account_service.get_account_by(id=token_id)
            access_token, access_expires = self.create_access_token(account)

        return AccessTokenDto(access_token=access_token, access_token_expires=access_expires)
