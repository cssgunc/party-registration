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
                    role=AccountRole.STUDENT,
                ),
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
