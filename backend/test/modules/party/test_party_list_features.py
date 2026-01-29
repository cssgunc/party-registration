"""
Tests for party list endpoint with pagination, sorting, and filtering.

Add these tests to your existing party_router_test.py file or create a new test file.
"""

from datetime import timedelta

import pytest
from httpx import AsyncClient
from src.modules.party.party_model import PartyDto
from test.modules.party.party_utils import PartyTestUtils, get_valid_party_datetime
from test.utils.http.assertions import assert_res_paginated


class TestPartyListPagination:
    """Tests for pagination on GET /api/parties/ endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_debug_party_creation(self):
        """Debug test to see what's happening with party creation."""
        print("\n=== Starting test ===")

        for i in range(5):
            print(f"\n--- Creating party {i + 1} ---")
            party = await self.party_utils.create_one()
            print(f"Created party with ID: {party.id}")
            print(f"Location ID: {party.location_id}, Contact ID: {party.contact_one_id}")

        print("\n=== Checking database ===")
        response = await self.admin_client.get("/api/parties/")
        data = response.json()
        print(f"Total records from API: {data['total_records']}")
        print(f"Number of items: {len(data['items'])}")
        print(f"Item IDs: {[item['id'] for item in data['items']]}")

    @pytest.mark.asyncio
    async def test_list_parties_default_pagination(self):
        """Test listing parties with default pagination (no page_size returns all)."""
        for _ in range(5):
            await self.party_utils.create_one()

        response = await self.admin_client.get("/api/parties/")
        paginated = assert_res_paginated(
            response, PartyDto, total_records=5, page_size=5, total_pages=1
        )
        assert len(paginated.items) == 5
        assert paginated.page_number == 1

    @pytest.mark.asyncio
    async def test_list_parties_with_page_size(self):
        """Test listing parties with explicit page size."""
        for _ in range(15):
            await self.party_utils.create_one()

        # First page
        response = await self.admin_client.get("/api/parties/?page_number=1&page_size=10")
        paginated = assert_res_paginated(
            response, PartyDto, total_records=15, page_size=10, total_pages=2, page_number=1
        )
        assert len(paginated.items) == 10
        assert paginated.page_number == 1

        # Second page
        response = await self.admin_client.get("/api/parties/?page_number=2&page_size=10")
        paginated = assert_res_paginated(
            response, PartyDto, total_records=15, page_size=10, total_pages=2, page_number=2
        )
        assert len(paginated.items) == 5  # Remaining items
        assert paginated.page_number == 2

    @pytest.mark.asyncio
    async def test_list_parties_beyond_last_page(self):
        """Test requesting a page beyond the last page returns empty results."""
        for _ in range(5):
            await self.party_utils.create_one()

        response = await self.admin_client.get("/api/parties/?page_number=10&page_size=10")
        paginated = assert_res_paginated(
            response, PartyDto, total_records=5, page_size=10, total_pages=1, page_number=10
        )
        assert len(paginated.items) == 0
        assert paginated.page_number == 10

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "total_items,page_size,page_number,expected_items",
        [
            (0, 10, 1, 0),  # Empty database
            (5, 10, 1, 5),  # All items fit on one page
            (10, 10, 1, 10),  # Exactly one page
            (11, 10, 1, 10),  # First page of two
            (11, 10, 2, 1),  # Second page with remainder
            (25, 5, 3, 5),  # Middle page
            (25, 5, 5, 5),  # Last full page
            (100, 20, 3, 20),  # Larger dataset
        ],
    )
    async def test_list_parties_pagination_scenarios(
        self, total_items: int, page_size: int, page_number: int, expected_items: int
    ):
        """Parameterized test for various pagination scenarios."""
        for _ in range(total_items):
            await self.party_utils.create_one()

        response = await self.admin_client.get(
            f"/api/parties/?page_number={page_number}&page_size={page_size}"
        )

        expected_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
        paginated = assert_res_paginated(
            response,
            PartyDto,
            total_records=total_items,
            page_size=page_size,
            total_pages=expected_pages,
            page_number=page_number,
        )
        assert len(paginated.items) == expected_items
        assert paginated.page_number == page_number


