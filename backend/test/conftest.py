import pytest_asyncio
import src.modules  # Ensure all modules are imported so their entities are registered # noqa: F401
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from src.core.database import EntityBase
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.police.police_entity import PoliceEntity

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def test_async_session():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(EntityBase.metadata.create_all)
    TestAsyncSessionLocal = async_sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    async with TestAsyncSessionLocal() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def test_account(test_async_session: AsyncSession) -> AccountEntity:
    """Create a test account for use in tests."""
    account = AccountEntity(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(account)
    await test_async_session.commit()
    await test_async_session.refresh(account)
    return account


@pytest_asyncio.fixture
async def test_police(test_async_session: AsyncSession) -> PoliceEntity:
    """Create a test police singleton for use in tests."""
    police = PoliceEntity(
        email="police@example.com", hashed_password="$2b$12$test_hashed_password"
    )
    test_async_session.add(police)
    await test_async_session.commit()
    await test_async_session.refresh(police)
    return police
