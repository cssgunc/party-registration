from typing import Any
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from src.core.authentication import authenticate_police_or_admin
from src.main import app
from src.modules.account.account_model import Account, AccountRole
from src.modules.location.location_model import Location
from src.modules.location.location_service import (
    LocationNotFoundException,
    LocationService,
)
from src.modules.police.police_model import PoliceAccount


@pytest_asyncio.fixture
async def mock_location_service():
    """Create a mock LocationService for testing"""
    return AsyncMock(spec=LocationService)


@pytest_asyncio.fixture
async def override_dependencies_police(mock_location_service: AsyncMock):
    """Override dependencies with police authentication"""

    async def _fake_police():
        return PoliceAccount(email="police@example.com")

    def _get_mock_location_service():
        return mock_location_service

    app.dependency_overrides[authenticate_police_or_admin] = _fake_police
    app.dependency_overrides[LocationService] = _get_mock_location_service
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def override_dependencies_admin(mock_location_service: AsyncMock):
    """Override dependencies with admin authentication"""

    async def _fake_admin():
        return Account(
            id=1,
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            pid="999999999",
            role=AccountRole.ADMIN,
        )

    def _get_mock_location_service():
        return mock_location_service

    app.dependency_overrides[authenticate_police_or_admin] = _fake_admin
    app.dependency_overrides[LocationService] = _get_mock_location_service
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def override_dependencies_no_auth(mock_location_service: AsyncMock):
    """Override dependencies without authentication"""

    def _get_mock_location_service():
        return mock_location_service

    app.dependency_overrides[LocationService] = _get_mock_location_service
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_increment_warnings_as_police(
    override_dependencies_police: Any, mock_location_service: AsyncMock
):
    """Test incrementing warnings as police returns updated location"""
    mock_location = Location(
        id=1,
        google_place_id="ChIJTest123",
        formatted_address="123 Test St, Chapel Hill, NC 27514, USA",
        latitude=35.9132,
        longitude=-79.0558,
        street_number="123",
        street_name="Test St",
        unit=None,
        city="Chapel Hill",
        county="Orange County",
        state="NC",
        country="US",
        zip_code="27514",
        warning_count=1,
        citation_count=0,
        hold_expiration=None,
    )
    mock_location_service.increment_warnings.return_value = mock_location

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/police/locations/1/warnings")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["warning_count"] == 1
        mock_location_service.increment_warnings.assert_called_once_with(1)


@pytest.mark.asyncio
async def test_increment_citations_as_admin(
    override_dependencies_admin: Any, mock_location_service: AsyncMock
):
    """Test incrementing citations as admin returns updated location"""
    mock_location = Location(
        id=2,
        google_place_id="ChIJTest456",
        formatted_address="456 Test Ave, Durham, NC 27701, USA",
        latitude=35.9940,
        longitude=-78.8986,
        street_number="456",
        street_name="Test Ave",
        unit=None,
        city="Durham",
        county="Durham County",
        state="NC",
        country="US",
        zip_code="27701",
        warning_count=0,
        citation_count=1,
        hold_expiration=None,
    )
    mock_location_service.increment_citations.return_value = mock_location

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/police/locations/2/citations")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 2
        assert data["citation_count"] == 1
        mock_location_service.increment_citations.assert_called_once_with(2)


@pytest.mark.asyncio
async def test_increment_warnings_location_not_found(
    override_dependencies_police: Any, mock_location_service: AsyncMock
):
    """Test incrementing warnings for non-existent location returns 404"""
    mock_location_service.increment_warnings.side_effect = LocationNotFoundException(
        location_id=999
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/police/locations/999/warnings")

        assert response.status_code == 404
        mock_location_service.increment_warnings.assert_called_once_with(999)


@pytest.mark.asyncio
async def test_increment_warnings_unauthenticated(override_dependencies_no_auth: Any):
    """Test incrementing warnings without authentication returns 401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/police/locations/1/warnings")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_increment_citations_unauthenticated(override_dependencies_no_auth: Any):
    """Test incrementing citations without authentication returns 401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/police/locations/1/citations")
        assert response.status_code == 401
