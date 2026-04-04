from fastapi import Depends, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import ConflictException, CredentialsException, NotFoundException
from src.core.utils.bcrypt_utils import hash_password, verify_password
from src.core.utils.query_utils import get_paginated_results, parse_pagination_params
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_model import (
    PaginatedPoliceResponse,
    PoliceAccountDto,
)


class PoliceNotFoundException(NotFoundException):
    def __init__(self, police_id: int):
        super().__init__(f"Police account with ID {police_id} not found")


class PoliceConflictException(ConflictException):
    def __init__(self, email: str):
        super().__init__(f"Police account with email {email} already exists")


class PoliceService:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

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

    async def create_police(self, email: str, password: str) -> PoliceAccountDto:
        existing = await self._get_police_entity_by_email(email)
        if existing is not None:
            raise PoliceConflictException(email)

        police = PoliceEntity(email=email, hashed_password=hash_password(password))
        try:
            self.session.add(police)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise PoliceConflictException(email) from e
        await self.session.refresh(police)
        return police.to_dto()

    async def get_police_by_id(self, police_id: int) -> PoliceAccountDto:
        police = await self._get_police_entity_by_id(police_id)
        return police.to_dto()

    async def get_police_paginated(self, request: Request) -> PaginatedPoliceResponse:
        allowed_fields = ["id", "email"]
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

    async def update_police(self, police_id: int, email: str, password: str) -> PoliceAccountDto:
        police = await self._get_police_entity_by_id(police_id)

        if email.lower() != police.email.lower():
            existing = await self._get_police_entity_by_email(email)
            if existing is not None:
                raise PoliceConflictException(email)

        police.email = email
        police.hashed_password = hash_password(password)

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
        return police.to_dto()
