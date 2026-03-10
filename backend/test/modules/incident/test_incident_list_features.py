"""Tests for the paginated incident list endpoint with sorting and filtering."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from src.modules.incident.incident_model import IncidentDto, IncidentSeverity
from test.modules.incident.incident_utils import IncidentTestUtils
from test.utils.http.assertions import assert_res_paginated


class TestIncidentListPagination:
    """Tests for pagination on GET /api/incidents endpoint."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_list_incidents_default_pagination(self):
        """Test listing incidents with default pagination returns all."""
        await self.incident_utils.create_many(i=5)

        response = await self.admin_client.get("/api/incidents")
        paginated = assert_res_paginated(
            response, IncidentDto, total_records=5, page_size=5, total_pages=1
        )
        assert len(paginated.items) == 5
        assert paginated.page_number == 1

    @pytest.mark.asyncio
    async def test_list_incidents_with_page_size(self):
        """Test listing incidents with explicit page size."""
        await self.incident_utils.create_many(i=15)

        response = await self.admin_client.get("/api/incidents?page_number=1&page_size=10")
        paginated = assert_res_paginated(
            response, IncidentDto, total_records=15, page_size=10, total_pages=2, page_number=1
        )
        assert len(paginated.items) == 10

        response = await self.admin_client.get("/api/incidents?page_number=2&page_size=10")
        paginated = assert_res_paginated(
            response, IncidentDto, total_records=15, page_size=10, total_pages=2, page_number=2
        )
        assert len(paginated.items) == 5

    @pytest.mark.asyncio
    async def test_list_incidents_total_records(self):
        """Test that total_records reflects the actual count."""
        await self.incident_utils.create_many(i=7)

        response = await self.admin_client.get("/api/incidents?page_size=3")
        paginated = assert_res_paginated(
            response, IncidentDto, total_records=7, page_size=3, total_pages=3
        )
        assert paginated.total_records == 7


class TestIncidentListSorting:
    """Tests for sorting on GET /api/incidents endpoint."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_sort_by_incident_datetime_asc(self):
        """Test sorting incidents by datetime ascending."""
        base_dt = datetime(2026, 1, 1, tzinfo=UTC)
        incident1 = await self.incident_utils.create_one(incident_datetime=base_dt)
        incident2 = await self.incident_utils.create_one(
            incident_datetime=base_dt + timedelta(days=1)
        )
        incident3 = await self.incident_utils.create_one(
            incident_datetime=base_dt + timedelta(days=2)
        )

        response = await self.admin_client.get(
            "/api/incidents?sort_by=incident_datetime&sort_order=asc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=3)
        assert paginated.items[0].id == incident1.id
        assert paginated.items[1].id == incident2.id
        assert paginated.items[2].id == incident3.id

    @pytest.mark.asyncio
    async def test_sort_by_incident_datetime_desc(self):
        """Test sorting incidents by datetime descending."""
        base_dt = datetime(2026, 1, 1, tzinfo=UTC)
        incident1 = await self.incident_utils.create_one(incident_datetime=base_dt)
        incident2 = await self.incident_utils.create_one(
            incident_datetime=base_dt + timedelta(days=1)
        )
        incident3 = await self.incident_utils.create_one(
            incident_datetime=base_dt + timedelta(days=2)
        )

        response = await self.admin_client.get(
            "/api/incidents?sort_by=incident_datetime&sort_order=desc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=3)
        assert paginated.items[0].id == incident3.id
        assert paginated.items[1].id == incident2.id
        assert paginated.items[2].id == incident1.id

    @pytest.mark.asyncio
    async def test_sort_by_severity(self):
        """Test sorting incidents by severity (alphabetical by value)."""
        await self.incident_utils.create_one(severity=IncidentSeverity.COMPLAINT)
        await self.incident_utils.create_one(severity=IncidentSeverity.WARNING)
        await self.incident_utils.create_one(severity=IncidentSeverity.CITATION)

        response = await self.admin_client.get("/api/incidents?sort_by=severity&sort_order=asc")
        paginated = assert_res_paginated(response, IncidentDto, total_records=3)
        severities = [item.severity for item in paginated.items]
        assert severities == sorted(severities, key=lambda s: s.value)


class TestIncidentListFiltering:
    """Tests for filtering on GET /api/incidents endpoint."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_filter_by_severity(self):
        """Test filtering incidents by exact severity value."""
        incident1 = await self.incident_utils.create_one(severity=IncidentSeverity.COMPLAINT)
        _incident2 = await self.incident_utils.create_one(severity=IncidentSeverity.WARNING)
        incident3 = await self.incident_utils.create_one(severity=IncidentSeverity.COMPLAINT)

        response = await self.admin_client.get(
            f"/api/incidents?severity={IncidentSeverity.COMPLAINT.value}"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned_ids = {item.id for item in paginated.items}
        assert returned_ids == {incident1.id, incident3.id}

    @pytest.mark.asyncio
    async def test_filter_by_location_id(self):
        """Test filtering incidents by exact location.id."""
        incident1 = await self.incident_utils.create_one()
        _incident2 = await self.incident_utils.create_one()
        incident3 = await self.incident_utils.create_one(location_id=incident1.location_id)

        response = await self.admin_client.get(
            f"/api/incidents?location.id={incident1.location_id}"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned_ids = {item.id for item in paginated.items}
        assert returned_ids == {incident1.id, incident3.id}


class TestIncidentListNestedFiltering:
    """Tests for nested location filter/sort on GET /api/incidents endpoint."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_filter_by_location_google_place_id(self):
        """Test filtering incidents by exact location.google_place_id."""
        loc1 = await self.incident_utils.location_utils.create_one()
        loc2 = await self.incident_utils.location_utils.create_one()
        incident1 = await self.incident_utils.create_one(location_id=loc1.id)
        _incident2 = await self.incident_utils.create_one(location_id=loc2.id)
        incident3 = await self.incident_utils.create_one(location_id=loc1.id)

        response = await self.admin_client.get(
            f"/api/incidents?location.google_place_id={loc1.google_place_id}"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned_ids = {item.id for item in paginated.items}
        assert returned_ids == {incident1.id, incident3.id}

    @pytest.mark.asyncio
    async def test_filter_by_location_formatted_address_contains(self):
        """Test filtering incidents by location.formatted_address using contains."""
        loc_main = await self.incident_utils.location_utils.create_one(
            formatted_address="123 Main St, Chapel Hill, NC 27514, US"
        )
        loc_oak = await self.incident_utils.location_utils.create_one(
            formatted_address="456 Oak Ave, Durham, NC 27701, US"
        )
        incident1 = await self.incident_utils.create_one(location_id=loc_main.id)
        _incident2 = await self.incident_utils.create_one(location_id=loc_oak.id)

        response = await self.admin_client.get(
            "/api/incidents?location.formatted_address_contains=Main"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        assert paginated.items[0].id == incident1.id
