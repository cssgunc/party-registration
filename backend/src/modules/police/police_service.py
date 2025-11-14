import bcrypt
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import (
    ConflictException,
    CredentialsException,
    InternalServerException,
)
from src.modules.police.police_entity import PoliceEntity


class PoliceNotFoundException(InternalServerException):
    def __init__(self):
        super().__init__("Police credentials not found")


class PoliceAlreadyExistsException(ConflictException):
    def __init__(self):
        super().__init__(
            "Police credentials already exist. Only one police account is allowed."
        )


class PoliceService:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def _verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

    async def get_police(self) -> PoliceEntity:
        """Get the singleton police entity."""
        result = await self.session.execute(select(PoliceEntity))
        police = result.scalar_one_or_none()
        if police is None:
            raise PoliceNotFoundException()
        return police

    async def update_police(self, email: str, password: str) -> PoliceEntity:
        """Update the singleton police credentials."""
        police = await self.get_police()

        police.email = email
        police.hashed_password = self._hash_password(password)

        self.session.add(police)
        await self.session.commit()
        await self.session.refresh(police)
        return police

    async def verify_police_credentials(
        self, email: str, password: str
    ) -> PoliceEntity:
        """Verify police credentials and return police entity if valid."""
        police = await self.get_police()

        if police.email != email:
            raise CredentialsException()

        if self._verify_password(password, police.hashed_password):
            return police
        raise CredentialsException()
