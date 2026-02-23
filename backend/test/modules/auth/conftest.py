import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_service import AccountService
from src.modules.auth.auth_service import AuthService
from src.modules.police.police_service import PoliceService

from test.modules.auth.auth_utils import AuthTestUtils


@pytest_asyncio.fixture
async def auth_utils(test_session: AsyncSession):
    return AuthTestUtils(test_session)


@pytest.fixture
def auth_service(
    test_session: AsyncSession,
    account_service: AccountService,
    police_service: PoliceService,
):
    return AuthService(test_session, account_service, police_service)
