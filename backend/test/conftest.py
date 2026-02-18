import os

from sqlalchemy import text

os.environ["GOOGLE_MAPS_API_KEY"] = "invalid_google_maps_api_key_for_tests"

from collections.abc import AsyncGenerator, Callable
from typing import Any
from unittest.mock import MagicMock, patch

import bcrypt
import googlemaps
import pytest
import pytest_asyncio
import src.modules  # Ensure all modules are imported so their entities are registered # noqa: F401
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio.engine import AsyncEngine
from src.core.authentication import StringRole
from src.core.database import EntityBase, database_url, get_session
from src.main import app
from src.modules.account.account_service import AccountService
from src.modules.incident.incident_service import IncidentService
from src.modules.location.location_service import LocationService
from src.modules.party.party_service import PartyService
from src.modules.police.police_service import PoliceService
from src.modules.student.student_service import StudentService

from test.modules.account.account_utils import AccountTestUtils
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils
from test.modules.party.party_utils import PartyTestUtils
from test.modules.police.police_utils import PoliceTestUtils
from test.modules.student.student_utils import StudentTestUtils

DATABASE_URL = database_url("ocsl_test")

# =================================== Database ======================================


@pytest_asyncio.fixture(autouse=True, scope="session", loop_scope="session")
async def test_engine():
    """Create engine and tables once per test session."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(EntityBase.metadata.drop_all)
        await conn.run_sync(EntityBase.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(EntityBase.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session(test_engine: AsyncEngine):
    """Create a new session and truncate all tables after each test."""
    test_async_session_local = async_sessionmaker(
        bind=test_engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )

    async with test_async_session_local() as session:
        yield session

    # Clean up: delete all data and reset identity columns
    tables = [table.name for table in EntityBase.metadata.sorted_tables]
    if tables:
        # Phase 1: delete data inside a transaction
        async with test_engine.begin() as conn:
            # Disable all FK constraints so deletes can run in any order
            for table in tables:
                await conn.execute(text(f"ALTER TABLE [{table}] NOCHECK CONSTRAINT ALL"))

            # Delete all data in reverse FK order
            for table in reversed(tables):
                await conn.execute(text(f"DELETE FROM [{table}]"))

            # Re-enable all FK constraints
            for table in tables:
                await conn.execute(text(f"ALTER TABLE [{table}] CHECK CONSTRAINT ALL"))

        # Phase 2: reset identity columns (DBCC cannot run inside a transaction)
        async with test_engine.connect() as conn:
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            result = await conn.execute(
                text(
                    "SELECT t.name FROM sys.tables t"
                    " INNER JOIN sys.columns c ON t.object_id = c.object_id"
                    " WHERE c.is_identity = 1"
                )
            )
            for (table_name,) in result.fetchall():
                await conn.execute(text(f"DBCC CHECKIDENT ('{table_name}', RESEED, 0)"))


# =================================== Clients =======================================

CreateClientCallable = Callable[[StringRole | None], AsyncGenerator[AsyncClient, Any]]


@pytest_asyncio.fixture
async def create_test_client(
    test_session: AsyncSession,
) -> CreateClientCallable:
    """Fixture to create test HTTP clients with different authentication roles."""

    async def _create_test_client(role: StringRole | None):
        async def override_get_session():
            # Rollback any pending transaction from previous failed requests
            if test_session.in_transaction() and not test_session.is_active:
                await test_session.rollback()
            yield test_session

        app.dependency_overrides[get_session] = override_get_session

        headers = {"Authorization": f"Bearer {role}"} if role else {}
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=headers
        ) as ac:
            yield ac

        app.dependency_overrides.clear()

    return _create_test_client


@pytest_asyncio.fixture
async def admin_client(create_test_client: CreateClientCallable):
    async for client in create_test_client("admin"):
        yield client


@pytest_asyncio.fixture
async def staff_client(create_test_client: CreateClientCallable):
    async for client in create_test_client("staff"):
        yield client


@pytest_asyncio.fixture
async def student_client(create_test_client: CreateClientCallable):
    async for client in create_test_client("student"):
        yield client


@pytest_asyncio.fixture
async def police_client(create_test_client: CreateClientCallable):
    async for client in create_test_client("police"):
        yield client


@pytest_asyncio.fixture
async def unauthenticated_client(create_test_client: CreateClientCallable):
    async for client in create_test_client(None):
        yield client


# =================================== Services ======================================


@pytest.fixture()
def account_service(test_session: AsyncSession):
    return AccountService(session=test_session)


@pytest.fixture()
def fast_bcrypt():
    """Mock bcrypt.gensalt to use faster rounds (4 instead of 12) for testing."""
    original_gensalt = bcrypt.gensalt
    with patch("bcrypt.gensalt", side_effect=lambda rounds=4: original_gensalt(rounds=rounds)):
        yield


@pytest.fixture()
def police_service(test_session: AsyncSession, fast_bcrypt: None):
    return PoliceService(session=test_session)


@pytest.fixture()
def student_service(test_session: AsyncSession, location_service: LocationService):
    return StudentService(session=test_session, location_service=location_service)


@pytest.fixture(autouse=True)
def mock_gmaps():
    mock = MagicMock(spec=googlemaps.Client)
    with patch("googlemaps.Client", return_value=mock):
        yield mock


@pytest.fixture()
def mock_place():
    with patch("src.modules.location.location_service.places.place") as mock:
        yield mock


@pytest.fixture()
def mock_autocomplete():
    with patch("src.modules.location.location_service.places.places_autocomplete") as mock:
        yield mock


@pytest.fixture()
def location_service(test_session: AsyncSession, mock_gmaps: MagicMock):
    return LocationService(session=test_session, gmaps_client=mock_gmaps)


@pytest.fixture()
def incident_service(test_session: AsyncSession):
    return IncidentService(session=test_session)


@pytest.fixture()
def party_service(
    test_session: AsyncSession,
    location_service: LocationService,
    student_service: StudentService,
    account_service: AccountService,
):
    return PartyService(
        session=test_session,
        location_service=location_service,
        student_service=student_service,
        account_service=account_service,
    )


# ==================================== Utils ========================================


@pytest.fixture()
def account_utils(test_session: AsyncSession):
    return AccountTestUtils(session=test_session)


@pytest.fixture()
def police_utils(test_session: AsyncSession):
    return PoliceTestUtils(session=test_session)


@pytest.fixture()
def student_utils(test_session: AsyncSession, account_utils: AccountTestUtils):
    return StudentTestUtils(session=test_session, account_utils=account_utils)


@pytest.fixture()
def location_utils(test_session: AsyncSession):
    return LocationTestUtils(session=test_session)


@pytest.fixture()
def gmaps_utils(
    location_utils: LocationTestUtils, mock_place: MagicMock, mock_autocomplete: MagicMock
):
    return GmapsMockUtils(
        location_utils=location_utils, mock_place=mock_place, mock_autocomplete=mock_autocomplete
    )


@pytest.fixture()
def incident_utils(test_session: AsyncSession, location_utils: LocationTestUtils):
    return IncidentTestUtils(session=test_session, location_utils=location_utils)


@pytest.fixture()
def party_utils(
    test_session: AsyncSession, location_utils: LocationTestUtils, student_utils: StudentTestUtils
):
    return PartyTestUtils(
        session=test_session, location_utils=location_utils, student_utils=student_utils
    )
