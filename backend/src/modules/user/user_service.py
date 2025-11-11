from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import ConflictException, NotFoundException

from .user_entity import UserEntity
from .user_model import User, UserData


class UserNotFoundException(NotFoundException):
    def __init__(self, user_id: int):
        super().__init__(f"User with ID {user_id} not found")


class UserConflictException(ConflictException):
    def __init__(self, email: str):
        super().__init__(f"User with email {email} already exists")


class UserByEmailNotFoundException(NotFoundException):
    def __init__(self, email: str):
        super().__init__(f"User with email {email} not found")


class UserService:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

    async def _get_user_entity_by_id(self, user_id: int) -> UserEntity:
        result = await self.session.execute(
            select(UserEntity).where(UserEntity.id == user_id)
        )
        user_entity = result.scalar_one_or_none()
        if user_entity is None:
            raise UserNotFoundException(user_id)
        return user_entity

    async def _get_user_entity_by_email(self, email: str) -> UserEntity:
        result = await self.session.execute(
            select(UserEntity).where(UserEntity.email == email)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise UserByEmailNotFoundException(email)
        return user

    async def get_users(self) -> list[User]:
        result = await self.session.execute(select(UserEntity))
        users = result.scalars().all()
        return [user.to_model() for user in users]

    async def get_user_by_id(self, user_id: int) -> User:
        user_entity = await self._get_user_entity_by_id(user_id)
        return user_entity.to_model()

    async def create_user(self, data: UserData) -> User:
        try:
            await self._get_user_entity_by_email(data.email)
            # If we get here, user exists
            raise UserConflictException(data.email)
        except UserByEmailNotFoundException:
            # User doesn't exist, proceed with creation
            pass

        new_user = UserEntity.from_model(data)
        try:
            self.session.add(new_user)
            await self.session.commit()
        except IntegrityError:
            # handle race condition where another session inserted the same email
            raise UserConflictException(data.email)
        await self.session.refresh(new_user)
        return new_user.to_model()

    async def update_user(self, user_id: int, data: UserData) -> User:
        user_entity = await self._get_user_entity_by_id(user_id)

        if data.email != user_entity.email:
            try:
                await self._get_user_entity_by_email(data.email)
                # If we get here, user with this email exists
                raise UserConflictException(data.email)
            except UserByEmailNotFoundException:
                # Email is available, proceed
                pass

        for key, value in data.model_dump().items():
            if key == "id":
                continue
            if hasattr(user_entity, key):
                setattr(user_entity, key, value)

        try:
            self.session.add(user_entity)
            await self.session.commit()
        except IntegrityError:
            raise UserConflictException(data.email)
        await self.session.refresh(user_entity)
        return user_entity.to_model()

    async def delete_user(self, user_id: int) -> User:
        user_entity = await self._get_user_entity_by_id(user_id)
        user = user_entity.to_model()
        await self.session.delete(user_entity)
        await self.session.commit()
        return user
