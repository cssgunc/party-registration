import os
from typing import Any, AsyncGenerator, Callable
from unittest.mock import MagicMock, patch

import bcrypt
import googlemaps
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import StringRole
from src.core.database import get_session
from src.main import app
from src.modules.account.account_service import AccountService
from src.modules.complaint.complaint_service import ComplaintService
from src.modules.location.location_service import LocationService
from src.modules.party.party_service import PartyService
from src.modules.police.police_service import PoliceService
from src.modules.student.student_service import StudentService

from test.modules.account.account_utils import AccountTestUtils
from test.modules.complaint.complaint_utils import ComplaintTestUtils
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils
from test.modules.party.party_utils import PartyTestUtils
from test.modules.police.police_utils import PoliceTestUtils
from test.modules.student.student_utils import StudentTestUtils

os.environ["GOOGLE_MAPS_API_KEY"] = "invalid_google_maps_api_key_for_tests"

import pytest
import src.modules  # Ensure all modules are imported so their entities are registered # noqa: F401
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.core.database import EntityBase

DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# =================================== Database ======================================


@pytest_asyncio.fixture(scope="function")
async def test_session():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(EntityBase.metadata.create_all)
    TestAsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with TestAsyncSessionLocal() as session:
        yield session
    await engine.dispose()


# =================================== Clients =======================================

CreateClientCallable = Callable[[StringRole | None], AsyncGenerator[AsyncClient, Any]]


@pytest_asyncio.fixture
async def create_test_client(
    test_session: AsyncSession,
) -> CreateClientCallable:
    async def _create_test_client(role: StringRole | None):
        async def override_get_session():
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
def student_service(test_session: AsyncSession):
    return StudentService(session=test_session)


@pytest.fixture()
def mock_gmaps() -> MagicMock:
    return MagicMock(spec=googlemaps.Client)


@pytest.fixture()
def mock_place():
    """Mock for Google Maps places.place API."""
    with patch("src.modules.location.location_service.places.place") as mock:
        yield mock


@pytest.fixture()
def mock_autocomplete():
    """Mock for Google Maps places.places_autocomplete API."""
    with patch("src.modules.location.location_service.places.places_autocomplete") as mock:
        yield mock


@pytest.fixture()
def location_service(test_session: AsyncSession, mock_gmaps: MagicMock):
    return LocationService(session=test_session, gmaps_client=mock_gmaps)


@pytest.fixture()
def complaint_service(test_session: AsyncSession):
    return ComplaintService(session=test_session)


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
def complaint_utils(test_session: AsyncSession, location_utils: LocationTestUtils):
    return ComplaintTestUtils(session=test_session, location_utils=location_utils)


@pytest.fixture()
def party_utils(
    test_session: AsyncSession, location_utils: LocationTestUtils, student_utils: StudentTestUtils
):
    return PartyTestUtils(
        session=test_session, location_utils=location_utils, student_utils=student_utils
    )
