from datetime import UTC, datetime, timedelta
from typing import ClassVar, TypedDict, Unpack
from urllib.parse import urljoin

from fastapi import Depends
from sqlalchemy import String, case, cast, func, literal, null, select, union_all
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.core.utils.email_utils import EmailService
from src.core.utils.excel_utils import export_to_excel
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
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
    """Keyword arguments accepted by account lookup methods.

    All fields are optional and nullable; pass any combination to build a
    ``WHERE`` clause that filters on those unique identifiers.
    """

    id: int | None
    email: str | None
    onyen: str | None
    pid: str | None


class AccountConflictException(ConflictException):
    """Raised when an account with the given unique field(s) already exists (HTTP 409)."""

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
    """Raised when no account matches the given unique field(s) (HTTP 404)."""

    def __init__(self, **fields: Unpack[AccountUniqueFields]):
        parts = [f"{key} {val}" for key, val in fields.items()]

        if parts:
            super().__init__(f"Account with {' or '.join(parts)} not found")
        else:
            super().__init__("Account not found")


class CannotDeleteOwnAccountException(ForbiddenException):
    """Raised when an admin attempts to delete their own account (HTTP 403)."""

    def __init__(self):
        super().__init__(detail="Admins cannot delete their own account")


class CannotRemoveLastAdminException(ForbiddenException):
    """Raised when an operation would leave zero admin accounts (HTTP 403)."""

    def __init__(self):
        super().__init__(detail="Cannot remove the last remaining admin")


class InviteConflictException(ConflictException):
    """Raised when an account or a live invite already exists for the given email (HTTP 409)."""

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
    default_sort=SortParam(field="onyen", order=SortOrder.DESC),
)


def _build_aggregate_query_fields(fields: dict) -> QueryFieldSet:
    """Build a `QueryFieldSet` for the aggregate accounts union query.

    Centralises the searchable-field list and default sort so the same config
    can be used for both the static class-level constant and the per-request
    union subquery variant.
    """
    return QueryFieldSet(
        fields=fields,
        searchable=("email", "first_name", "last_name", "onyen", "pid"),
        default_sort=SortParam(field="onyen", order=SortOrder.DESC),
    )


_AGGREGATE_QUERY_FIELDS = _build_aggregate_query_fields(
    {
        "email": AccountEntity.email,
        "first_name": AccountEntity.first_name,
        "last_name": AccountEntity.last_name,
        "onyen": AccountEntity.onyen,
        "pid": AccountEntity.pid,
        "role": AccountEntity.role,
        "status": literal("active").label("status"),
    }
)


