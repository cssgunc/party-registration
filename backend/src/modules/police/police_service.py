import secrets
from datetime import UTC, datetime, timedelta
from typing import ClassVar

from fastapi import Depends, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    CredentialsException,
    ForbiddenException,
    NotFoundException,
)
from src.core.utils.bcrypt_utils import hash_password, verify_password
from src.core.utils.email_utils import EmailService
from src.core.utils.excel_utils import ExcelExporter
from src.core.utils.query_utils import get_paginated_results, parse_pagination_params
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import (
    PaginatedPoliceResponse,
    PoliceAccountDto,
    PoliceRole,
)


class PoliceNotFoundException(NotFoundException):
    def __init__(self, police_id: int):
        super().__init__(f"Police account with ID {police_id} not found")


class PoliceConflictException(ConflictException):
    def __init__(self, email: str):
        super().__init__(f"Police account with email {email} already exists")


class PoliceService:
    _ALLOWED_FIELDS: ClassVar[tuple[str, ...]] = ("id", "email", "role")

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        email_service: EmailService = Depends(),
    ):
        self.session = session
        self.email_service = email_service

    async def _get_police_entity_by_id(self, police_id: int) -> PoliceEntity:
        result = await self.session.execute(
            select(PoliceEntity).where(PoliceEntity.id == police_id)
        )
        police = result.scalar_one_or_none()
        if police is None:
            raise PoliceNotFoundException(police_id)
        return police

    async def _get_police_entity_by_email(self, email: str) -> PoliceEntity | None:
        result = await self.session.execute(
            select(PoliceEntity).where(func.lower(PoliceEntity.email) == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_police_by_id(self, police_id: int) -> PoliceAccountDto:
        police = await self._get_police_entity_by_id(police_id)
        return police.to_dto()

    async def get_police_paginated(self, request: Request) -> PaginatedPoliceResponse:
        allowed_fields = list(self._ALLOWED_FIELDS)
        base_query = select(PoliceEntity)
        query_params = parse_pagination_params(
            request,
            allowed_sort_fields=allowed_fields,
            allowed_filter_fields=allowed_fields,
        )
        result = await get_paginated_results(
            session=self.session,
            base_query=base_query,
            entity_class=PoliceEntity,
            dto_converter=lambda entity: entity.to_dto(),
            query_params=query_params,
            allowed_sort_fields=allowed_fields,
            allowed_filter_fields=allowed_fields,
        )
        return PaginatedPoliceResponse(**result.model_dump())

    async def get_police_for_export(self, request: Request) -> list[PoliceAccountDto]:
        return (await self.get_police_paginated(request)).items

    def export_police_to_excel(self, police_accounts: list[PoliceAccountDto]) -> bytes:
        headers = ["Email", "Role"]
        exporter = ExcelExporter(sheet_title="Police Accounts")
        exporter.set_headers(headers)
        for police in police_accounts:
            exporter.add_row(
                [
                    police.email,
                    "Police Admin" if police.role == PoliceRole.POLICE_ADMIN else "Officer",
                ]
            )
        return exporter.to_bytes()

    async def signup_police(self, email: str, password: str) -> None:
        police = PoliceEntity(
            email=email,
            hashed_password=hash_password(password),
            role=PoliceRole.OFFICER,
            is_verified=False,
        )

        token = self._populate_verification_token(police)

        try:
            self.session.add(police)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise PoliceConflictException(email) from e

        await self.send_verification_email(email, token)

    async def retry_verification(self, email: str) -> None:
        police = await self._get_police_entity_by_email(email)
        if police is None or police.is_verified:
            # To prevent user enumeration, we return success even if the email doesn't exist or is
            # already verified.
            return

        token = self._populate_verification_token(police)

        self.session.add(police)
        await self.session.commit()

        await self.send_verification_email(email, token)

    def _populate_verification_token(self, police: PoliceEntity) -> str:
        """
        Reset the verification token and expiry for a police entity. Does not commit changes.
        """

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(hours=env.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

        police.verification_token = token
        police.verification_token_expires_at = expires_at

        return token

    async def send_verification_email(self, to: str, token: str) -> None:
        verification_url = f"{env.FRONTEND_BASE_URL}/police/verify?token={token}"
        html = f"""
            <p>Welcome to PartySmart.</p>
            <p>Click the link below to verify your email address:</p>
            <p><a href="{verification_url}">{verification_url}</a></p>
            <p>This link will expire in {env.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.</p>
        """
        await self.email_service.send_email(to, "Verify your PartySmart account", html)

    async def verify_police_email(self, token: str) -> None:
        result = await self.session.execute(
            select(PoliceEntity).where(PoliceEntity.verification_token == token)
        )
        police = result.scalar_one_or_none()
        if police is None:
            raise BadRequestException("Invalid verification token")

        if (
            police.verification_token_expires_at is None
            or police.verification_token_expires_at < datetime.now(UTC)
        ):
            raise BadRequestException("Verification token has expired")

        police.is_verified = True
        police.verification_token = None
        police.verification_token_expires_at = None
        self.session.add(police)
        await self.session.commit()

    async def update_police(
        self, police_id: int, email: str, role: PoliceRole, is_verified: bool | None = None
    ) -> PoliceAccountDto:
        police = await self._get_police_entity_by_id(police_id)

        if email.lower() != police.email.lower():
            existing = await self._get_police_entity_by_email(email)
            if existing is not None:
                raise PoliceConflictException(email)

        police.email = email
        police.role = role
        if is_verified is not None:
            police.is_verified = is_verified

        try:
            self.session.add(police)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise PoliceConflictException(email) from e
        await self.session.refresh(police)
        return police.to_dto()

    async def delete_police(self, police_id: int) -> PoliceAccountDto:
        police = await self._get_police_entity_by_id(police_id)
        dto = police.to_dto()
        await self.session.delete(police)
        await self.session.commit()
        return dto

    async def verify_police_credentials(self, email: str, password: str) -> PoliceAccountDto:
        """Verify police credentials. Never reveals whether the account exists."""
        police = await self._get_police_entity_by_email(email)
        if police is None or not verify_password(password, police.hashed_password):
            raise CredentialsException()
        if not police.is_verified:
            raise ForbiddenException("EMAIL_NOT_VERIFIED")
        return police.to_dto()
