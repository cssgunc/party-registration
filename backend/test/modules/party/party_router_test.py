from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient
from src.modules.account.account_entity import AccountRole
from src.modules.location.location_service import LocationHoldActiveException
from src.modules.party.party_model import PartyDto
from src.modules.party.party_service import PartyNotFoundException
from src.modules.student.student_entity import StudentEntity
from test.modules.account.account_utils import AccountTestUtils
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils
from test.modules.party.party_utils import PartyTestUtils
from test.modules.student.student_utils import StudentTestUtils
from test.utils.geo import get_lat_offset_outside_radius, get_lat_offset_within_radius
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_paginated,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import generate_auth_required_tests

test_party_authentication = generate_auth_required_tests(
    ({"admin", "staff", "police"}, "GET", "/api/parties", None),
    ({"admin", "staff"}, "GET", "/api/parties/1", None),
    ({"admin"}, "DELETE", "/api/parties/1", None),
    (
        {"admin", "police"},
        "GET",
        "/api/parties/nearby?place_id=ChIJTest&start_date=2025-01-01&end_date=2025-12-31",
        None,
    ),
    # POST endpoint requires condiitional body - tested separately in
    # TestPartyCreateAdminRouter and TestPartyCreateStudentRouter
    # ({"student"}, "POST", "/api/parties", {}),
)


class TestPartyListRouter:
    """Tests for GET /api/parties endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_list_parties_empty(self):
        """Test listing parties when database is empty."""
        response = await self.admin_client.get("/api/parties")
        paginated = assert_res_paginated(
            response, PartyDto, total_records=0, page_size=0, total_pages=0
        )
        assert paginated.items == []

    @pytest.mark.asyncio
    async def test_list_parties_with_data(self):
        """Test listing parties when parties exist."""
        created_parties = await self.party_utils.create_many(i=3)

        response = await self.admin_client.get("/api/parties")
        paginated = assert_res_paginated(
            response, PartyDto, total_records=3, page_size=3, total_pages=1
        )

        assert len(paginated.items) == 3
        data_by_id = {party.id: party for party in paginated.items}
        for entity in created_parties:
            assert entity.id in data_by_id
            self.party_utils.assert_matches(entity, data_by_id[entity.id])


class TestPartyListPaginationSortFilter:
    """Tests for pagination, sorting, and filtering on GET /api/parties endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils
    location_utils: LocationTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_utils: PartyTestUtils,
        location_utils: LocationTestUtils,
        admin_client: AsyncClient,
    ):
        self.party_utils = party_utils
        self.location_utils = location_utils
        self.admin_client = admin_client

    @pytest.mark.parametrize(
        "total_parties, page_number, page_size, expected_items",
        [
            (15, None, None, 15),  # Default pagination (no params)
            (25, 1, 5, 5),  # Custom page size - first page
            (15, 2, 10, 5),  # Second page with items
            (5, 10, 10, 0),  # Page beyond total (empty results)
        ],
    )
    @pytest.mark.asyncio
    async def test_list_parties_pagination(
        self,
        total_parties: int,
        page_number: int | None,
        page_size: int | None,
        expected_items: int,
    ):
        """Test various pagination scenarios."""
        await self.party_utils.create_many(i=total_parties)

        params = {}
        if page_number is not None:
            params["page_number"] = page_number
        if page_size is not None:
            params["page_size"] = page_size

        response = await self.admin_client.get("/api/parties", params=params or None)

        expected_page_number = page_number if page_number is not None else 1
        expected_page_size = page_size if page_size is not None else total_parties

        paginated = assert_res_paginated(
            response,
            PartyDto,
            total_records=total_parties,
            page_number=expected_page_number,
            page_size=expected_page_size,
        )
        assert len(paginated.items) == expected_items

    @pytest.mark.asyncio
    async def test_list_parties_sort_by_party_datetime_asc(self):
        """Test sorting parties by datetime ascending."""
        now = datetime.now(UTC)
        await self.party_utils.create_one(party_datetime=now + timedelta(days=30))
        await self.party_utils.create_one(party_datetime=now + timedelta(days=10))
        await self.party_utils.create_one(party_datetime=now + timedelta(days=20))

        response = await self.admin_client.get(
            "/api/parties", params={"sort_by": "party_datetime", "sort_order": "asc"}
        )

        paginated = assert_res_paginated(response, PartyDto, total_records=3)
        datetimes = [p.party_datetime for p in paginated.items]
        assert datetimes == sorted(datetimes)

    @pytest.mark.asyncio
    async def test_list_parties_sort_by_party_datetime_desc(self):
        """Test sorting parties by datetime descending."""
        now = datetime.now(UTC)
        await self.party_utils.create_one(party_datetime=now + timedelta(days=30))
        await self.party_utils.create_one(party_datetime=now + timedelta(days=10))
        await self.party_utils.create_one(party_datetime=now + timedelta(days=20))

        response = await self.admin_client.get(
            "/api/parties", params={"sort_by": "party_datetime", "sort_order": "desc"}
        )

        paginated = assert_res_paginated(response, PartyDto, total_records=3)
        datetimes = [p.party_datetime for p in paginated.items]
        assert datetimes == sorted(datetimes, reverse=True)

    @pytest.mark.asyncio
    async def test_list_parties_filter_by_location_id(self):
        """Test filtering parties by location_id."""
        location1 = await self.location_utils.create_one()
        location2 = await self.location_utils.create_one()

        await self.party_utils.create_one(location_id=location1.id)
        await self.party_utils.create_one(location_id=location2.id)
        await self.party_utils.create_one(location_id=location1.id)

        response = await self.admin_client.get("/api/parties", params={"location_id": location1.id})

        paginated = assert_res_paginated(response, PartyDto, total_records=2)
        assert all(p.location.id == location1.id for p in paginated.items)

    @pytest.mark.asyncio
    async def test_list_parties_filter_by_party_datetime_gte(self):
        """Test filtering parties by party_datetime >= date."""
        now = datetime.now(UTC)
        await self.party_utils.create_one(party_datetime=now + timedelta(days=5))
        await self.party_utils.create_one(party_datetime=now + timedelta(days=15))
        await self.party_utils.create_one(party_datetime=now + timedelta(days=25))

        filter_date = (now + timedelta(days=10)).strftime("%Y-%m-%dT%H:%M:%S+00:00")
        response = await self.admin_client.get(
            "/api/parties", params={"party_datetime_gte": filter_date}
        )

        assert_res_paginated(response, PartyDto, total_records=2)


