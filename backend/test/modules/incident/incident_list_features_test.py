"""Tests for the paginated incident list endpoint with sorting and filtering."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from src.modules.incident.incident_model import IncidentDto, IncidentSeverity
from test.modules.incident.incident_utils import IncidentTestUtils
from test.utils.http.assertions import assert_res_paginated
from test.utils.http.test_templates import generate_filter_sort_tests, generate_search_tests

test_incident_sort, test_incident_filter = generate_filter_sort_tests(
    "/api/incidents",
    IncidentDto,
    sort_fields=[
        "id",
        "incident_datetime",
        "severity",
        "description",
        "location.id",
        "location.google_place_id",
        "location.formatted_address",
        "location.hold_expiration",
    ],
    filter_cases=[
        ("id", 0),
        ("severity", "remote_warning"),
        ("description_contains", "xyz"),
        ("reference_id", "CAD-0000"),
        ("location.id", 0),
        ("location.google_place_id", "nonexistent"),
        ("location.formatted_address_contains", "xyz"),
    ],
)


test_incident_search_no_results, test_incident_search_ok = generate_search_tests(
    "/api/incidents",
    IncidentDto,
)


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
        self.incident_utils.assert_matches(paginated.items[0], incident1.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], incident2.to_dto())
        self.incident_utils.assert_matches(paginated.items[2], incident3.to_dto())

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
        self.incident_utils.assert_matches(paginated.items[0], incident3.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], incident2.to_dto())
        self.incident_utils.assert_matches(paginated.items[2], incident1.to_dto())

    @pytest.mark.asyncio
    async def test_sort_by_severity(self):
        """Test sorting incidents by severity (alphabetical by value)."""
        await self.incident_utils.create_one(severity="remote_warning")
        await self.incident_utils.create_one(severity="in_person_warning")
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
        incident1 = await self.incident_utils.create_one(severity="remote_warning")
        _incident2 = await self.incident_utils.create_one(severity="in_person_warning")
        incident3 = await self.incident_utils.create_one(severity="remote_warning")

        response = await self.admin_client.get("/api/incidents?severity_eq=remote_warning")
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned = {item.id: item for item in paginated.items}
        self.incident_utils.assert_matches(returned[incident1.id], incident1.to_dto())
        self.incident_utils.assert_matches(returned[incident3.id], incident3.to_dto())

    @pytest.mark.asyncio
    async def test_filter_by_reference_id(self):
        """Test filtering incidents by exact reference_id value."""
        incident1 = await self.incident_utils.create_one(reference_id="CAD-100")
        _incident2 = await self.incident_utils.create_one(reference_id="CAD-200")
        incident3 = await self.incident_utils.create_one(reference_id="CAD-100")

        response = await self.admin_client.get("/api/incidents?reference_id_eq=CAD-100")
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned = {item.id: item for item in paginated.items}
        self.incident_utils.assert_matches(returned[incident1.id], incident1.to_dto())
        self.incident_utils.assert_matches(returned[incident3.id], incident3.to_dto())

    @pytest.mark.asyncio
    async def test_filter_by_location_id(self):
        """Test filtering incidents by exact location.id."""
        incident1 = await self.incident_utils.create_one()
        _incident2 = await self.incident_utils.create_one()
        incident3 = await self.incident_utils.create_one(location_id=incident1.location_id)

        response = await self.admin_client.get(
            f"/api/incidents?location.id_eq={incident1.location_id}"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned = {item.id: item for item in paginated.items}
        self.incident_utils.assert_matches(returned[incident1.id], incident1.to_dto())
        self.incident_utils.assert_matches(returned[incident3.id], incident3.to_dto())


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
            f"/api/incidents?location.google_place_id_eq={loc1.google_place_id}"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned = {item.id: item for item in paginated.items}
        self.incident_utils.assert_matches(returned[incident1.id], incident1.to_dto())
        self.incident_utils.assert_matches(returned[incident3.id], incident3.to_dto())

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
        self.incident_utils.assert_matches(paginated.items[0], incident1.to_dto())


class TestIncidentListSearch:
    """Tests for full-table search on GET /api/incidents.

    Core search behaviors (case insensitivity, nested fields, combined with filter)
    are covered by TestQueryUtilsSearch in test_query_utils.py, which uses incidents
    as its vehicle. Only incident-specific field coverage belongs here.
    """

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_search_by_reference_id(self):
        """reference_id is included in the search fields."""
        incident1 = await self.incident_utils.create_one(reference_id="CAD-5555")
        _incident2 = await self.incident_utils.create_one(reference_id="CAD-9999")

        response = await self.admin_client.get("/api/incidents?search=5555")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], incident1.to_dto())
