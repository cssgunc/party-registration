import bcrypt
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import (
    ConflictException,
    CredentialsException,
    NotFoundException,
)
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import Account, AccountData


class AccountNotFoundException(NotFoundException):
    def __init__(self, account_id: int):
        super().__init__(f"Account with ID {account_id} not found")


class AccountConflictException(ConflictException):
    def __init__(self, email: str):
        super().__init__(f"Account with email {email} already exists")


class AccountByEmailNotFoundException(NotFoundException):
    def __init__(self, email: str):
        super().__init__(f"Account with email {email} not found")


class AccountService:
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

    async def _get_account_entity_by_id(self, account_id: int) -> AccountEntity:
        result = await self.session.execute(
            select(AccountEntity).where(AccountEntity.id == account_id)
        )
        account_entity = result.scalar_one_or_none()
        if account_entity is None:
            raise AccountNotFoundException(account_id)
        return account_entity

    async def _get_account_entity_by_email(self, email: str) -> AccountEntity | None:
        result = await self.session.execute(
            select(AccountEntity).where(AccountEntity.email.ilike(email))
        )
        return result.scalar_one_or_none()

    async def get_accounts(self) -> list[Account]:
        result = await self.session.execute(select(AccountEntity))
        accounts = result.scalars().all()
        return [Account.from_entity(account) for account in accounts]

    async def get_account_by_id(self, account_id: int) -> Account:
        account_entity = await self._get_account_entity_by_id(account_id)
        return Account.from_entity(account_entity)

    async def get_account_by_email(self, email: str) -> Account:
        account_entity = await self._get_account_entity_by_email(email)
        if account_entity is None:
            raise AccountByEmailNotFoundException(email)
        return Account.from_entity(account_entity)

    async def create_account(self, data: AccountData) -> Account:
        if await self._get_account_entity_by_email(data.email):
            raise AccountConflictException(data.email)

        hashed_password = self._hash_password(data.password)
        new_account = AccountEntity(
            email=data.email,
            hashed_password=hashed_password,
            role=AccountRole(data.role.value),
        )
        try:
            self.session.add(new_account)
            await self.session.commit()
        except IntegrityError:
            # handle race condition where another session inserted the same email
            raise AccountConflictException(data.email)
        await self.session.refresh(new_account)
        return Account.from_entity(new_account)

    async def update_account(self, account_id: int, data: AccountData) -> Account:
        account_entity = await self._get_account_entity_by_id(account_id)

        if data.email != account_entity.email:
            if await self._get_account_entity_by_email(data.email):
                raise AccountConflictException(data.email)

        # Update fields
        account_entity.email = data.email

        # Only re-hash password if it's different from the current one
        if not self._verify_password(data.password, account_entity.hashed_password):
            account_entity.hashed_password = self._hash_password(data.password)

        account_entity.role = AccountRole(data.role.value)

        try:
            self.session.add(account_entity)
            await self.session.commit()
        except IntegrityError:
            raise AccountConflictException(data.email)
        await self.session.refresh(account_entity)
        return Account.from_entity(account_entity)

    async def delete_account(self, account_id: int) -> Account:
        account_entity = await self._get_account_entity_by_id(account_id)
        account = Account.from_entity(account_entity)
        await self.session.delete(account_entity)
        await self.session.commit()
        return account

    async def verify_account_credentials(self, email: str, password: str) -> Account:
        """Verify account credentials and return account if valid."""
        account_entity = await self._get_account_entity_by_email(email)
        if account_entity is None:
            raise AccountByEmailNotFoundException(email)

        if self._verify_password(password, account_entity.hashed_password):
            return Account.from_entity(account_entity)
        raise CredentialsException()