class TestPartyGetRouter:
    """Tests for GET /api/parties/{id} endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_get_party_success(self):
        """Test getting a party by ID."""
        party = await self.party_utils.create_one()

        response = await self.admin_client.get(f"/api/parties/{party.id}")
        data = assert_res_success(response, PartyDto)

        self.party_utils.assert_matches(party, data)

    @pytest.mark.asyncio
    async def test_get_party_not_found(self):
        """Test getting a non-existent party."""
        response = await self.admin_client.get("/api/parties/999")
        assert_res_failure(response, PartyNotFoundException(999))


class TestPartyDeleteRouter:
    """Tests for DELETE /api/parties/{id} endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_delete_party_success(self):
        """Test successfully deleting a party."""
        party = await self.party_utils.create_one()

        response = await self.admin_client.delete(f"/api/parties/{party.id}")
        data = assert_res_success(response, PartyDto)

        self.party_utils.assert_matches(party, data)

        # Verify deletion
        all_parties = await self.party_utils.get_all()
        assert party.id not in [p.id for p in all_parties]

    @pytest.mark.asyncio
    async def test_delete_party_not_found(self):
        """Test deleting a non-existent party."""
        response = await self.admin_client.delete("/api/parties/999")
        assert_res_failure(response, PartyNotFoundException(999))


