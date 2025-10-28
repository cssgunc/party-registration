import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.exceptions import CredentialsException
from src.modules.account.account_model import AccountData, AccountRoleEnum
from src.modules.account.account_service import (
    AccountByEmailNotFoundException,
    AccountConflictException,
    AccountNotFoundException,
    AccountService,
)


@pytest.fixture()
def account_service(test_async_session: AsyncSession) -> AccountService:
    return AccountService(session=test_async_session)


@pytest.mark.asyncio
async def test_create_account(account_service: AccountService) -> None:
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    account = await account_service.create_account(data)
    assert account is not None
    assert account.id is not None
    assert account.email == "test@example.com"
    assert account.role == AccountRoleEnum.STUDENT
    assert account.password != "password"
    assert len(account.password) > 20  # Check that it's a hash


@pytest.mark.asyncio
async def test_create_account_conflict(account_service: AccountService) -> None:
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    await account_service.create_account(data)
    with pytest.raises(AccountConflictException):
        await account_service.create_account(data)


@pytest.mark.asyncio
async def test_get_accounts(account_service: AccountService):
    emails = ["a@example.com", "b@example.com", "c@example.com"]
    for email in emails:
        await account_service.create_account(
            AccountData(email=email, password="password", role=AccountRoleEnum.STUDENT)
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
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    account = await account_service.create_account(data)
    fetched = await account_service.get_account_by_id(account.id)
    assert account.email == fetched.email
    assert account.role == fetched.role


@pytest.mark.asyncio
async def test_get_account_by_id_not_found(account_service: AccountService):
    with pytest.raises(AccountNotFoundException):
        await account_service.get_account_by_id(999)


@pytest.mark.asyncio
async def test_get_account_by_email(account_service: AccountService):
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
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
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    account = await account_service.create_account(data)

    original_hash = account.password

    update_data = AccountData(
        email="updated@example.com", password="newpassword", role=AccountRoleEnum.ADMIN
    )
    updated = await account_service.update_account(account.id, update_data)

    assert account.id == updated.id
    assert updated.email == "updated@example.com"
    assert updated.role == AccountRoleEnum.ADMIN
    assert updated.password != "newpassword"
    assert updated.password != original_hash


@pytest.mark.asyncio
async def test_update_account_partial(account_service: AccountService):
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    account = await account_service.create_account(data)
    original_hash = account.password

    # Assuming AccountData allows partials, or you construct it this way
    # If AccountData requires all fields, this simulates a "role only" change
    update_data = AccountData(
        email=account.email,
        password="password",  # Provide original password
        role=AccountRoleEnum.ADMIN,
    )
    updated = await account_service.update_account(account.id, update_data)

    assert updated.id == account.id
    assert updated.role == AccountRoleEnum.ADMIN
    assert updated.email == "test@example.com"
    assert (
        updated.password == original_hash
    )  # Password should not be re-hashed if not changed


@pytest.mark.asyncio
async def test_update_account_not_found(account_service: AccountService):
    update_data = AccountData(
        email="updated@example.com", password="newpassword", role=AccountRoleEnum.ADMIN
    )
    with pytest.raises(AccountNotFoundException):
        await account_service.update_account(999, update_data)


@pytest.mark.asyncio
async def test_update_account_conflict(account_service: AccountService):
    data1 = AccountData(
        email="a@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    data2 = AccountData(
        email="b@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    await account_service.create_account(data1)
    account2 = await account_service.create_account(data2)

    with pytest.raises(AccountConflictException):
        await account_service.update_account(
            account2.id,
            AccountData(
                email="a@example.com", password="password", role=AccountRoleEnum.STUDENT
            ),
        )


@pytest.mark.asyncio
async def test_delete_account(account_service: AccountService):
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
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
async def test_verify_account_credentials(account_service: AccountService):
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    account = await account_service.create_account(data)

    verified = await account_service.verify_account_credentials(
        "test@example.com", "password"
    )
    assert verified.email == account.email
    assert verified.role == account.role


@pytest.mark.asyncio
async def test_verify_account_credentials_case_insensitive(
    account_service: AccountService,
):
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    await account_service.create_account(data)

    verified = await account_service.verify_account_credentials(
        "TEST@example.com", "password"
    )
    assert verified.email == "test@example.com"


@pytest.mark.asyncio
async def test_verify_account_credentials_invalid(account_service: AccountService):
    data = AccountData(
        email="test@example.com", password="password", role=AccountRoleEnum.STUDENT
    )
    await account_service.create_account(data)

    with pytest.raises(CredentialsException):
        await account_service.verify_account_credentials(
            "test@example.com", "wrongpassword"
        )


@pytest.mark.asyncio
async def test_verify_account_credentials_not_found(account_service: AccountService):
    with pytest.raises(AccountByEmailNotFoundException):
        await account_service.verify_account_credentials(
            "nonexistent@example.com", "password"
        )