class TestPartyListSorting:
    """Tests for sorting on GET /api/parties/ endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_list_parties_sort_by_datetime_asc(self):
        """Test sorting parties by datetime in ascending order."""
        base_datetime = get_valid_party_datetime()

        # Create parties with different datetimes
        party1 = await self.party_utils.create_one(party_datetime=base_datetime)
        party2 = await self.party_utils.create_one(party_datetime=base_datetime + timedelta(days=1))
        party3 = await self.party_utils.create_one(party_datetime=base_datetime + timedelta(days=2))

        response = await self.admin_client.get(
            "/api/parties/?sort_by=party_datetime&sort_order=asc"
        )
        paginated = assert_res_paginated(response, PartyDto, total_records=3)

        # Check order
        assert paginated.items[0].id == party1.id
        assert paginated.items[1].id == party2.id
        assert paginated.items[2].id == party3.id

    @pytest.mark.asyncio
    async def test_list_parties_sort_by_datetime_desc(self):
        """Test sorting parties by datetime in descending order."""
        base_datetime = get_valid_party_datetime()

        # Create parties with different datetimes
        party1 = await self.party_utils.create_one(party_datetime=base_datetime)
        party2 = await self.party_utils.create_one(party_datetime=base_datetime + timedelta(days=1))
        party3 = await self.party_utils.create_one(party_datetime=base_datetime + timedelta(days=2))

        response = await self.admin_client.get(
            "/api/parties/?sort_by=party_datetime&sort_order=desc"
        )
        paginated = assert_res_paginated(response, PartyDto, total_records=3)

        # Check order (reversed)
        assert paginated.items[0].id == party3.id
        assert paginated.items[1].id == party2.id
        assert paginated.items[2].id == party1.id

    @pytest.mark.asyncio
    async def test_list_parties_sort_by_id(self):
        """Test sorting parties by ID."""
        for _ in range(5):
            await self.party_utils.create_one()

        response = await self.admin_client.get("/api/parties/?sort_by=id&sort_order=asc")
        paginated = assert_res_paginated(response, PartyDto, total_records=5)

        # Check IDs are in ascending order
        ids = [party.id for party in paginated.items]
        assert ids == sorted(ids)

    @pytest.mark.asyncio
    async def test_list_parties_sort_with_pagination(self):
        """Test that sorting works correctly with pagination."""
        base_datetime = get_valid_party_datetime()

        # Create 10 parties with sequential datetimes
        for i in range(10):
            await self.party_utils.create_one(party_datetime=base_datetime + timedelta(days=i))

        # Get first page sorted by datetime desc
        response = await self.admin_client.get(
            "/api/parties/?page_number=1&page_size=5&sort_by=party_datetime&sort_order=desc"
        )
        page1 = assert_res_paginated(
            response, PartyDto, total_records=10, page_size=5, total_pages=2, page_number=1
        )

        # Get second page
        response = await self.admin_client.get(
            "/api/parties/?page_number=2&page_size=5&sort_by=party_datetime&sort_order=desc"
        )
        page2 = assert_res_paginated(
            response, PartyDto, total_records=10, page_size=5, total_pages=2, page_number=2
        )

        # Verify all items across both pages are in desc order
        all_datetimes = [p.party_datetime for p in page1.items] + [
            p.party_datetime for p in page2.items
        ]
        assert all_datetimes == sorted(all_datetimes, reverse=True)


class TestPartyListFiltering:
    """Tests for filtering on GET /api/parties/ endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_list_parties_filter_by_location(self):
        """Test filtering parties by location ID."""
        # Create parties at different locations
        party1 = await self.party_utils.create_one()
        _party2 = await self.party_utils.create_one()
        party3 = await self.party_utils.create_one(location_id=party1.location_id)

        # Filter by location_id
        response = await self.admin_client.get(f"/api/parties/?location_id={party1.location_id}")
        paginated = assert_res_paginated(response, PartyDto, total_records=2)

        # Should return party1 and party3
        returned_ids = {p.id for p in paginated.items}
        assert returned_ids == {party1.id, party3.id}

    @pytest.mark.asyncio
    async def test_list_parties_filter_by_contact(self):
        """Test filtering parties by contact one ID."""
        # Create parties with different contacts
        party1 = await self.party_utils.create_one()
        _party2 = await self.party_utils.create_one()
        party3 = await self.party_utils.create_one(contact_one_id=party1.contact_one_id)

        # Filter by contact_one_id
        response = await self.admin_client.get(
            f"/api/parties/?contact_one_id={party1.contact_one_id}"
        )
        paginated = assert_res_paginated(response, PartyDto, total_records=2)

        # Should return party1 and party3
        returned_ids = {p.id for p in paginated.items}
        assert returned_ids == {party1.id, party3.id}

    @pytest.mark.asyncio
    async def test_list_parties_multiple_filters(self):
        """Test filtering parties with multiple filters simultaneously."""
        # Create parties with known attributes
        party1 = await self.party_utils.create_one()
        await self.party_utils.create_one()  # Different location and contact
        party3 = await self.party_utils.create_one(
            location_id=party1.location_id, contact_one_id=party1.contact_one_id
        )

        # Filter by both location and contact
        response = await self.admin_client.get(
            f"/api/parties/?location_id={party1.location_id}&contact_one_id={party1.contact_one_id}"
        )
        paginated = assert_res_paginated(response, PartyDto, total_records=2)

        # Should return party1 and party3
        returned_ids = {p.id for p in paginated.items}
        assert returned_ids == {party1.id, party3.id}

    @pytest.mark.asyncio
    async def test_list_parties_filter_no_matches(self):
        """Test filtering with criteria that match no parties."""
        for _ in range(3):
            await self.party_utils.create_one()

        # Filter by non-existent location
        response = await self.admin_client.get("/api/parties/?location_id=99999")
        paginated = assert_res_paginated(response, PartyDto, total_records=0)
        assert len(paginated.items) == 0


