"""
Comprehensive tests for core query_utils functionality (sorting, filtering, type validation).

Uses the incident module as the test vehicle since it covers datetime, enum, string, and
nested fields without complex fixture dependencies.
"""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from src.core.exceptions import BadRequestException
from src.core.utils.query_utils import FilterParam, ListQueryParams
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
        await self.incident_utils.create_one(severity="in_person_warning")
        await self.incident_utils.create_one(severity="remote_warning")
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
        i1 = await self.incident_utils.create_one(severity="remote_warning")
        await self.incident_utils.create_one(severity="in_person_warning")

        response = await self.admin_client.get("/api/incidents?severity_eq=remote_warning")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_filter_not_equals(self):
        """NOT_EQUALS operator excludes exact enum matches."""
        await self.incident_utils.create_one(severity="remote_warning")
        i2 = await self.incident_utils.create_one(severity="in_person_warning")
        i3 = await self.incident_utils.create_one(severity=IncidentSeverity.CITATION)

        response = await self.admin_client.get("/api/incidents?severity_ne=remote_warning")
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned_ids = {item.id for item in paginated.items}
        assert returned_ids == {i2.id, i3.id}

    @pytest.mark.parametrize(
        ("operator", "created_offsets", "threshold_offset", "expected_offsets"),
        [
            ("gt", [0, 2], 1, [2]),
            ("gte", [-1, 0, 1], 0, [0, 1]),
            ("lt", [0, 2], 1, [0]),
            ("lte", [0, 1], 0, [0]),
        ],
    )
    @pytest.mark.asyncio
    async def test_datetime_comparison_filters(
        self,
        operator: str,
        created_offsets: list[int],
        threshold_offset: int,
        expected_offsets: list[int],
    ):
        """Datetime comparison operators return the expected records."""
        base = datetime(2026, 6, 1, tzinfo=UTC)
        created = {
            offset: await self.incident_utils.create_one(
                incident_datetime=base + timedelta(days=offset)
            )
            for offset in created_offsets
        }

        threshold = (base + timedelta(days=threshold_offset)).strftime("%Y-%m-%dT%H:%M:%S")
        response = await self.admin_client.get(
            f"/api/incidents?incident_datetime_{operator}={threshold}"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=len(expected_offsets))
        returned = {item.id: item for item in paginated.items}

        assert set(returned) == {created[offset].id for offset in expected_offsets}
        for offset in expected_offsets:
            self.incident_utils.assert_matches(
                returned[created[offset].id], created[offset].to_dto()
            )

    @pytest.mark.asyncio
    async def test_filter_contains(self):
        """CONTAINS operator on string field returns case-insensitive partial matches."""
        i1 = await self.incident_utils.create_one(description="loud music playing")
        await self.incident_utils.create_one(description="illegal parking")

        response = await self.admin_client.get("/api/incidents?description_contains=MUSIC")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.parametrize(
        ("search_value", "matching_description", "non_matching_description"),
        [
            ("100%", "music at 100% volume", "music at 1000 volume"),
            ("room_2", "room_2 loud noise", "roomA2 loud noise"),
        ],
    )
    @pytest.mark.asyncio
    async def test_filter_contains_escapes_sql_wildcards(
        self,
        search_value: str,
        matching_description: str,
        non_matching_description: str,
    ):
        """CONTAINS treats SQL wildcard characters in user input as literals."""
        matching_incident = await self.incident_utils.create_one(description=matching_description)
        await self.incident_utils.create_one(description=non_matching_description)

        response = await self.admin_client.get(
            "/api/incidents", params={"description_contains": search_value}
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], matching_incident.to_dto())

    async def test_filter_in(self):
        """IN operator returns records whose field value is in the provided list."""
        i1 = await self.incident_utils.create_one(severity="remote_warning")
        i2 = await self.incident_utils.create_one(severity="in_person_warning")
        await self.incident_utils.create_one(severity=IncidentSeverity.CITATION)

        response = await self.admin_client.get(
            "/api/incidents?severity_in=remote_warning,in_person_warning"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        returned_ids = {item.id for item in paginated.items}
        assert returned_ids == {i1.id, i2.id}

    @pytest.mark.asyncio
    async def test_filter_not_in(self):
        """NOT_IN operator excludes records whose field value is in the provided list."""
        await self.incident_utils.create_one(severity="remote_warning")
        await self.incident_utils.create_one(severity="in_person_warning")
        i3 = await self.incident_utils.create_one(severity=IncidentSeverity.CITATION)

        response = await self.admin_client.get(
            "/api/incidents?severity_nin=remote_warning,in_person_warning"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i3.to_dto())

    @pytest.mark.parametrize(
        ("operator", "matching_reference_id", "non_matching_reference_id"),
        [
            ("null", None, "REF-123"),
            ("notnull", "REF-123", None),
        ],
    )
    @pytest.mark.asyncio
    async def test_filter_null_operators(
        self,
        operator: str,
        matching_reference_id: str | None,
        non_matching_reference_id: str | None,
    ):
        """NULL operators include only the expected nullable records."""
        matching_incident = await self.incident_utils.create_one(reference_id=matching_reference_id)
        await self.incident_utils.create_one(reference_id=non_matching_reference_id)

        response = await self.admin_client.get(f"/api/incidents?reference_id_{operator}=ignored")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], matching_incident.to_dto())

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

    @pytest.mark.asyncio
    async def test_filter_nested_contains_escapes_wildcards(self):
        """Nested CONTAINS treats SQL wildcard characters as literals."""
        loc_literal = await self.incident_utils.location_utils.create_one(
            formatted_address="123 Main_St"
        )
        loc_wildcard_match = await self.incident_utils.location_utils.create_one(
            formatted_address="123 MainXSt"
        )
        i1 = await self.incident_utils.create_one(location_id=loc_literal.id)
        await self.incident_utils.create_one(location_id=loc_wildcard_match.id)

        response = await self.admin_client.get(
            "/api/incidents",
            params={"location.formatted_address_contains": "Main_St"},
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())