class AccountService:
    """Business-logic layer for account management, invites, and IdP upserts.

    Handles CRUD for staff/admin accounts, invite-token lifecycle (create, resend,
    delete, resolve on login), IdP-driven account upserts, and the aggregate view
    that merges UNC accounts, police accounts, and pending invite tokens. Injected
    per request via FastAPI ``Depends``.
    """

    QUERY_FIELDS: ClassVar[QueryFieldSet] = _ACCOUNT_QUERY_FIELDS
    AGGREGATE_QUERY_FIELDS: ClassVar[QueryFieldSet] = _AGGREGATE_QUERY_FIELDS

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
        query_service: QueryService = Depends(),
    ):
        self.session = session
        self.email_service = email_service
        self.query_service = query_service

    async def get_account_entity_by(self, **fields: Unpack[AccountUniqueFields]) -> AccountEntity:
        """Fetch an account entity matching all supplied unique-field values.

        Raises:
            AccountNotFoundException: If no account matches the given fields.
        """
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
        """Return the invite token for ``email`` (case-insensitive), or None if absent."""
        result = await self.session.execute(
            select(InviteTokenEntity).where(InviteTokenEntity.email.ilike(email))
        )
        return result.scalar_one_or_none()

    async def get_accounts(self) -> list[AccountDto]:
        """Return all accounts with no filtering or pagination."""
        result = await self.session.execute(select(AccountEntity))
        accounts = result.scalars().all()
        return [account.to_dto() for account in accounts]

    async def get_accounts_paginated(self, params: ListQueryParams) -> PaginatedAccountsResponse:
        """Get staff and admin accounts with pagination, sorting, and filtering."""
        base_query = select(AccountEntity).where(
            AccountEntity.role.in_([AccountRole.STAFF, AccountRole.ADMIN])
        )

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            field_set=_ACCOUNT_QUERY_FIELDS,
        )
        return PaginatedAccountsResponse(**result.model_dump())

    def export_accounts_to_excel(self, accounts_response: PaginatedAccountsResponse) -> bytes:
        """Render staff/admin accounts as an Excel workbook."""
        return export_to_excel(
            resource_name="Accounts",
            field_map={
                "Onyen": lambda a: a.onyen,
                "Email": lambda a: a.email,
                "First Name": lambda a: a.first_name,
                "Last Name": lambda a: a.last_name,
                "PID": lambda a: a.pid,
                "Role": lambda a: a.role.value.capitalize(),
            },
            items=accounts_response.items,
        )

    def export_aggregate_accounts_to_excel(
        self, accounts_response: PaginatedAggregateAccountsResponse
    ) -> bytes:
        """Render the aggregate accounts view as an Excel workbook."""
        return export_to_excel(
            resource_name="Aggregate Accounts",
            field_map={
                "Email": lambda a: a.email,
                "First Name": lambda a: a.first_name,
                "Last Name": lambda a: a.last_name,
                "Onyen": lambda a: a.onyen,
                "PID": lambda a: a.pid,
                "Role": lambda a: a.role.replace("_", " ").title(),
                "Status": lambda a: a.status.value.capitalize(),
            },
            items=accounts_response.items,
        )

    async def get_accounts_by_roles(
        self, roles: list[AccountRole] | None = None
    ) -> list[AccountDto]:
        """Return all accounts whose role is in ``roles``; returns all if ``roles`` is empty."""
        if not roles:
            return await self.get_accounts()
        result = await self.session.execute(
            select(AccountEntity).where(AccountEntity.role.in_(roles))
        )
        accounts = result.scalars().all()
        return [account.to_dto() for account in accounts]

    async def get_account_by(self, **fields: Unpack[AccountUniqueFields]) -> AccountDto:
        """Fetch an account DTO matching all supplied unique-field values.

        Raises:
            AccountNotFoundException: If no account matches the given fields.
        """
        account_entity = await self.get_account_entity_by(**fields)
        return account_entity.to_dto()

    async def create_account(self, data: AccountData) -> AccountDto:
        """Persist a new account from ``data`` and return its DTO.

        Raises:
            AccountConflictException: If a unique constraint (email, onyen, pid)
                is violated.
        """
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
        """Update the role of an existing account.

        Raises:
            AccountNotFoundException: If no account has the given ID.
            CannotRemoveLastAdminException: If downgrading the only remaining admin.
        """
        account_entity = await self.get_account_entity_by(id=account_id)
        if account_entity.role == AccountRole.ADMIN and data.role != AccountRole.ADMIN:
            admins = await self.get_accounts_by_roles([AccountRole.ADMIN])
            if len(admins) <= 1:
                raise CannotRemoveLastAdminException()
        account_entity.role = data.role
        self.session.add(account_entity)
        await self.session.commit()
        await self.session.refresh(account_entity)
        return account_entity.to_dto()

    async def delete_account(self, account_id: int) -> AccountDto:
        """Delete an account and return its final state.

        Raises:
            AccountNotFoundException: If no account has the given ID.
            CannotRemoveLastAdminException: If deleting the only remaining admin.
        """
        account_entity = await self.get_account_entity_by(id=account_id)
        if account_entity.role == AccountRole.ADMIN:
            admins = await self.get_accounts_by_roles([AccountRole.ADMIN])
            if len(admins) <= 1:
                raise CannotRemoveLastAdminException()
        account = account_entity.to_dto()
        await self.session.delete(account_entity)
        await self.session.commit()
        return account

    async def delete_invite(self, invite_id: int) -> None:
        """Delete a pending invite token by ID.

        Raises:
            NotFoundException: If no invite token has the given ID.
        """
        invite = await self.session.get(InviteTokenEntity, invite_id)
        if invite is None:
            raise NotFoundException(detail=f"Invite token with id {invite_id} not found")
        await self.session.delete(invite)
        await self.session.commit()

    async def resend_invite(self, invite_id: int) -> None:
        """Extend an existing invite's expiry and resend the invitation email.

        Raises:
            NotFoundException: If no invite token has the given ID.
            Exception: Propagates any email-send failure; rolls back the expiry
                extension so the token retains its previous ``expires_at``.
        """
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
        """Create or update an account keyed on PID from IdP login data.

        If no account exists for ``data.pid``, creates a new student account
        (ignoring the role in ``data``). If one exists, updates the mutable
        profile fields (name, email, onyen) without touching the role.
        """
        try:
            account_entity = await self.get_account_entity_by(pid=data.pid)
        except AccountNotFoundException:
            return await self.create_account(data.model_copy(update={"role": AccountRole.STUDENT}))

        account_entity.first_name = data.first_name
        account_entity.last_name = data.last_name
        account_entity.email = data.email
        account_entity.onyen = data.onyen
        self.session.add(account_entity)
        await self.session.commit()
        await self.session.refresh(account_entity)
        return account_entity.to_dto()

    async def resolve_invite(self, account: AccountDto, requesting_role: AccountRole) -> AccountDto:
        """Apply a pending invite token to an account on login, if one exists.

        If no token is found for ``account.email``, returns ``account`` unchanged.
        If the token is expired and the caller is staff/admin, raises a 403.
        If the token is expired and the caller is a student, silently returns the
        unchanged account (the token row is left for the staff-login path to surface
        the expiry message). Otherwise, upgrades the account's role, deletes the
        token, and returns the updated DTO.

        Raises:
            ForbiddenException: If a staff or admin caller has an expired invite.
        """
        invite = await self._get_invite_token_by_email(account.email)
        if invite is None:
            return account
        if invite.is_expired(datetime.now(UTC)):
            if requesting_role in (AccountRole.STAFF, AccountRole.ADMIN):
                raise ForbiddenException(detail="Invite token has expired")
            # Student login is unaffected by an expired staff invite. Leave the
            # row so the user gets "Invite token has expired" if they eventually
            # try the staff login path, rather than a silent redirect to /.
            return account
        account_entity = await self.get_account_entity_by(id=account.id)
        account_entity.role = AccountRole(invite.role.value)
        self.session.add(account_entity)
        await self.session.delete(invite)
        await self.session.commit()
        await self.session.refresh(account_entity)
        return account_entity.to_dto()

    async def create_invite(self, data: CreateInviteDto) -> None:
        """Create an invite token and send the invitation email.

        Rejects if the email already belongs to a staff/admin account or a live
        (non-expired) invite token. If an expired token exists for the email,
        it is deleted first and replaced with a fresh one.

        Raises:
            InviteConflictException: If the email already has a live account or invite.
            Exception: Propagates any email-send failure; rolls back and deletes
                the newly created token.
        """
        try:
            existing_account = await self.get_account_entity_by(email=data.email)
            if existing_account.role in (AccountRole.STAFF, AccountRole.ADMIN):
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
        """Send the PartySmart staff-invite email to ``to``.

        Builds the sign-in URL from ``env.FRONTEND_BASE_URL`` and includes the
        token expiry hours from ``env.INVITE_TOKEN_EXPIRY_HOURS`` in the body.
        """
        login_url = urljoin(str(env.FRONTEND_BASE_URL), "/staff/login")
        html = f"""
            <p>You have been invited to join PartySmart as a staff member.</p>
            <p>Sign in with your UNC credentials at the link below:</p>
            <p><a href="{login_url}">{login_url}</a></p>
            <p>Your invitation will expire in {env.INVITE_TOKEN_EXPIRY_HOURS} hours.</p>
        """
        await self.email_service.send_email(to, "You're invited to PartySmart", html)

    async def get_aggregate_accounts_paginated(
        self, params: ListQueryParams
    ) -> PaginatedAggregateAccountsResponse:
        """Get the unified aggregate view with pagination, sorting, and filtering.

        Merges three sources via ``UNION ALL``:

        - **accounts**: staff and admin UNC accounts (status ``active``).
        - **police**: all police accounts (status ``active`` or ``unverified``).
        - **invite_tokens**: non-expired invite tokens (status ``invited``).

        Because the subquery is dynamic, a per-request ``QueryFieldSet`` is built
        from the union subquery's columns so filters and sorts resolve correctly.
        """
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
        aggregate_field_set = _build_aggregate_query_fields(fields)

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            dto_converter=lambda row: AggregateAccountDto(**row),
            field_set=aggregate_field_set,
            use_mappings=True,
        )
        return PaginatedAggregateAccountsResponse(**result.model_dump())
