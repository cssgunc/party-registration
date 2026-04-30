from datetime import UTC, datetime, timedelta
from typing import ClassVar, TypedDict, Unpack

from fastapi import Depends
from sqlalchemy import String, case, cast, func, literal, null, select, union_all
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.core.utils.email_utils import EmailService
from src.core.utils.excel_utils import ExcelExporter
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
    make_query_service,
)
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import (
    AccountData,
    AccountDto,
    AccountUpdateData,
    AggregateAccountDto,
    CreateInviteDto,
    PaginatedAccountsResponse,
    PaginatedAggregateAccountsResponse,
)
from src.modules.account.invite_token_entity import InviteTokenEntity
from src.modules.police.police_entity import PoliceEntity


class AccountUniqueFields(TypedDict, total=False):
    id: int | None
    email: str | None
    onyen: str | None
    pid: str | None


class AccountConflictException(ConflictException):
    def __init__(self, **fields: Unpack[AccountUniqueFields]):
        display_names = {
            "id": "id",
            "email": "email",
            "onyen": "onyen",
            "pid": "PID",
        }
        parts = [f"{display_names[key]} {val}" for key, val in fields.items()]

        if parts:
            super().__init__(f"Account with {' or '.join(parts)} already exists")
        else:
            super().__init__("Account already exists")


class AccountNotFoundException(NotFoundException):
    def __init__(self, **fields: Unpack[AccountUniqueFields]):
        parts = [f"{key} {val}" for key, val in fields.items()]

        if parts:
            super().__init__(f"Account with {' or '.join(parts)} not found")
        else:
            super().__init__("Account not found")


class CannotDeleteOwnAccountException(ForbiddenException):
    def __init__(self):
        super().__init__(detail="Admins cannot delete their own account")


class InviteConflictException(ConflictException):
    def __init__(self, email: str):
        super().__init__(f"An account or pending invitation already exists for {email}")


_ACCOUNT_QUERY_FIELDS = QueryFieldSet(
    fields={
        "id": AccountEntity.id,
        "email": AccountEntity.email,
        "first_name": AccountEntity.first_name,
        "last_name": AccountEntity.last_name,
        "onyen": AccountEntity.onyen,
        "pid": AccountEntity.pid,
        "role": AccountEntity.role,
    },
    searchable=("email", "first_name", "last_name", "pid", "onyen"),
    default_sort=SortParam(field="email", order=SortOrder.ASC),
)


