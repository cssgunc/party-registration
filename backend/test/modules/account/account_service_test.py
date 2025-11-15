import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_model import AccountData, AccountRole
from src.modules.account.account_service import (
    AccountByEmailNotFoundException,
    AccountConflictException,
    AccountNotFoundException,
    AccountService,
)


@pytest.fixture()
def account_service(test_async_session: AsyncSession) -> AccountService:
    return AccountService(session=test_async_session)


@pytest.fixture()
async def accounts_by_roles_fixture(account_service: AccountService) -> None:
    await account_service.create_account(
        AccountData(
            email="student@example.com",
            first_name="Student",
            last_name="One",
            pid="111111111",
            role=AccountRole.STUDENT,
        )
    )
    await account_service.create_account(
        AccountData(
            email="staff@example.com",
            first_name="Staff",
            last_name="Two",
            pid="222222222",
            role=AccountRole.STAFF,
        )
    )
    await account_service.create_account(
        AccountData(
            email="admin@example.com",
            first_name="Admin",
            last_name="Three",
            pid="333333333",
            role=AccountRole.ADMIN,
        )
    )


@pytest.mark.asyncio
async def test_create_account(account_service: AccountService) -> None:
    data = AccountData(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    account = await account_service.create_account(data)
    assert account is not None
    assert account.id is not None
    assert account.email == "test@example.com"
    assert account.first_name == "Test"
    assert account.last_name == "User"
    assert account.pid == "123456789"
    assert account.role == AccountRole.STUDENT


@pytest.mark.asyncio
async def test_create_account_conflict(account_service: AccountService) -> None:
    data = AccountData(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    await account_service.create_account(data)
    with pytest.raises(AccountConflictException):
        await account_service.create_account(data)


@pytest.mark.asyncio
async def test_get_accounts(account_service: AccountService):
    emails = ["a@example.com", "b@example.com", "c@example.com"]
    pids = ["111111111", "222222222", "333333333"]
    for email, pid in zip(emails, pids):
        await account_service.create_account(
            AccountData(
                email=email,
                first_name="Test",
                last_name="User",
                pid=pid,
                role=AccountRole.STUDENT,
            )
        )
    accounts = await account_service.get_accounts()
    assert sorted([a.email for a in accounts]) == sorted(emails)


@pytest.mark.asyncio
async def test_get_accounts_empty(account_service: AccountService):
    accounts = await account_service.get_accounts()
    assert accounts == []


@pytest.mark.asyncio
async def test_get_account_by_id(account_service: AccountService):
    data = AccountData(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    account = await account_service.create_account(data)
    fetched = await account_service.get_account_by_id(account.id)
    assert account.email == fetched.email
    assert account.role == fetched.role
    assert fetched.first_name == "Test"
    assert fetched.last_name == "User"


@pytest.mark.asyncio
async def test_get_account_by_id_not_found(account_service: AccountService):
    with pytest.raises(AccountNotFoundException):
        await account_service.get_account_by_id(999)


@pytest.mark.asyncio
async def test_get_account_by_email(account_service: AccountService):
    data = AccountData(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    account = await account_service.create_account(data)
    fetched = await account_service.get_account_by_email(account.email)
    assert account.email == fetched.email
    assert account.role == fetched.role


@pytest.mark.asyncio
async def test_get_account_by_email_not_found(account_service: AccountService):
    with pytest.raises(AccountByEmailNotFoundException):
        await account_service.get_account_by_email("nonexistent@example.com")


@pytest.mark.asyncio
async def test_update_account_full(account_service: AccountService):
    data = AccountData(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    account = await account_service.create_account(data)

    update_data = AccountData(
        email="updated@example.com",
        first_name="Updated",
        last_name="Person",
        pid="987654321",
        role=AccountRole.ADMIN,
    )
    updated = await account_service.update_account(account.id, update_data)

    assert account.id == updated.id
    assert updated.email == "updated@example.com"
    assert updated.first_name == "Updated"
    assert updated.last_name == "Person"
    assert updated.pid == "987654321"
    assert updated.role == AccountRole.ADMIN


@pytest.mark.asyncio
async def test_update_account_partial(account_service: AccountService):
    data = AccountData(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    account = await account_service.create_account(data)

    update_data = AccountData(
        email=account.email,
        first_name=account.first_name,
        last_name=account.last_name,
        pid=account.pid,
        role=AccountRole.ADMIN,
    )
    updated = await account_service.update_account(account.id, update_data)

    assert updated.id == account.id
    assert updated.role == AccountRole.ADMIN
    assert updated.email == "test@example.com"
    assert updated.first_name == "Test"
    assert updated.last_name == "User"


@pytest.mark.asyncio
async def test_update_account_not_found(account_service: AccountService):
    update_data = AccountData(
        email="updated@example.com",
        first_name="Updated",
        last_name="Person",
        pid="987654321",
        role=AccountRole.ADMIN,
    )
    with pytest.raises(AccountNotFoundException):
        await account_service.update_account(999, update_data)


@pytest.mark.asyncio
async def test_update_account_conflict(account_service: AccountService):
    data1 = AccountData(
        email="a@example.com",
        first_name="Test",
        last_name="User",
        pid="111111111",
        role=AccountRole.STUDENT,
    )
    data2 = AccountData(
        email="b@example.com",
        first_name="Test",
        last_name="User",
        pid="222222222",
        role=AccountRole.STUDENT,
    )
    await account_service.create_account(data1)
    account2 = await account_service.create_account(data2)

    with pytest.raises(AccountConflictException):
        await account_service.update_account(
            account2.id,
            AccountData(
                email="a@example.com",
                first_name="Test",
                last_name="User",
                pid="222222222",
                role=AccountRole.STUDENT,
            ),
        )


@pytest.mark.asyncio
async def test_delete_account(account_service: AccountService):
    data = AccountData(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    account = await account_service.create_account(data)
    deleted = await account_service.delete_account(account.id)

    assert deleted.email == account.email

    with pytest.raises(AccountNotFoundException):
        await account_service.get_account_by_id(account.id)


@pytest.mark.asyncio
async def test_delete_account_not_found(account_service: AccountService):
    with pytest.raises(AccountNotFoundException):
        await account_service.delete_account(999)


@pytest.mark.asyncio
async def test_get_accounts_by_roles_none_returns_all(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles(None)
    assert len(accounts) == 3
    assert sorted([a.email for a in accounts]) == sorted(
        ["student@example.com", "staff@example.com", "admin@example.com"]
    )


@pytest.mark.asyncio
async def test_get_accounts_by_roles_empty_list_returns_all(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles([])
    assert len(accounts) == 3


@pytest.mark.asyncio
async def test_get_accounts_by_roles_single_role_student(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles([AccountRole.STUDENT])
    assert len(accounts) == 1
    assert all(a.role == AccountRole.STUDENT for a in accounts)
    assert accounts[0].email == "student@example.com"


@pytest.mark.asyncio
async def test_get_accounts_by_roles_single_role_staff(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles([AccountRole.STAFF])
    assert len(accounts) == 1
    assert accounts[0].role == AccountRole.STAFF
    assert accounts[0].email == "staff@example.com"


@pytest.mark.asyncio
async def test_get_accounts_by_roles_single_role_admin(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles([AccountRole.ADMIN])
    assert len(accounts) == 1
    assert accounts[0].role == AccountRole.ADMIN
    assert accounts[0].email == "admin@example.com"


@pytest.mark.asyncio
async def test_get_accounts_by_roles_multiple_roles(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles(
        [AccountRole.STUDENT, AccountRole.ADMIN]
    )
    assert len(accounts) == 2
    roles = {a.role for a in accounts}
    assert roles == {AccountRole.STUDENT, AccountRole.ADMIN}
    assert sorted([a.email for a in accounts]) == sorted(
        ["student@example.com", "admin@example.com"]
    )


@pytest.mark.asyncio
async def test_get_accounts_by_roles_all_three_roles(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles(
        [AccountRole.STUDENT, AccountRole.STAFF, AccountRole.ADMIN]
    )
    assert len(accounts) == 3


@pytest.mark.asyncio
async def test_get_accounts_by_roles_no_matches(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles(
        [AccountRole.STUDENT, AccountRole.STAFF, AccountRole.ADMIN]
    )
    assert len(accounts) == 3


@pytest.mark.asyncio
async def test_get_accounts_by_roles_empty_database(
    account_service: AccountService,
) -> None:
    accounts = await account_service.get_accounts_by_roles([AccountRole.STUDENT])
    assert len(accounts) == 0
    assert accounts == []


@pytest.mark.asyncio
async def test_get_accounts_by_roles_preserves_account_data(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles([AccountRole.STUDENT])
    assert len(accounts) == 1
    account = accounts[0]
    assert account.id is not None
    assert account.email == "student@example.com"
    assert account.first_name == "Student"
    assert account.last_name == "One"
    assert account.pid == "111111111"
    assert account.role == AccountRole.STUDENT


@pytest.mark.asyncio
async def test_get_accounts_by_roles_multiple_same_role(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles([AccountRole.STUDENT])
    assert len(accounts) == 1
    assert all(a.role == AccountRole.STUDENT for a in accounts)


@pytest.mark.asyncio
async def test_get_accounts_by_roles_excludes_other_roles(
    account_service: AccountService, accounts_by_roles_fixture: None
) -> None:
    accounts = await account_service.get_accounts_by_roles(
        [AccountRole.STAFF, AccountRole.ADMIN]
    )
    assert len(accounts) == 2
    assert all(a.role != AccountRole.STUDENT for a in accounts)
    assert sum(a.role == AccountRole.STAFF for a in accounts) == 1
    assert sum(a.role == AccountRole.ADMIN for a in accounts) == 1