class TestPartyCreateAdminRouter:
    """Tests for POST /api/parties endpoint (admin creation)."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils
    location_utils: LocationTestUtils
    student_utils: StudentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_utils: PartyTestUtils,
        location_utils: LocationTestUtils,
        student_utils: StudentTestUtils,
        admin_client: AsyncClient,
    ):
        self.party_utils = party_utils
        self.location_utils = location_utils
        self.student_utils = student_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_create_party_as_admin_success(self):
        """Test admin creating a party."""
        location = await self.location_utils.create_one()
        payload = await self.party_utils.next_admin_create_dto(
            google_place_id=location.google_place_id
        )

        response = await self.admin_client.post(
            "/api/parties", json=payload.model_dump(mode="json")
        )
        data = assert_res_success(response, PartyDto, status=201)

        assert data.contact_one.email == payload.contact_one_email
        assert data.contact_two.email == payload.contact_two.email
        assert data.location.google_place_id == payload.google_place_id

    @pytest.mark.asyncio
    async def test_create_party_as_admin_location_on_hold(self):
        """Test admin cannot create party at location on hold."""
        hold_expiration = datetime.now(UTC) + timedelta(days=30)
        location_with_hold = await self.location_utils.create_one(hold_expiration=hold_expiration)

        payload = await self.party_utils.next_admin_create_dto(
            google_place_id=location_with_hold.google_place_id,
        )

        response = await self.admin_client.post(
            "/api/parties", json=payload.model_dump(mode="json")
        )
        assert_res_failure(
            response,
            LocationHoldActiveException(
                location_id=location_with_hold.id, hold_expiration=hold_expiration
            ),
        )

    @pytest.mark.asyncio
    async def test_create_party_as_admin_validation_errors(self):
        """Test validation errors for admin party creation."""
        payload = await self.party_utils.next_admin_create_dto()
        payload_dict = payload.model_dump(mode="json")
        del payload_dict["contact_two"]

        response = await self.admin_client.post("/api/parties", json=payload_dict)
        assert_res_validation_error(response)


class TestPartyCreateStudentRouter:
    """Tests for POST /api/parties endpoint (student creation)."""

    student_client: AsyncClient
    party_utils: PartyTestUtils
    location_utils: LocationTestUtils
    student_utils: StudentTestUtils

    @pytest_asyncio.fixture
    async def current_student(self) -> StudentEntity:
        """Create student for authenticated student client (id=3)."""
        # student_client uses id=3 from mock_authenticate
        # Create dummy accounts for IDs 1 and 2
        account_utils = AccountTestUtils(self.student_utils.session)
        await account_utils.create_one(role=AccountRole.ADMIN.value)
        await account_utils.create_one(role=AccountRole.STAFF.value)

        account = await account_utils.create_one(role=AccountRole.STUDENT.value)
        assert account.id == 3

        # Set last_registered to indicate Party Smart completion
        student = await self.student_utils.create_one(
            account_id=account.id, last_registered=datetime.now(UTC) - timedelta(days=1)
        )
        return student

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_utils: PartyTestUtils,
        location_utils: LocationTestUtils,
        student_utils: StudentTestUtils,
        student_client: AsyncClient,
    ):
        self.party_utils = party_utils
        self.location_utils = location_utils
        self.student_utils = student_utils
        self.student_client = student_client

    @pytest.mark.asyncio
    async def test_create_party_as_student_success(self, current_student: StudentEntity):
        """Test student creating a party."""
        location = await self.location_utils.create_one()
        payload = await self.party_utils.next_student_create_dto(
            google_place_id=location.google_place_id
        )

        response = await self.student_client.post(
            "/api/parties", json=payload.model_dump(mode="json")
        )
        data = assert_res_success(response, PartyDto, status=201)

        assert data.contact_one.id == current_student.account_id
        assert data.contact_two.email == payload.contact_two.email
        assert data.location.google_place_id == payload.google_place_id


class TestPartyNearbyRouter:
    """Tests for GET /api/parties/nearby endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils
    location_utils: LocationTestUtils
    gmaps_utils: GmapsMockUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_utils: PartyTestUtils,
        location_utils: LocationTestUtils,
        admin_client: AsyncClient,
        gmaps_utils: GmapsMockUtils,
    ):
        self.party_utils = party_utils
        self.location_utils = location_utils
        self.admin_client = admin_client
        self.gmaps_utils = gmaps_utils

    @pytest.mark.asyncio
    async def test_get_parties_nearby_empty(self):
        """Test nearby search with no parties."""
        location_data = await self.location_utils.next_data()
        self.gmaps_utils.mock_place_details(**location_data.model_dump())

        now = datetime.now(UTC)
        params = {
            "place_id": location_data.google_place_id,
            "start_date": now.strftime("%Y-%m-%d"),
            "end_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
        }
        response = await self.admin_client.get("/api/parties/nearby", params=params)
        data = assert_res_success(response, list[PartyDto])
        assert data == []

    @pytest.mark.asyncio
    async def test_get_parties_nearby_within_radius(self):
        """Test nearby search returns parties within radius."""
        search_lat = 40.7128
        search_lon = -74.0060

        # Create search center location data and mock
        search_location_data = await self.location_utils.next_data(
            latitude=search_lat,
            longitude=search_lon,
        )
        self.gmaps_utils.mock_place_details(**search_location_data.model_dump())

        # Create location within radius
        location_within = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        # Create location outside radius
        location_outside = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_outside_radius(),
            longitude=search_lon,
        )

        # Create parties within time window
        now = datetime.now(UTC)
        party_within = await self.party_utils.create_one(
            location_id=location_within.id,
            party_datetime=now + timedelta(hours=2),
        )

        party_outside = await self.party_utils.create_one(
            location_id=location_outside.id,
            party_datetime=now + timedelta(hours=2),
        )

        params = {
            "place_id": search_location_data.google_place_id,
            "start_date": now.strftime("%Y-%m-%d"),
            "end_date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
        }
        response = await self.admin_client.get("/api/parties/nearby", params=params)
        data = assert_res_success(response, list[PartyDto])

        party_ids = [p.id for p in data]
        assert party_within.id in party_ids
        assert party_outside.id not in party_ids

    @pytest.mark.asyncio
    async def test_get_parties_nearby_with_date_range(self):
        """Test nearby search with date range filtering."""
        search_lat = 40.7128
        search_lon = -74.0060

        # Create search center location data and mock
        search_location_data = await self.location_utils.next_data(
            latitude=search_lat,
            longitude=search_lon,
        )
        self.gmaps_utils.mock_place_details(**search_location_data.model_dump())

        location = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        base_time = datetime.now(UTC) + timedelta(hours=2)

        # Party within date range
        party_valid = await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=base_time,
        )

        # Party outside date range (next day)
        _party_invalid = await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=base_time + timedelta(days=2),
        )

        params = {
            "place_id": search_location_data.google_place_id,
            "start_date": base_time.strftime("%Y-%m-%d"),
            "end_date": (base_time + timedelta(hours=12)).strftime("%Y-%m-%d"),
        }

        response = await self.admin_client.get("/api/parties/nearby", params=params)
        data = assert_res_success(response, list[PartyDto])

        assert len(data) == 1
        assert data[0].id == party_valid.id

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "params",
        [
            {"start_date": "2024-01-01", "end_date": "2024-01-02"},  # missing place_id
            {"place_id": "ChIJtest123", "end_date": "2024-01-02"},  # missing start_date
            {"place_id": "ChIJtest123", "start_date": "2024-01-01"},  # missing end_date
            {
                "place_id": "ChIJtest123",
                "start_date": "01-01-2024",
                "end_date": "2024-01-02",
            },  # MM-DD-YYYY
            {
                "place_id": "ChIJtest123",
                "start_date": "2024-01-01",
                "end_date": "01/02/2024",
            },  # MM/DD/YYYY
            {
                "place_id": "ChIJtest123",
                "start_date": "2024/01/01",
                "end_date": "2024-01-02",
            },  # slashes
            {
                "place_id": "ChIJtest123",
                "start_date": "2024-1-1",
                "end_date": "2024-01-02",
            },  # no leading zeros
            {
                "place_id": "ChIJtest123",
                "start_date": "2024-01-01",
                "end_date": "24-01-02",
            },  # 2-digit year
            {
                "place_id": "ChIJtest123",
                "start_date": "not-a-date",
                "end_date": "2024-01-02",
            },  # invalid string
        ],
    )
    async def test_get_parties_nearby_validation_errors(self, params: dict[str, str]):
        """Test validation errors for nearby search."""
        response = await self.admin_client.get("/api/parties/nearby", params=params)
        assert_res_validation_error(response)


