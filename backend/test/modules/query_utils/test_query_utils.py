"""
Comprehensive tests for core query_utils functionality (sorting, filtering, type validation).

Uses the incident module as the test vehicle since it covers datetime, enum, string, and
nested fields without complex fixture dependencies.
"""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from src.core.exceptions import BadRequestException
from src.modules.incident.incident_model import IncidentDto, IncidentSeverity

from test.modules.incident.incident_utils import IncidentTestUtils
from test.utils.http.assertions import assert_res_failure, assert_res_paginated


class TestQueryUtilsSorting:
    """Test ascending/descending sorting via the incidents endpoint."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_sort_datetime_asc(self):
        """Sorting by incident_datetime ascending returns oldest first."""
        base = datetime(2026, 1, 1, tzinfo=UTC)
        i1 = await self.incident_utils.create_one(incident_datetime=base)
        i2 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=1))
        i3 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=2))

        response = await self.admin_client.get(
            "/api/incidents?sort_by=incident_datetime&sort_order=asc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=3)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], i2.to_dto())
        self.incident_utils.assert_matches(paginated.items[2], i3.to_dto())

    @pytest.mark.asyncio
    async def test_sort_datetime_desc(self):
        """Sorting by incident_datetime descending returns newest first."""
        base = datetime(2026, 1, 1, tzinfo=UTC)
        i1 = await self.incident_utils.create_one(incident_datetime=base)
        i2 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=1))
        i3 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=2))

        response = await self.admin_client.get(
            "/api/incidents?sort_by=incident_datetime&sort_order=desc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=3)
        self.incident_utils.assert_matches(paginated.items[0], i3.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], i2.to_dto())
        self.incident_utils.assert_matches(paginated.items[2], i1.to_dto())

    @pytest.mark.asyncio
    async def test_sort_enum_field(self):
        """Sorting by an enum field (severity) orders alphabetically by value."""
        await self.incident_utils.create_one(severity=IncidentSeverity.IN_PERSON)
        await self.incident_utils.create_one(severity=IncidentSeverity.REMOTE)
        await self.incident_utils.create_one(severity=IncidentSeverity.CITATION)

        response = await self.admin_client.get("/api/incidents?sort_by=severity&sort_order=asc")
        paginated = assert_res_paginated(response, IncidentDto, total_records=3)
        severities = [item.severity for item in paginated.items]
        assert severities == sorted(severities, key=lambda s: s.value)

    @pytest.mark.asyncio
    async def test_sort_nested_string_field(self):
        """Sorting by nested location.formatted_address orders alphabetically."""
        loc_a = await self.incident_utils.location_utils.create_one(
            formatted_address="111 Apple St"
        )
        loc_z = await self.incident_utils.location_utils.create_one(
            formatted_address="999 Zebra St"
        )
        i_z = await self.incident_utils.create_one(location_id=loc_z.id)
        i_a = await self.incident_utils.create_one(location_id=loc_a.id)

        response = await self.admin_client.get(
            "/api/incidents?sort_by=location.formatted_address&sort_order=asc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        self.incident_utils.assert_matches(paginated.items[0], i_a.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], i_z.to_dto())


class TestQueryUtilsFilterOperators:
    """One test per filter operator using the incidents endpoint."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_filter_equals(self):
        """EQUALS operator filters to exact enum match."""
        i1 = await self.incident_utils.create_one(severity=IncidentSeverity.CITATION)
        await self.incident_utils.create_one(severity=IncidentSeverity.IN_PERSON)

        response = await self.admin_client.get("/api/incidents?severity=citation")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_filter_gt(self):
        """GT operator on datetime returns only records after the threshold."""
        base = datetime(2026, 6, 1, tzinfo=UTC)
        await self.incident_utils.create_one(incident_datetime=base)
        i2 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=2))

        threshold = (base + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
        response = await self.admin_client.get(f"/api/incidents?incident_datetime_gt={threshold}")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i2.to_dto())

    @pytest.mark.asyncio
    async def test_filter_gte(self):
        """GTE operator on datetime returns records at or after the threshold."""
        base = datetime(2026, 6, 1, tzinfo=UTC)
        i1 = await self.incident_utils.create_one(incident_datetime=base)
        i2 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=1))
        await self.incident_utils.create_one(incident_datetime=base - timedelta(days=1))

        threshold = base.strftime("%Y-%m-%dT%H:%M:%S")
        response = await self.admin_client.get(f"/api/incidents?incident_datetime_gte={threshold}")
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned = {item.id: item for item in paginated.items}
        self.incident_utils.assert_matches(returned[i1.id], i1.to_dto())
        self.incident_utils.assert_matches(returned[i2.id], i2.to_dto())

    @pytest.mark.asyncio
    async def test_filter_lt(self):
        """LT operator on datetime returns only records before the threshold."""
        base = datetime(2026, 6, 1, tzinfo=UTC)
        i1 = await self.incident_utils.create_one(incident_datetime=base)
        await self.incident_utils.create_one(incident_datetime=base + timedelta(days=2))

        threshold = (base + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
        response = await self.admin_client.get(f"/api/incidents?incident_datetime_lt={threshold}")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_filter_lte(self):
        """LTE operator on datetime returns records at or before the threshold."""
        base = datetime(2026, 6, 1, tzinfo=UTC)
        i1 = await self.incident_utils.create_one(incident_datetime=base)
        await self.incident_utils.create_one(incident_datetime=base + timedelta(days=1))

        threshold = base.strftime("%Y-%m-%dT%H:%M:%S")
        response = await self.admin_client.get(f"/api/incidents?incident_datetime_lte={threshold}")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_filter_contains(self):
        """CONTAINS operator on string field returns case-insensitive partial matches."""
        i1 = await self.incident_utils.create_one(description="loud music playing")
        await self.incident_utils.create_one(description="illegal parking")

        response = await self.admin_client.get("/api/incidents?description_contains=MUSIC")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_filter_nested_contains(self):
        """CONTAINS operator on nested location.formatted_address."""
        loc_main = await self.incident_utils.location_utils.create_one(
            formatted_address="123 Main St"
        )
        loc_other = await self.incident_utils.location_utils.create_one(
            formatted_address="456 Oak Ave"
        )
        i1 = await self.incident_utils.create_one(location_id=loc_main.id)
        await self.incident_utils.create_one(location_id=loc_other.id)

        response = await self.admin_client.get(
            "/api/incidents?location.formatted_address_contains=Main"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())


class TestQueryUtilsTypeValidation:
    """Test that incompatible operator+type combinations return HTTP 400."""

    admin_client: AsyncClient

    @pytest.fixture(autouse=True)
    def _setup(self, admin_client: AsyncClient):
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_string_field_comparison_operator_returns_400(self):
        """Using GT/GTE/LT/LTE on a string field returns 400."""
        response = await self.admin_client.get("/api/incidents?location.formatted_address_gt=Z")
        assert_res_failure(
            response, BadRequestException("Operator 'gt' is not supported for string/enum fields")
        )

    @pytest.mark.asyncio
    async def test_string_field_gte_returns_400(self):
        """Using GTE on a string field returns 400."""
        response = await self.admin_client.get("/api/incidents?location.formatted_address_gte=Z")
        assert_res_failure(
            response, BadRequestException("Operator 'gte' is not supported for string/enum fields")
        )

    @pytest.mark.asyncio
    async def test_enum_field_comparison_operator_returns_400(self):
        """Using GT/GTE/LT/LTE on an enum field returns 400."""
        response = await self.admin_client.get("/api/incidents?severity_gt=citation")
        assert_res_failure(
            response, BadRequestException("Operator 'gt' is not supported for string/enum fields")
        )

    @pytest.mark.asyncio
    async def test_non_string_field_contains_returns_400(self):
        """Using CONTAINS on a non-string field (id) returns 400."""
        response = await self.admin_client.get("/api/incidents?incident_datetime_contains=2026")
        assert_res_failure(
            response, BadRequestException("Operator 'contains' is only supported for string fields")
        )


class TestQueryUtilsNestedFields:
    """Test filter and sort on nested (joined) fields."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_filter_by_nested_google_place_id(self):
        """Filtering by location.google_place_id returns incidents at that location."""
        loc1 = await self.incident_utils.location_utils.create_one()
        loc2 = await self.incident_utils.location_utils.create_one()
        i1 = await self.incident_utils.create_one(location_id=loc1.id)
        await self.incident_utils.create_one(location_id=loc2.id)
        i3 = await self.incident_utils.create_one(location_id=loc1.id)

        response = await self.admin_client.get(
            f"/api/incidents?location.google_place_id={loc1.google_place_id}"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned = {item.id: item for item in paginated.items}
        self.incident_utils.assert_matches(returned[i1.id], i1.to_dto())
        self.incident_utils.assert_matches(returned[i3.id], i3.to_dto())

    @pytest.mark.asyncio
    async def test_sort_by_nested_google_place_id(self):
        """Sorting by location.google_place_id produces consistent ordering."""
        loc_a = await self.incident_utils.location_utils.create_one(google_place_id="AAAA_place")
        loc_z = await self.incident_utils.location_utils.create_one(google_place_id="ZZZZ_place")
        i_z = await self.incident_utils.create_one(location_id=loc_z.id)
        i_a = await self.incident_utils.create_one(location_id=loc_a.id)

        response = await self.admin_client.get(
            "/api/incidents?sort_by=location.google_place_id&sort_order=asc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        self.incident_utils.assert_matches(paginated.items[0], i_a.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], i_z.to_dto())

    @pytest.mark.asyncio
    async def test_filter_and_sort_nested(self):
        """Combining a nested filter and nested sort works correctly."""
        loc1 = await self.incident_utils.location_utils.create_one()
        loc2 = await self.incident_utils.location_utils.create_one()
        base = datetime(2026, 3, 1, tzinfo=UTC)
        i1 = await self.incident_utils.create_one(location_id=loc1.id, incident_datetime=base)
        i2 = await self.incident_utils.create_one(
            location_id=loc1.id, incident_datetime=base + timedelta(days=1)
        )
        await self.incident_utils.create_one(location_id=loc2.id)

        response = await self.admin_client.get(
            f"/api/incidents?location.id={loc1.id}&sort_by=incident_datetime&sort_order=asc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], i2.to_dto())
