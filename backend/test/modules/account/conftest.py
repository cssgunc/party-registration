import pytest_asyncio
from src.modules.account.account_entity import AccountEntity
from src.modules.account.account_model import AccountRole
from test.modules.account.account_utils import AccountTestUtils


@pytest_asyncio.fixture()
async def accounts_two_per_role(account_utils: AccountTestUtils) -> list[AccountEntity]:
    roles = [
        AccountRole.STUDENT,
        AccountRole.STAFF,
        AccountRole.ADMIN,
        AccountRole.STUDENT,
        AccountRole.STAFF,
        AccountRole.ADMIN,
    ]
    return [await account_utils.create_one(role=role.value) for role in roles]
