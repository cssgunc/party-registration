import pytest
from src.modules.account.account_entity import AccountEntity
from src.modules.account.account_model import AccountData, AccountRole
from src.modules.account.account_service import (
    AccountByEmailNotFoundException,
    AccountConflictException,
    AccountNotFoundException,
    AccountService,
)
from test.modules.account.account_utils import AccountTestUtils


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
        fetched = await self.account_service.get_account_by_id(accounts_two_per_role[0].id)
        self.account_utils.assert_matches(fetched, accounts_two_per_role[0])

    @pytest.mark.asyncio
    async def test_get_account_by_id_not_found(self):
        with pytest.raises(AccountNotFoundException):
            await self.account_service.get_account_by_id(999)

    @pytest.mark.asyncio
    async def test_get_account_by_email(self, accounts_two_per_role: list[AccountEntity]):
        account = accounts_two_per_role[0]
        fetched = await self.account_service.get_account_by_email(account.email)
        self.account_utils.assert_matches(fetched, account)

    @pytest.mark.asyncio
    async def test_get_account_by_email_not_found(self):
        with pytest.raises(AccountByEmailNotFoundException):
            await self.account_service.get_account_by_email("nonexistent@example.com")

    @pytest.mark.asyncio
    async def test_update_account_full(self):
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)

        update_data = await self.account_utils.next_data(role="admin")
        updated = await self.account_service.update_account(account.id, update_data)

        assert account.id == updated.id
        self.account_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_account_partial(self):
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)

        update_data = AccountData(
            email=account.email,
            first_name=account.first_name,
            last_name=account.last_name,
            pid=account.pid,
            onyen=account.onyen,
            role=AccountRole.ADMIN,
        )
        updated = await self.account_service.update_account(account.id, update_data)

        assert updated.id == account.id
        self.account_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_account_not_found(self):
        update_data = await self.account_utils.next_data()
        with pytest.raises(AccountNotFoundException):
            await self.account_service.update_account(999, update_data)

    @pytest.mark.asyncio
    async def test_update_account_conflict(self):
        data1 = await self.account_utils.next_data()
        data2 = await self.account_utils.next_data()
        await self.account_service.create_account(data1)
        account2 = await self.account_service.create_account(data2)

        with pytest.raises(AccountConflictException):
            await self.account_service.update_account(
                account2.id,
                AccountData(
                    email=data1.email,
                    first_name="Test",
                    last_name="User",
                    pid=data2.pid,
                    onyen=data2.onyen,
                    role=AccountRole.STUDENT,
                ),
            )

    @pytest.mark.asyncio
    async def test_update_account_onyen_conflict(self):
        account1, account2 = await self.account_utils.create_many(i=2)
        conflict_data = AccountData(
            email=account2.email,
            first_name=account2.first_name,
            last_name=account2.last_name,
            pid=account2.pid,
            onyen=account1.onyen,
            role=account2.role,
        )

        with pytest.raises(AccountConflictException):
            await self.account_service.update_account(
                account2.id,
                conflict_data,
            )

    @pytest.mark.asyncio
    async def test_delete_account(self):
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)
        deleted = await self.account_service.delete_account(account.id)

        assert deleted.email == account.email

        with pytest.raises(AccountNotFoundException):
            await self.account_service.get_account_by_id(account.id)

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
    async def test_update_account_duplicate_pid(self) -> None:
        """Test that updating to a duplicate PID raises conflict."""
        data1 = await self.account_utils.next_data()
        data2 = await self.account_utils.next_data()

        account1 = await self.account_service.create_account(data1)
        account2 = await self.account_service.create_account(data2)

        # Try to update account2 to use account1's PID
        data2.pid = account1.pid

        with pytest.raises(AccountConflictException) as exc_info:
            await self.account_service.update_account(account2.id, data2)
        assert "PID" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_account_case_insensitive_email(self) -> None:
        """Test that updating to a duplicate email (different case) raises conflict."""
        data1 = await self.account_utils.next_data()
        data1.email = "original@example.com"
        data2 = await self.account_utils.next_data()
        data2.email = "other@example.com"

        await self.account_service.create_account(data1)
        account2 = await self.account_service.create_account(data2)

        # Try to update account2 to use account1's email in different case
        data2.email = "ORIGINAL@EXAMPLE.COM"

        with pytest.raises(AccountConflictException) as exc_info:
            await self.account_service.update_account(account2.id, data2)
        assert "email" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_update_account_same_email_different_case_same_account(self) -> None:
        """Test that updating email case for the same account works."""
        data = await self.account_utils.next_data()
        data.email = "test@example.com"
        account = await self.account_service.create_account(data)

        # Update to same email but different case - should work
        data.email = "TEST@EXAMPLE.COM"
        updated = await self.account_service.update_account(account.id, data)

        # Email should be updated (case is preserved as stored in database)
        assert updated.email.lower() == data.email.lower()
        assert updated.id == account.id

    @pytest.mark.asyncio
    async def test_update_account_same_pid_same_account(self) -> None:
        """Test that updating with the same PID for the same account works."""
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)

        # Update with same PID - should work
        data.first_name = "Updated"
        updated = await self.account_service.update_account(account.id, data)

        assert updated.pid == account.pid
        assert updated.first_name == "Updated"

    @pytest.mark.asyncio
    async def test_get_account_by_email_case_insensitive(self) -> None:
        """Test that getting account by email is case-insensitive."""
        data = await self.account_utils.next_data()
        data.email = "FindMe@Example.Com"
        account = await self.account_service.create_account(data)

        # Should find with lowercase
        found_lower = await self.account_service.get_account_by_email("findme@example.com")
        assert found_lower.id == account.id

        # Should find with uppercase
        found_upper = await self.account_service.get_account_by_email("FINDME@EXAMPLE.COM")
        assert found_upper.id == account.id

        # Should find with mixed case
        found_mixed = await self.account_service.get_account_by_email("FiNdMe@ExAmPlE.cOm")
        assert found_mixed.id == account.id

    @pytest.mark.asyncio
    async def test_get_account_by_pid(self) -> None:
        """Test getting account by PID."""
        data = await self.account_utils.next_data()
        account = await self.account_service.create_account(data)

        found = await self.account_service.get_account_by_pid(account.pid)
        assert found.id == account.id
        assert found.pid == account.pid

    @pytest.mark.asyncio
    async def test_get_account_by_pid_not_found(self) -> None:
        """Test that getting account by non-existent PID raises error."""
        from src.modules.account.account_service import AccountByPidNotFoundException

        with pytest.raises(AccountByPidNotFoundException):
            await self.account_service.get_account_by_pid("999999999")
