from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient
from src.modules.location.location_model import MAX_COUNT, LocationDto
from src.modules.location.location_service import (
    CountLimitExceededException,
    LocationNotFoundException,
)
from test.modules.location.location_utils import LocationTestUtils
from test.utils.http.assertions import assert_res_failure, assert_res_success
from test.utils.http.test_templates import generate_auth_required_tests

test_police_authentication = generate_auth_required_tests(
    ({"admin", "police"}, "POST", "/api/police/locations/1/warnings", None),
    ({"admin", "police"}, "POST", "/api/police/locations/1/citations", None),
)


class TestPoliceRouter:
    """Tests for police router endpoints."""

    police_client: AsyncClient
    admin_client: AsyncClient
    location_utils: LocationTestUtils
    mock_place: MagicMock

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        location_utils: LocationTestUtils,
        police_client: AsyncClient,
        admin_client: AsyncClient,
        mock_place: MagicMock,
    ):
        self.location_utils = location_utils
        self.police_client = police_client
        self.admin_client = admin_client
        self.mock_place = mock_place

    @pytest.mark.asyncio
    async def test_increment_warnings_success(self):
        """Test incrementing warnings returns updated location."""
        location = await self.location_utils.create_one(warning_count=0)

        response = await self.police_client.post(f"/api/police/locations/{location.id}/warnings")
        data = assert_res_success(response, LocationDto)

        assert data.id == location.id
        assert data.warning_count == 1
        assert data.citation_count == location.citation_count

    @pytest.mark.asyncio
    async def test_increment_warnings_location_not_found(self):
        """Test incrementing warnings for non-existent location returns 404."""
        response = await self.police_client.post("/api/police/locations/999/warnings")

        assert_res_failure(response, LocationNotFoundException(999))

    @pytest.mark.asyncio
    async def test_increment_warnings_at_max_count(self):
        """Test incrementing warnings when at max count returns 400."""
        location = await self.location_utils.create_one(warning_count=MAX_COUNT)

        response = await self.police_client.post(f"/api/police/locations/{location.id}/warnings")

        assert_res_failure(response, CountLimitExceededException(location.id, "warning_count"))

    @pytest.mark.asyncio
    async def test_increment_warnings_multiple_times(self):
        """Test incrementing warnings multiple times on same location."""
        location = await self.location_utils.create_one(warning_count=0)

        # First increment
        response = await self.police_client.post(f"/api/police/locations/{location.id}/warnings")
        data = assert_res_success(response, LocationDto)
        assert data.warning_count == 1

        # Second increment
        response = await self.police_client.post(f"/api/police/locations/{location.id}/warnings")
        data = assert_res_success(response, LocationDto)
        assert data.warning_count == 2

    @pytest.mark.asyncio
    async def test_increment_citations_success(self):
        """Test incrementing citations returns updated location."""
        location = await self.location_utils.create_one(citation_count=0)

        response = await self.police_client.post(f"/api/police/locations/{location.id}/citations")
        data = assert_res_success(response, LocationDto)

        assert data.id == location.id
        assert data.citation_count == 1
        assert data.warning_count == location.warning_count

    @pytest.mark.asyncio
    async def test_increment_citations_location_not_found(self):
        """Test incrementing citations for non-existent location returns 404."""
        response = await self.police_client.post("/api/police/locations/999/citations")

        assert_res_failure(response, LocationNotFoundException(999))

    @pytest.mark.asyncio
    async def test_increment_citations_at_max_count(self):
        """Test incrementing citations when at max count returns 400."""
        location = await self.location_utils.create_one(citation_count=MAX_COUNT)

        response = await self.police_client.post(f"/api/police/locations/{location.id}/citations")

        assert_res_failure(response, CountLimitExceededException(location.id, "citation_count"))

    @pytest.mark.asyncio
    async def test_increment_citations_multiple_times(self):
        """Test incrementing citations multiple times on same location."""
        location = await self.location_utils.create_one(citation_count=0)

        # First increment
        response = await self.police_client.post(f"/api/police/locations/{location.id}/citations")
        data = assert_res_success(response, LocationDto)
        assert data.citation_count == 1

        # Second increment
        response = await self.police_client.post(f"/api/police/locations/{location.id}/citations")
        data = assert_res_success(response, LocationDto)
        assert data.citation_count == 2