class TestPartyCSVRouter:
    """Tests for GET /api/parties/csv endpoint."""

    admin_client: AsyncClient
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, party_utils: PartyTestUtils, admin_client: AsyncClient):
        self.party_utils = party_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_get_parties_csv_empty(self):
        """Test CSV export with no parties."""
        now = datetime.now(UTC)
        params = {
            "start_date": now.strftime("%Y-%m-%d"),
            "end_date": (now + timedelta(days=30)).strftime("%Y-%m-%d"),
        }
        response = await self.admin_client.get("/api/parties/csv", params=params)
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

        csv_content = response.text
        lines = csv_content.strip().split("\n")
        assert len(lines) == 1  # Only header row
        # Check for expected headers in the CSV
        assert "Contact One Email" in lines[0] or "Contact Two Email" in lines[0]

    @pytest.mark.asyncio
    async def test_get_parties_csv_with_data(self):
        """Test CSV export with parties."""
        parties = await self.party_utils.create_many(i=3)

        # Get date range that covers all parties
        now = datetime.now(UTC)
        params = {
            "start_date": (now - timedelta(days=1)).strftime("%Y-%m-%d"),
            "end_date": (now + timedelta(days=365)).strftime("%Y-%m-%d"),
        }
        response = await self.admin_client.get("/api/parties/csv", params=params)
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

        csv_content = response.text
        lines = csv_content.strip().split("\n")
        assert len(lines) == 4  # Header + 3 data rows

        # Verify party IDs are in CSV
        for party in parties:
            assert str(party.id) in csv_content

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "params",
        [
            {"end_date": "2024-01-02"},  # missing start_date
            {"start_date": "2024-01-01"},  # missing end_date
            {"start_date": "01-01-2024", "end_date": "2024-01-02"},  # MM-DD-YYYY
            {"start_date": "2024-01-01", "end_date": "01/02/2024"},  # MM/DD/YYYY
            {"start_date": "2024/01/01", "end_date": "2024-01-02"},  # slashes
            {"start_date": "2024-1-1", "end_date": "2024-01-02"},  # no leading zeros
            {"start_date": "2024-01-01", "end_date": "24-01-02"},  # 2-digit year
            {"start_date": "not-a-date", "end_date": "2024-01-02"},  # invalid string
        ],
    )
    async def test_get_parties_csv_validation_errors(self, params: dict[str, str]):
        """Test validation errors for CSV export."""
        response = await self.admin_client.get("/api/parties/csv", params=params)
        assert_res_validation_error(response)
