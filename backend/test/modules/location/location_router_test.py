from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from src.core.authentication import authenticate_user
from src.main import app
from src.modules.account.account_model import Account, AccountRole
from src.modules.location.location_model import AutocompleteResult


@pytest_asyncio.fixture
async def authenticated_client():
    async def override_authenticate_user():
        return Account(
            id=1,
            email="test@example.com",
            password="hashed_password",
            role=AccountRole.STUDENT,
        )

    app.dependency_overrides[authenticate_user] = override_authenticate_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def unauthenticated_client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


class TestAutocompleteAddress:
    @pytest.mark.asyncio
    async def test_autocomplete_success(self, authenticated_client: AsyncClient):
        # Test that the endpoint returns multiple address suggestions successfully
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

        with patch(
            "src.modules.location.location_service.LocationService.autocomplete_address",
            return_value=mock_results,
        ) as mock_autocomplete:
            response = await authenticated_client.post(
                "/api/locations/autocomplete", json={"address": "123 Main St"}
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert (
                data[0]["formatted_address"]
                == "123 Main St, Chapel Hill, NC 27514, USA"
            )
            assert data[0]["place_id"] == "ChIJTest123"
            mock_autocomplete.assert_called_once_with("123 Main St")

    @pytest.mark.asyncio
    async def test_autocomplete_empty_results(self, authenticated_client: AsyncClient):
        # Test that the endpoint returns an empty list when no addresses match
        with patch(
            "src.modules.location.location_service.LocationService.autocomplete_address",
            return_value=[],
        ):
            response = await authenticated_client.post(
                "/api/locations/autocomplete",
                json={"address": "nonexistentaddress12345xyz"},
            )

            assert response.status_code == 200
            assert response.json() == []

    @pytest.mark.asyncio
    async def test_autocomplete_missing_address(
        self, authenticated_client: AsyncClient
    ):
        # Test that the endpoint returns 422 when address field is missing from request body
        response = await authenticated_client.post(
            "/api/locations/autocomplete", json={}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_autocomplete_empty_string(self, authenticated_client: AsyncClient):
        # Test that the endpoint handles empty string gracefully and returns empty list
        with patch(
            "src.modules.location.location_service.LocationService.autocomplete_address",
            return_value=[],
        ):
            response = await authenticated_client.post(
                "/api/locations/autocomplete", json={"address": ""}
            )
            assert response.status_code == 200
            assert response.json() == []

    @pytest.mark.asyncio
    async def test_autocomplete_unauthenticated(
        self, unauthenticated_client: AsyncClient
    ):
        # Test that the endpoint requires authentication and returns 401 without it
        response = await unauthenticated_client.post(
            "/api/locations/autocomplete", json={"address": "123 Main St"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_autocomplete_service_exception(
        self, authenticated_client: AsyncClient
    ):
        # Test that the endpoint returns 500 when the location service throws an exception
        with patch(
            "src.modules.location.location_service.LocationService.autocomplete_address",
            side_effect=Exception("Google Maps API Error"),
        ):
            response = await authenticated_client.post(
                "/api/locations/autocomplete", json={"address": "123 Main St"}
            )
            assert response.status_code == 500
            data = response.json()
            assert "message" in data

    @pytest.mark.asyncio
    async def test_autocomplete_value_error(self, authenticated_client: AsyncClient):
        # Test that the endpoint returns 400 when the service raises a ValueError for invalid input
        with patch(
            "src.modules.location.location_service.LocationService.autocomplete_address",
            side_effect=ValueError("Invalid input"),
        ):
            response = await authenticated_client.post(
                "/api/locations/autocomplete", json={"address": "123 Main St"}
            )
            assert response.status_code == 400
            data = response.json()
            assert "message" in data