class TestPartyListCombined:
    """Tests for combined pagination, sorting, and filtering."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_filter_sort_paginate_together(self):
        """Test using filtering, sorting, and pagination together."""
        base_datetime = get_valid_party_datetime()

        # Create multiple parties at the same location with different dates
        location = await self.party_utils.create_one()
        location_id = location.location_id

        for i in range(10):
            await self.party_utils.create_one(
                location_id=location_id, party_datetime=base_datetime + timedelta(days=i)
            )

        # Create some parties at different location (should be filtered out)
        for _ in range(5):
            await self.party_utils.create_one()

        # Filter by location, sort by datetime desc, paginate
        response = await self.admin_client.get(
            f"/api/parties/?location_id={location_id}&sort_by=party_datetime"
            "&sort_order=desc&page_number=1&page_size=5"
        )
        paginated = assert_res_paginated(
            response, PartyDto, total_records=11, page_size=5, total_pages=3
        )

        # Verify we got the right number of items
        assert len(paginated.items) == 5

        # Verify all items are from the filtered location
        assert all(p.location.id == location_id for p in paginated.items)

        # Verify sorting (should be descending by datetime)
        datetimes = [p.party_datetime for p in paginated.items]
        assert datetimes == sorted(datetimes, reverse=True)

    @pytest.mark.asyncio
    async def test_pagination_preserves_filter_count(self):
        """Test that total_records reflects filtered count, not total count."""
        # Create 20 parties at location 1
        location1 = await self.party_utils.create_one()
        for _ in range(19):
            await self.party_utils.create_one(location_id=location1.location_id)

        # Create 10 parties at location 2
        location2 = await self.party_utils.create_one()
        for _ in range(9):
            await self.party_utils.create_one(location_id=location2.location_id)

        # Filter for location 1 with pagination
        response = await self.admin_client.get(
            f"/api/parties/?location_id={location1.location_id}&page_size=10"
        )
        paginated = assert_res_paginated(
            response, PartyDto, total_records=20, page_size=10, total_pages=2
        )

        # Should show 20 total (filtered count), not 30 (total count)
        assert paginated.total_records == 20
        assert len(paginated.items) == 10