class TestQueryUtilsTypeValidation:
    """Test that incompatible operator+type combinations return HTTP 400."""

    admin_client: AsyncClient

    @pytest.fixture(autouse=True)
    def _setup(self, admin_client: AsyncClient):
        self.admin_client = admin_client

    @pytest.mark.parametrize(
        ("query", "message"),
        [
            (
                "/api/incidents?location.formatted_address_gt=Z",
                "Comparison operators are not supported for string/enum fields",
            ),
            (
                "/api/incidents?location.formatted_address_gte=Z",
                "Comparison operators are not supported for string/enum fields",
            ),
            (
                "/api/incidents?severity_gt=remote_warning",
                "Comparison operators are not supported for string/enum fields",
            ),
            (
                "/api/incidents?incident_datetime_contains=2026",
                "Operator 'contains' is only supported for string fields",
            ),
        ],
    )
    @pytest.mark.asyncio
    async def test_invalid_operator_type_combinations_return_400(self, query: str, message: str):
        """Incompatible operator and field type combinations return HTTP 400."""
        response = await self.admin_client.get(query)
        assert_res_failure(response, BadRequestException(message))

    @pytest.mark.parametrize(
        ("query", "message"),
        [
            (
                "/api/incidents?sort_by=not_a_real_field",
                "Sorting on field 'not_a_real_field' is not allowed",
            ),
            (
                "/api/incidents?not_a_real_field_eq=123",
                "Filtering on field 'not_a_real_field' is not allowed",
            ),
        ],
    )
    @pytest.mark.asyncio
    async def test_invalid_sort_and_filter_fields_return_400(self, query: str, message: str):
        """Unknown sort and filter fields are rejected."""
        response = await self.admin_client.get(query)
        assert_res_failure(response, BadRequestException(message))


