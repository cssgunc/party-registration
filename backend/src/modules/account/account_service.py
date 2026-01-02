from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.core.exceptions import ConflictException, NotFoundException
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import AccountData, AccountDto


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

    async def _get_account_entity_by_id(self, account_id: int) -> AccountEntity:
        result = await self.session.execute(
            select(AccountEntity).where(AccountEntity.id == account_id)
        )
        account_entity = result.scalar_one_or_none()
        if account_entity is None:
            raise AccountNotFoundException(account_id)
        return account_entity

    async def _get_account_entity_by_email(self, email: str) -> AccountEntity:
        result = await self.session.execute(
            select(AccountEntity).where(AccountEntity.email.ilike(email))
        )
        account = result.scalar_one_or_none()
        if account is None:
            raise AccountByEmailNotFoundException(email)
        return account

    async def get_accounts(self) -> list[AccountDto]:
        result = await self.session.execute(select(AccountEntity))
        accounts = result.scalars().all()
        return [account.to_dto() for account in accounts]

    async def get_accounts_by_roles(
        self, roles: list[AccountRole] | None = None
    ) -> list[AccountDto]:
        if not roles:
            return await self.get_accounts()

        result = await self.session.execute(
            select(AccountEntity).where(AccountEntity.role.in_(roles))
        )
        accounts = result.scalars().all()
        return [account.to_dto() for account in accounts]

    async def get_account_by_id(self, account_id: int) -> AccountDto:
        account_entity = await self._get_account_entity_by_id(account_id)
        return account_entity.to_dto()

    async def get_account_by_email(self, email: str) -> AccountDto:
        account_entity = await self._get_account_entity_by_email(email)
        return account_entity.to_dto()

    async def create_account(self, data: AccountData) -> AccountDto:
        try:
            await self._get_account_entity_by_email(data.email)
            # If we get here, account exists
            raise AccountConflictException(data.email)
        except AccountByEmailNotFoundException:
            # Account doesn't exist, proceed with creation
            pass

        new_account = AccountEntity(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            pid=data.pid,
            role=AccountRole(data.role.value),
        )
        try:
            self.session.add(new_account)
            await self.session.commit()
        except IntegrityError:
            # handle race condition where another session inserted the same email
            raise AccountConflictException(data.email)
        await self.session.refresh(new_account)
        return new_account.to_dto()

    async def update_account(self, account_id: int, data: AccountData) -> AccountDto:
        account_entity = await self._get_account_entity_by_id(account_id)

        if data.email != account_entity.email:
            try:
                await self._get_account_entity_by_email(data.email)
                # If we get here, account with this email exists
                raise AccountConflictException(data.email)
            except AccountByEmailNotFoundException:
                # Email is available, proceed
                pass

        # Update fields
        account_entity.email = data.email
        account_entity.first_name = data.first_name
        account_entity.last_name = data.last_name
        account_entity.pid = data.pid
        account_entity.role = AccountRole(data.role.value)

        try:
            self.session.add(account_entity)
            await self.session.commit()
        except IntegrityError:
            raise AccountConflictException(data.email)
        await self.session.refresh(account_entity)
        return account_entity.to_dto()

    async def delete_account(self, account_id: int) -> AccountDto:
        account_entity = await self._get_account_entity_by_id(account_id)
        account = account_entity.to_dto()
        await self.session.delete(account_entity)
        await self.session.commit()
        return account
