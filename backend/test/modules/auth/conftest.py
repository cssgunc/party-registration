import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.auth.auth_service import AuthService

from test.modules.auth.auth_utils import AuthTestUtils


@pytest_asyncio.fixture
async def auth_utils(test_session: AsyncSession):
    return AuthTestUtils(test_session)


@pytest.fixture
def auth_service(test_session: AsyncSession):
    return AuthService(test_session)