class TestQueryUtilsSearch:
    """Test full-table search via the ?search= param using the incidents endpoint."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_search_matches_string_field(self):
        """Search term matching a string column (description) returns that incident."""
        i1 = await self.incident_utils.create_one(description="loud music playing")
        await self.incident_utils.create_one(description="illegal parking")

        response = await self.admin_client.get("/api/incidents?search=loud")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_search_is_case_insensitive(self):
        """Search is case-insensitive."""
        i1 = await self.incident_utils.create_one(description="Loud Music")
        await self.incident_utils.create_one(description="illegal parking")

        response = await self.admin_client.get("/api/incidents?search=LOUD")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_search_matches_nested_field(self):
        """Search term matching a nested column (location.formatted_address)
        returns that incident."""
        loc_elm = await self.incident_utils.location_utils.create_one(
            formatted_address="123 Elm St"
        )
        loc_oak = await self.incident_utils.location_utils.create_one(
            formatted_address="456 Oak Ave"
        )
        i1 = await self.incident_utils.create_one(location_id=loc_elm.id)
        await self.incident_utils.create_one(location_id=loc_oak.id)

        response = await self.admin_client.get("/api/incidents?search=Elm")
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_search_combined_with_filter(self):
        """Search and filter are AND-ed together."""
        i1 = await self.incident_utils.create_one(
            description="loud music", severity="remote_warning"
        )
        await self.incident_utils.create_one(description="loud music", severity="in_person_warning")
        await self.incident_utils.create_one(
            description="illegal parking", severity="remote_warning"
        )

        response = await self.admin_client.get(
            "/api/incidents?search=loud&severity_eq=remote_warning"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=1)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())

    @pytest.mark.asyncio
    async def test_search_no_results(self):
        """Search with no matching records returns empty list."""
        await self.incident_utils.create_one(description="loud music")

        response = await self.admin_client.get("/api/incidents?search=zzznomatch")
        assert_res_paginated(response, IncidentDto, total_records=0)


class TestQueryUtilsParsing:
    """Test direct parsing behavior for lower-level query param helpers."""

    def test_unknown_filter_operator_is_ignored(self):
        """Unknown filter operators are skipped during parsing."""
        assert FilterParam.from_param("severity_invalid", "remote_warning") is None

        params = ListQueryParams.from_dict({"severity_invalid": "remote_warning"})
        assert params.filters == []


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
            f"/api/incidents?location.google_place_id_eq={loc1.google_place_id}"
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
            f"/api/incidents?location.id_eq={loc1.id}&sort_by=incident_datetime&sort_order=asc"
        )
        paginated = assert_res_paginated(response, IncidentDto, total_records=2)
        self.incident_utils.assert_matches(paginated.items[0], i1.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], i2.to_dto())


class TestQueryUtilsDefaultSorting:
    """Test default sorting when no explicit sort params are provided."""

    admin_client: AsyncClient
    incident_utils: IncidentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, incident_utils: IncidentTestUtils, admin_client: AsyncClient):
        self.incident_utils = incident_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_default_sort_falls_back_to_incident_datetime_desc(self):
        """Missing sort params uses the incident default sort."""
        base = datetime(2026, 4, 1, tzinfo=UTC)
        i1 = await self.incident_utils.create_one(incident_datetime=base)
        i2 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=1))
        i3 = await self.incident_utils.create_one(incident_datetime=base + timedelta(days=2))

        response = await self.admin_client.get("/api/incidents")
        paginated = assert_res_paginated(response, IncidentDto, total_records=3)

        assert paginated.sort_by == "incident_datetime"
        assert paginated.sort_order == "desc"
        self.incident_utils.assert_matches(paginated.items[0], i3.to_dto())
        self.incident_utils.assert_matches(paginated.items[1], i2.to_dto())
        self.incident_utils.assert_matches(paginated.items[2], i1.to_dto())