class AccountService:
    QUERY_FIELDS: ClassVar[QueryFieldSet] = _ACCOUNT_QUERY_FIELDS

    _AGGREGATE_FIELD_NAMES: ClassVar[set[str]] = {
        "email",
        "first_name",
        "last_name",
        "onyen",
        "pid",
        "role",
        "status",
    }

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        email_service: EmailService = Depends(),
        query_service: QueryService = make_query_service(_ACCOUNT_QUERY_FIELDS),
    ):
        self.session = session
        self.email_service = email_service
        self.query_service = query_service

    async def _get_account_entity_by(self, **fields: Unpack[AccountUniqueFields]) -> AccountEntity:
        clause_builders = {
            "id": lambda v: AccountEntity.id == v,
            "email": lambda v: AccountEntity.email.ilike(v),
            "pid": lambda v: AccountEntity.pid == v,
            "onyen": lambda v: AccountEntity.onyen.ilike(v),
        }
        query = select(AccountEntity)
        for key, val in fields.items():
            query = query.where(clause_builders[key](val))

        result = await self.session.execute(query)
        account = result.scalar_one_or_none()
        if account is None:
            raise AccountNotFoundException(**fields)
        return account

    async def _get_invite_token_by_email(self, email: str) -> InviteTokenEntity | None:
        result = await self.session.execute(
            select(InviteTokenEntity).where(InviteTokenEntity.email.ilike(email))
        )
        return result.scalar_one_or_none()

    async def get_accounts(self) -> list[AccountDto]:
        result = await self.session.execute(select(AccountEntity))
        accounts = result.scalars().all()
        return [account.to_dto() for account in accounts]

    async def get_accounts_paginated(self, params: ListQueryParams) -> PaginatedAccountsResponse:
        base_query = select(AccountEntity).where(
            AccountEntity.role.in_([AccountRole.STAFF, AccountRole.ADMIN])
        )

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            dto_converter=lambda entity: entity.to_dto(),
        )
        return PaginatedAccountsResponse(**result.model_dump())

    def export_accounts_to_excel(self, accounts_response: PaginatedAccountsResponse) -> bytes:
        headers = ["Onyen", "Email", "First Name", "Last Name", "PID", "Role"]
        exporter = ExcelExporter(sheet_title=f"Accounts {datetime.now(UTC).strftime('%Y-%m-%d')}")
        exporter.set_headers(headers)
        for account in accounts_response.items:
            exporter.add_row(
                [
                    account.onyen,
                    account.email,
                    account.first_name,
                    account.last_name,
                    account.pid,
                    account.role.value.capitalize(),
                ]
            )
        return exporter.to_bytes()

    def export_aggregate_accounts_to_excel(
        self, accounts_response: PaginatedAggregateAccountsResponse
    ) -> bytes:
        headers = ["Email", "First Name", "Last Name", "Onyen", "PID", "Role", "Status"]
        exporter = ExcelExporter(
            sheet_title=f"Aggregate Accounts {datetime.now(UTC).strftime('%Y-%m-%d')}"
        )
        exporter.set_headers(headers)
        for account in accounts_response.items:
            exporter.add_row(
                [
                    account.email,
                    account.first_name,
                    account.last_name,
                    account.onyen,
                    account.pid,
                    account.role.replace("_", " ").title(),
                    account.status.value.capitalize(),
                ]
            )
        return exporter.to_bytes()

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

    async def get_account_by(self, **fields: Unpack[AccountUniqueFields]) -> AccountDto:
        account_entity = await self._get_account_entity_by(**fields)
        return account_entity.to_dto()

    async def create_account(self, data: AccountData) -> AccountDto:
        new_account = AccountEntity.from_data(data)
        try:
            self.session.add(new_account)
            await self.session.commit()
        except IntegrityError as e:
            msg = str(e.orig).lower()
            present_fields = [
                f for f in AccountUniqueFields.__annotations__ if f in msg and hasattr(data, f)
            ]
            raise AccountConflictException(**{f: getattr(data, f) for f in present_fields}) from e
        await self.session.refresh(new_account)
        return new_account.to_dto()

    async def update_account(self, account_id: int, data: AccountUpdateData) -> AccountDto:
        account_entity = await self._get_account_entity_by(id=account_id)
        account_entity.role = data.role
        self.session.add(account_entity)
        await self.session.commit()
        await self.session.refresh(account_entity)
        return account_entity.to_dto()

    async def delete_account(self, account_id: int) -> AccountDto:
        account_entity = await self._get_account_entity_by(id=account_id)
        account = account_entity.to_dto()
        await self.session.delete(account_entity)
        await self.session.commit()
        return account

    async def delete_invite(self, invite_id: int) -> None:
        invite = await self.session.get(InviteTokenEntity, invite_id)
        if invite is None:
            raise NotFoundException(detail=f"Invite token with id {invite_id} not found")
        await self.session.delete(invite)
        await self.session.commit()

    async def resend_invite(self, invite_id: int) -> None:
        invite = await self.session.get(InviteTokenEntity, invite_id)
        if invite is None:
            raise NotFoundException(detail=f"Invite token with id {invite_id} not found")

        invite.expires_at = datetime.now(UTC) + timedelta(hours=env.INVITE_TOKEN_EXPIRY_HOURS)
        self.session.add(invite)

        try:
            await self._send_invite_email(invite.email)
        except Exception:
            await self.session.rollback()
            raise

        await self.session.commit()

    async def upsert_idp_account(self, data: AccountData) -> AccountDto:
        try:
            account_entity = await self._get_account_entity_by(onyen=data.onyen)
        except AccountNotFoundException as e:
            if data.role != AccountRole.STUDENT:
                raise ForbiddenException(detail="No matching account found") from e
            return await self.create_account(data)

        if data.role != AccountRole.STUDENT and account_entity.role != data.role:
            raise ForbiddenException(detail="Role mismatch")

        account_entity.first_name = data.first_name
        account_entity.last_name = data.last_name
        account_entity.email = data.email
        account_entity.pid = data.pid
        self.session.add(account_entity)
        await self.session.commit()
        await self.session.refresh(account_entity)
        return account_entity.to_dto()

    async def create_invite(self, data: CreateInviteDto) -> None:
        try:
            await self._get_account_entity_by(email=data.email)
            raise InviteConflictException(data.email)
        except AccountNotFoundException:
            pass

        now = datetime.now(UTC)
        existing_invite = await self._get_invite_token_by_email(data.email)
        if existing_invite is not None:
            if not existing_invite.is_expired(now):
                raise InviteConflictException(data.email)
            await self.session.delete(existing_invite)
            await self.session.flush()

        invite = InviteTokenEntity.from_data(data)
        try:
            self.session.add(invite)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise InviteConflictException(data.email) from e

        try:
            await self._send_invite_email(data.email)
        except Exception:
            await self.session.delete(invite)
            await self.session.commit()
            raise

    async def _send_invite_email(self, to: str) -> None:
        login_url = f"{env.FRONTEND_BASE_URL}/staff/login"
        html = f"""
            <p>You have been invited to join PartySmart as a staff member.</p>
            <p>Sign in with your UNC credentials at the link below:</p>
            <p><a href="{login_url}">{login_url}</a></p>
            <p>Your invitation will expire in {env.INVITE_TOKEN_EXPIRY_HOURS} hours.</p>
        """
        await self.email_service.send_email(to, "You're invited to PartySmart", html)

    async def provision_staff_account(self, data: AccountData) -> AccountDto:
        try:
            account_entity = await self._get_account_entity_by(pid=data.pid)
        except AccountNotFoundException:
            account_entity = None

        invite = await self._get_invite_token_by_email(data.email)

        if account_entity is not None and account_entity.role in {
            AccountRole.STAFF,
            AccountRole.ADMIN,
        }:
            account_entity.first_name = data.first_name
            account_entity.last_name = data.last_name
            account_entity.email = data.email
            account_entity.onyen = data.onyen
            account_entity.pid = data.pid

            if invite is not None:
                await self.session.delete(invite)

            self.session.add(account_entity)
            await self.session.commit()
            await self.session.refresh(account_entity)
            return account_entity.to_dto()

        if invite is None:
            raise ForbiddenException(detail="No matching invite token found")

        if invite.is_expired(datetime.now(UTC)):
            raise ForbiddenException(detail="Invite token has expired")

        new_account = AccountEntity.from_data(data)
        new_account.role = AccountRole(invite.role.value)
        try:
            self.session.add(new_account)
            await self.session.delete(invite)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise AccountConflictException(email=data.email, onyen=data.onyen, pid=data.pid) from e
        await self.session.refresh(new_account)
        return new_account.to_dto()

    async def get_aggregate_accounts_paginated(
        self, params: ListQueryParams
    ) -> PaginatedAggregateAccountsResponse:
        accounts_sq = select(
            AccountEntity.id.label("source_id"),
            AccountEntity.email.label("email"),
            func.lower(cast(AccountEntity.role, String)).label("role"),
            literal("active").label("status"),
            AccountEntity.first_name.label("first_name"),
            AccountEntity.last_name.label("last_name"),
            AccountEntity.onyen.label("onyen"),
            AccountEntity.pid.label("pid"),
        ).where(AccountEntity.role.in_([AccountRole.STAFF, AccountRole.ADMIN]))

        police_sq = select(
            PoliceEntity.id.label("source_id"),
            PoliceEntity.email.label("email"),
            func.lower(cast(PoliceEntity.role, String)).label("role"),
            case((PoliceEntity.is_verified, "active"), else_="unverified").label("status"),
            null().label("first_name"),
            null().label("last_name"),
            null().label("onyen"),
            null().label("pid"),
        )

        tokens_sq = select(
            InviteTokenEntity.id.label("source_id"),
            InviteTokenEntity.email.label("email"),
            func.lower(cast(InviteTokenEntity.role, String)).label("role"),
            literal("invited").label("status"),
            null().label("first_name"),
            null().label("last_name"),
            null().label("onyen"),
            null().label("pid"),
        ).where(InviteTokenEntity.expires_at >= datetime.now(UTC))

        union_sq = union_all(accounts_sq, police_sq, tokens_sq).subquery()
        base_query = select(union_sq)

        fields = {field: getattr(union_sq.c, field) for field in self._AGGREGATE_FIELD_NAMES}
        aggregate_field_set = QueryFieldSet(
            fields=fields,
            searchable=("email", "first_name", "last_name", "onyen", "pid"),
            default_sort=SortParam(field="email", order=SortOrder.ASC),
        )

        query_service = QueryService(self.session, aggregate_field_set)
        result = await query_service.get_paginated(
            params=params,
            base_query=base_query,
            dto_converter=lambda row: AggregateAccountDto(**row),
            use_mappings=True,
        )
        return PaginatedAggregateAccountsResponse(**result.model_dump())
