from unittest.mock import AsyncMock

import pytest
from src.modules.account.account_entity import AccountEntity
from src.modules.account.account_model import (
    AccountRole,
    AccountUpdateData,
    CreateInviteDto,
    InviteTokenRole,
)
from src.modules.account.account_service import (
    AccountConflictException,
    AccountNotFoundException,
    AccountService,
)
from test.modules.account.account_utils import AccountTestUtils
from test.modules.account.invite_token_utils import InviteTokenTestUtils


class TestCreateInvite:
    account_service: AccountService
    invite_token_utils: InviteTokenTestUtils
    mock_email_service: AsyncMock

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        account_service: AccountService,
        invite_token_utils: InviteTokenTestUtils,
        mock_email_service: AsyncMock,
    ):
        self.account_service = account_service
        self.invite_token_utils = invite_token_utils
        self.mock_email_service = mock_email_service

    @pytest.mark.asyncio
    async def test_create_invite_deletes_token_if_email_send_fails(self) -> None:
        data = CreateInviteDto(email="failed-invite@unc.edu", role=InviteTokenRole.STAFF)
        self.mock_email_service.send_email.side_effect = RuntimeError("smtp down")

        with pytest.raises(RuntimeError, match="smtp down"):
            await self.account_service.create_invite(data)

        invites = await self.invite_token_utils.get_all()
        assert invites == []

    @pytest.mark.asyncio
    async def test_create_invite_replaces_expired_token(self) -> None:
        expired_invite = await self.invite_token_utils.create_expired(
            email="expired-invite@unc.edu"
        )

        await self.account_service.create_invite(
            CreateInviteDto(email=expired_invite.email, role=InviteTokenRole.ADMIN)
        )

        invites = await self.invite_token_utils.get_all()
        assert len(invites) == 1

        recreated_invite = invites[0]
        self.invite_token_utils.assert_matches(
            recreated_invite,
            email=expired_invite.email,
            role=InviteTokenRole.ADMIN,
        )
        assert recreated_invite.id != expired_invite.id


class TestResendInvite:
    account_service: AccountService
    invite_token_utils: InviteTokenTestUtils
    mock_email_service: AsyncMock

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        account_service: AccountService,
        invite_token_utils: InviteTokenTestUtils,
        mock_email_service: AsyncMock,
    ):
        self.account_service = account_service
        self.invite_token_utils = invite_token_utils
        self.mock_email_service = mock_email_service

    @pytest.mark.asyncio
    async def test_resend_invite_extends_expiry(self) -> None:
        invite = await self.invite_token_utils.create_one()
        original_expires_at = invite.expires_at

        await self.account_service.resend_invite(invite.id)

        invites = await self.invite_token_utils.get_all()
        assert len(invites) == 1
        resent_invite = invites[0]
        self.invite_token_utils.assert_matches(
            resent_invite,
            email=invite.email,
            role=invite.role,
        )
        assert resent_invite.id == invite.id
        assert resent_invite.expires_at > original_expires_at
        self.mock_email_service.send_email.assert_awaited()

    @pytest.mark.asyncio
    async def test_resend_invite_restores_expiry_if_email_fails(self) -> None:
        invite = await self.invite_token_utils.create_one()
        original_expires_at = invite.expires_at
        self.mock_email_service.send_email.side_effect = RuntimeError("smtp down")

        with pytest.raises(RuntimeError, match="smtp down"):
            await self.account_service.resend_invite(invite.id)

        invites = await self.invite_token_utils.get_all()
        assert len(invites) == 1
        restored_invite = invites[0]
        assert restored_invite.id == invite.id
        self.invite_token_utils.assert_matches(
            restored_invite,
            email=invite.email,
            role=invite.role,
            expires_at=original_expires_at,
        )


