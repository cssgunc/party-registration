from typing import Any
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from src.main import app
from src.modules.location.location_model import AutocompleteResult
from src.modules.location.location_service import LocationService


@pytest_asyncio.fixture
async def mock_location_service():
    """Create a mock LocationService for testing"""
    return AsyncMock(spec=LocationService)


@pytest_asyncio.fixture
async def override_dependencies(mock_location_service: AsyncMock):
    """Override dependencies to provide mock service and auth"""

    def _get_mock_location_service():
        return mock_location_service

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


@pytest_asyncio.fixture
async def admin_client(override_dependencies: Any):
    """Create an authenticated admin client"""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer admin"},
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_autocomplete_success(
    admin_client: AsyncClient, mock_location_service: AsyncMock
):
    """Test that the endpoint returns multiple address suggestions successfully"""
    mock_results = [
        AutocompleteResult(
            formatted_address="123 Main St, Chapel Hill, NC 27514, USA",
            place_id="ChIJTest123",
        ),
        AutocompleteResult(
            formatted_address="123 Main St, Durham, NC 27701, USA",
            place_id="ChIJTest456",
        ),
    ]
    mock_location_service.autocomplete_address.return_value = mock_results

    response = await admin_client.post(
        "/api/locations/autocomplete", json={"address": "123 Main St"}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["formatted_address"] == "123 Main St, Chapel Hill, NC 27514, USA"
    assert data[0]["place_id"] == "ChIJTest123"
    mock_location_service.autocomplete_address.assert_called_once_with("123 Main St")


@pytest.mark.asyncio
async def test_autocomplete_empty_results(
    admin_client: AsyncClient, mock_location_service: AsyncMock
):
    """Test that the endpoint returns an empty list when no addresses match"""
    mock_location_service.autocomplete_address.return_value = []

    response = await admin_client.post(
        "/api/locations/autocomplete",
        json={"address": "nonexistentaddress12345xyz"},
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_autocomplete_missing_address(admin_client: AsyncClient):
    """Test that the endpoint returns 422 when address field is missing"""
    response = await admin_client.post("/api/locations/autocomplete", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_autocomplete_empty_string(
    admin_client: AsyncClient, mock_location_service: AsyncMock
):
    """Test that the endpoint handles empty string gracefully"""
    mock_location_service.autocomplete_address.return_value = []

    response = await admin_client.post(
        "/api/locations/autocomplete", json={"address": ""}
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_autocomplete_unauthenticated(override_dependencies_no_auth: Any):
    """Test that the endpoint requires authentication"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/locations/autocomplete", json={"address": "123 Main St"}
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_autocomplete_service_exception(
    admin_client: AsyncClient, mock_location_service: AsyncMock
):
    """Test that service exceptions are handled correctly"""
    mock_location_service.autocomplete_address.side_effect = Exception(
        "Service temporarily unavailable"
    )

    response = await admin_client.post(
        "/api/locations/autocomplete",
        json={"address": "123 Test St"},
    )

    assert response.status_code == 500


@pytest.mark.asyncio
async def test_autocomplete_value_error(
    admin_client: AsyncClient, mock_location_service: AsyncMock
):
    """Test that ValueError from API is handled correctly"""
    mock_location_service.autocomplete_address.side_effect = ValueError(
        "Invalid API key provided"
    )

    response = await admin_client.post(
        "/api/locations/autocomplete",
        json={"address": "123 Test St"},
    )

    assert response.status_code == 400