class TestAccountService:
    account_utils: AccountTestUtils
    account_service: AccountService

    @pytest.fixture(autouse=True)
    def _setup(self, account_utils: AccountTestUtils, account_service: AccountService):
        self.account_utils = account_utils
        self.account_service = account_service

    @pytest.mark.asyncio
    async def test_create_account(self) -> None:
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)
        self.account_utils.assert_matches(account, data)

    @pytest.mark.asyncio
    async def test_create_account_conflict(self) -> None:
        data = await self.account_utils.next_data()
        await self.account_service.create_account(data)
        with pytest.raises(AccountConflictException):
            await self.account_service.create_account(data)

    @pytest.mark.asyncio
    async def test_create_account_onyen_conflict(self) -> None:
        account = await self.account_utils.create_one()
        conflict_data = await self.account_utils.next_data(onyen=account.onyen)

        with pytest.raises(AccountConflictException):
            await self.account_service.create_account(conflict_data)

    @pytest.mark.asyncio
    async def test_get_accounts(
        self,
        accounts_two_per_role: list[AccountEntity],
    ) -> None:
        accounts = await self.account_service.get_accounts()
        [
            self.account_utils.assert_matches(account, entity)
            for account, entity in zip(accounts, accounts_two_per_role, strict=False)
        ]

    @pytest.mark.asyncio
    async def test_get_accounts_empty(self):
        accounts = await self.account_service.get_accounts()
        assert accounts == []

    @pytest.mark.asyncio
    async def test_get_account_by_id(
        self,
        accounts_two_per_role: list[AccountEntity],
    ):
        fetched = await self.account_service.get_account_by(id=accounts_two_per_role[0].id)
        self.account_utils.assert_matches(fetched, accounts_two_per_role[0])

    @pytest.mark.asyncio
    async def test_get_account_by_id_not_found(self):
        with pytest.raises(AccountNotFoundException):
            await self.account_service.get_account_by(id=999)

    @pytest.mark.asyncio
    async def test_get_account_by_email(self, accounts_two_per_role: list[AccountEntity]):
        account = accounts_two_per_role[0]
        fetched = await self.account_service.get_account_by(email=account.email)
        self.account_utils.assert_matches(fetched, account)

    @pytest.mark.asyncio
    async def test_get_account_by_email_not_found(self):
        with pytest.raises(AccountNotFoundException):
            await self.account_service.get_account_by(email="nonexistent@example.com")

    @pytest.mark.asyncio
    async def test_update_account_role(self):
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)

        update_data = AccountUpdateData(role=AccountRole.ADMIN)
        updated = await self.account_service.update_account(account.id, update_data)

        assert updated.id == account.id
        assert updated.role == AccountRole.ADMIN
        # IdP fields should be unchanged
        assert updated.email == account.email
        assert updated.first_name == account.first_name
        assert updated.last_name == account.last_name
        assert updated.pid == account.pid
        assert updated.onyen == account.onyen

    @pytest.mark.asyncio
    async def test_update_account_not_found(self):
        update_data = AccountUpdateData(role=AccountRole.ADMIN)
        with pytest.raises(AccountNotFoundException):
            await self.account_service.update_account(999, update_data)

    @pytest.mark.asyncio
    async def test_delete_account(self):
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)
        deleted = await self.account_service.delete_account(account.id)

        assert deleted.email == account.email

        with pytest.raises(AccountNotFoundException):
            await self.account_service.get_account_by(id=account.id)

    @pytest.mark.asyncio
    async def test_delete_account_not_found(self):
        with pytest.raises(AccountNotFoundException):
            await self.account_service.delete_account(999)

    @pytest.mark.asyncio
    async def test_get_accounts_by_roles_none_returns_all(
        self, accounts_two_per_role: list[AccountEntity]
    ) -> None:
        accounts = await self.account_service.get_accounts_by_roles()
        assert len(accounts) == len(accounts_two_per_role)

    @pytest.mark.asyncio
    async def test_get_accounts_by_roles_empty_list_returns_all(
        self, accounts_two_per_role: list[AccountEntity]
    ) -> None:
        accounts = await self.account_service.get_accounts_by_roles([])
        assert len(accounts) == len(accounts_two_per_role)

    @pytest.mark.asyncio
    async def test_get_accounts_by_roles_empty_database(self) -> None:
        accounts = await self.account_service.get_accounts_by_roles([AccountRole.STUDENT])
        assert len(accounts) == 0
        assert accounts == []

    @pytest.mark.parametrize(
        "roles",
        [
            [AccountRole.STUDENT],
            [AccountRole.STAFF],
            [AccountRole.ADMIN],
            [AccountRole.STUDENT, AccountRole.ADMIN],
            [AccountRole.STUDENT, AccountRole.STAFF, AccountRole.ADMIN],
        ],
    )
    @pytest.mark.asyncio
    async def test_get_accounts_by_roles(
        self, accounts_two_per_role: list[AccountEntity], roles: list[AccountRole]
    ):
        accounts = await self.account_service.get_accounts_by_roles(roles)
        assert len(accounts) == len([a for a in accounts_two_per_role if a.role in roles])
        assert all(a.role in roles for a in accounts)
        for role in roles:
            account = next((a for a in accounts if a.role == role), None)
            entity = next((a for a in accounts_two_per_role if a.role == role), None)
            self.account_utils.assert_matches(account, entity)

    @pytest.mark.asyncio
    async def test_create_account_duplicate_pid(self) -> None:
        """Test that creating an account with duplicate PID raises conflict."""
        data1 = await self.account_utils.next_data()
        await self.account_service.create_account(data1)

        # Try to create another account with same PID but different email
        data2 = await self.account_utils.next_data()
        data2.pid = data1.pid  # Use same PID

        with pytest.raises(AccountConflictException) as exc_info:
            await self.account_service.create_account(data2)
        assert "PID" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_account_case_insensitive_email(self) -> None:
        """Test that email uniqueness is case-insensitive."""
        data1 = await self.account_utils.next_data()
        data1.email = "test@example.com"
        await self.account_service.create_account(data1)

        # Try to create another account with same email but different case
        data2 = await self.account_utils.next_data()
        data2.email = "TEST@EXAMPLE.COM"

        with pytest.raises(AccountConflictException) as exc_info:
            await self.account_service.create_account(data2)
        assert "email" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_create_account_case_insensitive_email_mixed_case(self) -> None:
        """Test email case-insensitivity with mixed case."""
        data1 = await self.account_utils.next_data()
        data1.email = "User@Example.Com"
        await self.account_service.create_account(data1)

        # Try various case combinations
        data2 = await self.account_utils.next_data()
        data2.email = "user@example.com"

        with pytest.raises(AccountConflictException):
            await self.account_service.create_account(data2)

    @pytest.mark.asyncio
    async def test_get_account_by_email_case_insensitive(self) -> None:
        """Test that getting account by email is case-insensitive."""
        data = await self.account_utils.next_data()
        data.email = "FindMe@Example.Com"
        account = await self.account_service.create_account(data)

        # Should find with lowercase
        found_lower = await self.account_service.get_account_by(email="findme@example.com")
        assert found_lower.id == account.id

        # Should find with uppercase
        found_upper = await self.account_service.get_account_by(email="FINDME@EXAMPLE.COM")
        assert found_upper.id == account.id

        # Should find with mixed case
        found_mixed = await self.account_service.get_account_by(email="FiNdMe@ExAmPlE.cOm")
        assert found_mixed.id == account.id

    @pytest.mark.asyncio
    async def test_get_account_by_pid(self) -> None:
        """Test getting account by PID."""
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)

        found = await self.account_service.get_account_by(pid=account.pid)
        assert found.id == account.id
        assert found.pid == account.pid

    @pytest.mark.asyncio
    async def test_get_account_by_pid_not_found(self) -> None:
        """Test that getting account by non-existent PID raises error."""
        with pytest.raises(AccountNotFoundException):
            await self.account_service.get_account_by(pid="999999999")
