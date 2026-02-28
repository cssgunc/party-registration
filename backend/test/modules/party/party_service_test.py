from datetime import UTC, datetime, timedelta

import pytest
from src.modules.location.location_service import LocationNotFoundException
from src.modules.party.party_model import ContactDto
from src.modules.party.party_service import (
    ContactTwoMatchesContactOneException,
    PartyNotFoundException,
    PartyService,
    StudentNotFoundException,
)
from src.modules.student.student_model import ContactPreference
from test.modules.location.location_utils import LocationTestUtils
from test.modules.party.party_utils import PartyTestUtils
from test.modules.student.student_utils import StudentTestUtils
from test.utils.geo import get_lat_offset_outside_radius, get_lat_offset_within_radius


class TestPartyServiceCRUD:
    """Tests for basic CRUD operations in PartyService."""

    party_utils: PartyTestUtils
    location_utils: LocationTestUtils
    student_utils: StudentTestUtils
    party_service: PartyService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_utils: PartyTestUtils,
        location_utils: LocationTestUtils,
        student_utils: StudentTestUtils,
        party_service: PartyService,
    ):
        self.party_utils = party_utils
        self.location_utils = location_utils
        self.student_utils = student_utils
        self.party_service = party_service

    @pytest.mark.asyncio
    async def test_create_party(self):
        """Test creating a party."""
        party_data = await self.party_utils.next_data()

        party = await self.party_service.create_party(party_data)

        self.party_utils.assert_matches(party, party_data)

    @pytest.mark.asyncio
    async def test_create_party_invalid_location(self):
        """Test creating a party with non-existent location."""
        party_data = await self.party_utils.next_data(location_id=999)

        with pytest.raises(LocationNotFoundException):
            await self.party_service.create_party(party_data)

    @pytest.mark.asyncio
    async def test_create_party_invalid_contact_one(self):
        """Test creating a party with non-existent contact_one student."""
        location = await self.location_utils.create_one()
        party_data = await self.party_utils.next_data(location_id=location.id, contact_one_id=999)

        with pytest.raises(StudentNotFoundException):
            await self.party_service.create_party(party_data)

    @pytest.mark.asyncio
    async def test_get_parties_empty(self):
        """Test getting parties when database is empty."""
        parties = await self.party_service.get_parties()
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties(self):
        """Test getting multiple parties."""
        created_parties = await self.party_utils.create_many(i=3)

        fetched = await self.party_service.get_parties()
        assert len(fetched) == 3

        # Verify all parties match
        for created, fetched_party in zip(created_parties, fetched, strict=False):
            self.party_utils.assert_matches(created, fetched_party)

    @pytest.mark.asyncio
    async def test_get_party_by_id(self):
        """Test getting a party by ID."""
        party_entity = await self.party_utils.create_one()

        fetched = await self.party_service.get_party_by_id(party_entity.id)

        self.party_utils.assert_matches(party_entity, fetched)

    @pytest.mark.asyncio
    async def test_get_party_by_id_not_found(self):
        """Test getting a non-existent party."""
        with pytest.raises(PartyNotFoundException):
            await self.party_service.get_party_by_id(999)

    @pytest.mark.asyncio
    async def test_update_party(self):
        """Test updating a party."""
        party_entity = await self.party_utils.create_one()

        update_data = await self.party_utils.next_data(
            location_id=party_entity.location_id,
            contact_one_id=party_entity.contact_one_id,
            party_datetime=party_entity.party_datetime + timedelta(hours=2),
        )

        updated = await self.party_service.update_party(party_entity.id, update_data)

        assert updated.id == party_entity.id
        self.party_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_party_not_found(self):
        """Test updating a non-existent party."""
        party_data = await self.party_utils.next_data()

        with pytest.raises(PartyNotFoundException):
            await self.party_service.update_party(999, party_data)

    @pytest.mark.asyncio
    async def test_update_party_invalid_location(self):
        """Test updating a party with invalid location."""
        party_entity = await self.party_utils.create_one()

        update_data = await self.party_utils.next_data(
            location_id=999,
            contact_one_id=party_entity.contact_one_id,
        )

        with pytest.raises(LocationNotFoundException):
            await self.party_service.update_party(party_entity.id, update_data)

    @pytest.mark.asyncio
    async def test_update_party_invalid_contact_one(self):
        """Test updating a party with invalid contact_one."""
        party_entity = await self.party_utils.create_one()

        update_data = await self.party_utils.next_data(
            location_id=party_entity.location_id,
            contact_one_id=999,
        )

        with pytest.raises(StudentNotFoundException):
            await self.party_service.update_party(party_entity.id, update_data)

    @pytest.mark.asyncio
    async def test_delete_party(self):
        """Test deleting a party."""
        party_entity = await self.party_utils.create_one()

        deleted = await self.party_service.delete_party(party_entity.id)

        self.party_utils.assert_matches(deleted, party_entity)

        # Verify deletion
        with pytest.raises(PartyNotFoundException):
            await self.party_service.get_party_by_id(party_entity.id)

    @pytest.mark.asyncio
    async def test_delete_party_not_found(self):
        """Test deleting a non-existent party."""
        with pytest.raises(PartyNotFoundException):
            await self.party_service.delete_party(999)

    @pytest.mark.asyncio
    async def test_party_exists(self):
        """Test checking if party exists."""
        party_entity = await self.party_utils.create_one()

        assert await self.party_service.party_exists(party_entity.id)
        assert not await self.party_service.party_exists(999)

    @pytest.mark.asyncio
    async def test_get_party_count(self):
        """Test getting party count."""
        initial_count = await self.party_service.get_party_count()

        await self.party_utils.create_many(i=3)

        new_count = await self.party_service.get_party_count()
        assert new_count == initial_count + 3


class TestPartyServiceQueries:
    """Tests for query operations in PartyService."""

    party_utils: PartyTestUtils
    party_service: PartyService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_utils: PartyTestUtils,
        party_service: PartyService,
    ):
        self.party_utils = party_utils
        self.party_service = party_service

    @pytest.mark.asyncio
    async def test_get_parties_by_location(self):
        """Test getting parties by location."""
        location1 = await self.party_utils.location_utils.create_one()
        location2 = await self.party_utils.location_utils.create_one()

        # Create parties at location1
        party1 = await self.party_utils.create_one(location_id=location1.id)
        party2 = await self.party_utils.create_one(location_id=location1.id)

        # Create party at different location
        party3 = await self.party_utils.create_one(location_id=location2.id)

        parties = await self.party_service.get_parties_by_location(location1.id)

        assert len(parties) == 2
        party_ids = [p.id for p in parties]
        assert party1.id in party_ids
        assert party2.id in party_ids
        assert party3.id not in party_ids

    @pytest.mark.asyncio
    async def test_get_parties_by_contact(self):
        """Test getting parties by contact_one."""
        student1 = await self.party_utils.student_utils.create_one()
        student2 = await self.party_utils.student_utils.create_one()

        # Create parties with student1 as contact_one
        party1 = await self.party_utils.create_one(contact_one_id=student1.account_id)
        party2 = await self.party_utils.create_one(contact_one_id=student1.account_id)

        # Create party with different contact_one
        party3 = await self.party_utils.create_one(contact_one_id=student2.account_id)

        parties = await self.party_service.get_parties_by_contact(student1.account_id)

        assert len(parties) == 2
        party_ids = [p.id for p in parties]
        assert party1.id in party_ids
        assert party2.id in party_ids
        assert party3.id not in party_ids

    @pytest.mark.asyncio
    async def test_get_parties_by_date_range(self):
        """Test getting parties by date range."""
        party_entity = await self.party_utils.create_one()

        start_date = party_entity.party_datetime - timedelta(hours=1)
        end_date = party_entity.party_datetime + timedelta(hours=1)

        parties = await self.party_service.get_parties_by_date_range(start_date, end_date)

        assert len(parties) == 1
        assert parties[0].id == party_entity.id

    @pytest.mark.asyncio
    async def test_get_parties_by_date_range_multiple_parties(self):
        """Test date range query with multiple parties."""
        base_datetime = datetime.now(UTC) + timedelta(days=1)

        # Create parties at different times
        party1 = await self.party_utils.create_one(party_datetime=base_datetime)
        party2 = await self.party_utils.create_one(
            party_datetime=base_datetime + timedelta(hours=2)
        )
        party3 = await self.party_utils.create_one(party_datetime=base_datetime + timedelta(days=5))

        # Query range that includes party1 and party2 but not party3
        start_date = base_datetime - timedelta(hours=1)
        end_date = base_datetime + timedelta(hours=3)

        parties = await self.party_service.get_parties_by_date_range(start_date, end_date)

        assert len(parties) == 2
        party_ids = [p.id for p in parties]
        assert party1.id in party_ids
        assert party2.id in party_ids
        assert party3.id not in party_ids

    @pytest.mark.asyncio
    async def test_get_parties_by_date_range_no_results(self):
        """Test date range query with no results."""
        party_entity = await self.party_utils.create_one()

        # Query range outside the party datetime
        start_date = party_entity.party_datetime + timedelta(days=1)
        end_date = party_entity.party_datetime + timedelta(days=2)

        parties = await self.party_service.get_parties_by_date_range(start_date, end_date)
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties_by_date_range_boundary_start(self):
        """Test that party at start_date boundary is included."""
        party_entity = await self.party_utils.create_one()

        start_date = party_entity.party_datetime
        end_date = party_entity.party_datetime + timedelta(hours=1)

        parties = await self.party_service.get_parties_by_date_range(start_date, end_date)
        assert len(parties) == 1
        assert parties[0].id == party_entity.id

    @pytest.mark.asyncio
    async def test_get_parties_by_date_range_boundary_end(self):
        """Test that party at end_date boundary is included."""
        party_entity = await self.party_utils.create_one()

        start_date = party_entity.party_datetime - timedelta(hours=1)
        end_date = party_entity.party_datetime

        parties = await self.party_service.get_parties_by_date_range(start_date, end_date)
        assert len(parties) == 1
        assert parties[0].id == party_entity.id

    @pytest.mark.asyncio
    async def test_get_parties_by_date_range_outside_before(self):
        """Test that parties before the date range are excluded."""
        party_entity = await self.party_utils.create_one()

        start_date = party_entity.party_datetime - timedelta(days=2)
        end_date = party_entity.party_datetime - timedelta(seconds=1)

        parties = await self.party_service.get_parties_by_date_range(start_date, end_date)
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties_by_date_range_outside_after(self):
        """Test that parties after the date range are excluded."""
        party_entity = await self.party_utils.create_one()

        start_date = party_entity.party_datetime + timedelta(seconds=1)
        end_date = party_entity.party_datetime + timedelta(days=2)

        parties = await self.party_service.get_parties_by_date_range(start_date, end_date)
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties_by_student_and_date(self):
        """Test getting parties by student and date."""
        party_entity = await self.party_utils.create_one()

        parties = await self.party_service.get_parties_by_student_and_date(
            party_entity.contact_one_id, party_entity.party_datetime
        )

        assert len(parties) == 1
        assert parties[0].id == party_entity.id

        # Test with different date
        different_date = party_entity.party_datetime + timedelta(days=10)
        parties = await self.party_service.get_parties_by_student_and_date(
            party_entity.contact_one_id, different_date
        )
        assert len(parties) == 0


class TestPartyServiceRadius:
    """Tests for radius-based queries in PartyService."""

    party_utils: PartyTestUtils
    location_utils: LocationTestUtils
    student_utils: StudentTestUtils
    party_service: PartyService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_utils: PartyTestUtils,
        location_utils: LocationTestUtils,
        student_utils: StudentTestUtils,
        party_service: PartyService,
    ):
        self.party_utils = party_utils
        self.location_utils = location_utils
        self.student_utils = student_utils
        self.party_service = party_service

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_empty_results(self):
        """Test radius search with no parties."""
        search_lat = 40.7128
        search_lon = -74.0060

        parties = await self.party_service.get_parties_by_radius(search_lat, search_lon)
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties_by_radius(self):
        """Test radius search returns parties within radius."""
        search_lat = 40.7128
        search_lon = -74.0060

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
        party_within = await self.party_utils.create_one(
            location_id=location_within.id,
            party_datetime=datetime.now(UTC) + timedelta(hours=2),
        )

        party_outside = await self.party_utils.create_one(
            location_id=location_outside.id,
            party_datetime=datetime.now(UTC) + timedelta(hours=2),
        )

        parties = await self.party_service.get_parties_by_radius(search_lat, search_lon)

        party_ids = [p.id for p in parties]
        assert party_within.id in party_ids
        assert party_outside.id not in party_ids

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_time_window_past(self):
        """Test that parties more than 6 hours in the past are excluded."""
        search_lat = 40.7128
        search_lon = -74.0060

        location = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        # Party 7 hours in the past (outside window)
        await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=datetime.now(UTC) - timedelta(hours=7),
        )

        parties = await self.party_service.get_parties_by_radius(search_lat, search_lon)
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_time_window_future(self):
        """Test that parties more than 12 hours in the future are excluded."""
        search_lat = 40.7128
        search_lon = -74.0060

        location = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        # Party 13 hours in the future (outside window)
        await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=datetime.now(UTC) + timedelta(hours=13),
        )

        parties = await self.party_service.get_parties_by_radius(search_lat, search_lon)
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_time_window_boundaries(self):
        """Test parties at time window boundaries are included."""
        search_lat = 40.7128
        search_lon = -74.0060

        location = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        # Party ~6 hours in the past (just within window)
        party_past = await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=datetime.now(UTC) - timedelta(hours=5, minutes=59),
        )

        # Party ~12 hours in the future (just within window)
        party_future = await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=datetime.now(UTC) + timedelta(hours=11, minutes=59),
        )

        parties = await self.party_service.get_parties_by_radius(search_lat, search_lon)
        assert len(parties) == 2
        party_ids = [p.id for p in parties]
        assert party_past.id in party_ids
        assert party_future.id in party_ids

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_and_date_range(self):
        """Test radius search with date range filtering."""
        search_lat = 40.7128
        search_lon = -74.0060

        location_within = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        location_outside = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_outside_radius(),
            longitude=search_lon,
        )

        base_time = datetime.now(UTC) + timedelta(hours=2)

        party_valid = await self.party_utils.create_one(
            location_id=location_within.id,
            party_datetime=base_time,
        )

        _party_wrong_time = await self.party_utils.create_one(
            location_id=location_within.id,
            party_datetime=base_time + timedelta(hours=6),
        )

        _party_wrong_location = await self.party_utils.create_one(
            location_id=location_outside.id,
            party_datetime=base_time,
        )

        start_date = base_time - timedelta(hours=1)
        end_date = base_time + timedelta(hours=4)

        parties = await self.party_service.get_parties_by_radius_and_date_range(
            search_lat, search_lon, start_date, end_date
        )

        assert len(parties) == 1
        assert parties[0].id == party_valid.id

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_and_date_range_empty(self):
        """Test radius and date range search with no results."""
        search_lat = 40.7128
        search_lon = -74.0060

        start_date = datetime.now(UTC) + timedelta(days=1)
        end_date = datetime.now(UTC) + timedelta(days=2)

        parties = await self.party_service.get_parties_by_radius_and_date_range(
            search_lat, search_lon, start_date, end_date
        )
        assert len(parties) == 0

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_and_date_range_boundary_start(self):
        """Test that party at start_date boundary is included."""
        search_lat = 40.7128
        search_lon = -74.0060

        location = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        start_date = datetime.now(UTC) + timedelta(hours=2)

        party = await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=start_date,
        )

        end_date = start_date + timedelta(hours=5)

        parties = await self.party_service.get_parties_by_radius_and_date_range(
            search_lat, search_lon, start_date, end_date
        )
        assert len(parties) == 1
        assert parties[0].id == party.id

    @pytest.mark.asyncio
    async def test_get_parties_by_radius_and_date_range_boundary_end(self):
        """Test that party at end_date boundary is included."""
        search_lat = 40.7128
        search_lon = -74.0060

        location = await self.location_utils.create_one(
            latitude=search_lat + get_lat_offset_within_radius(),
            longitude=search_lon,
        )

        end_date = datetime.now(UTC) + timedelta(hours=3)

        party = await self.party_utils.create_one(
            location_id=location.id,
            party_datetime=end_date,
        )

        start_date = end_date - timedelta(hours=2)

        parties = await self.party_service.get_parties_by_radius_and_date_range(
            search_lat, search_lon, start_date, end_date
        )
        assert len(parties) == 1
        assert parties[0].id == party.id


class TestPartyServiceContactTwoValidation:
    """Tests for contact two duplicate validation in PartyService."""

    party_service: PartyService

    @pytest.fixture(autouse=True)
    def _setup(self, party_service: PartyService):
        self.party_service = party_service

    def _make_contact(
        self,
        email: str = "contact2@email.com",
        phone_number: str = "9195559999",
    ) -> ContactDto:
        return ContactDto(
            email=email,
            first_name="Contact",
            last_name="Two",
            phone_number=phone_number,
            contact_preference=ContactPreference.TEXT,
        )

    def test_valid_different_contact_two(self):
        """Test that validation passes when contact two differs from contact one."""
        contact_two = self._make_contact(email="different@email.com", phone_number="9195550000")
        # Should not raise
        self.party_service._validate_contact_two_differs_from_contact_one(
            "student@unc.edu", "9195551111", contact_two
        )

    def test_duplicate_email_raises(self):
        """Test that matching email between contacts raises an error."""
        contact_two = self._make_contact(email="student@unc.edu", phone_number="9195550000")
        with pytest.raises(ContactTwoMatchesContactOneException):
            self.party_service._validate_contact_two_differs_from_contact_one(
                "student@unc.edu", "9195551111", contact_two
            )

    def test_duplicate_email_case_insensitive(self):
        """Test that email comparison is case-insensitive."""
        contact_two = self._make_contact(email="STUDENT@UNC.EDU", phone_number="9195550000")
        with pytest.raises(ContactTwoMatchesContactOneException):
            self.party_service._validate_contact_two_differs_from_contact_one(
                "student@unc.edu", "9195551111", contact_two
            )

    def test_duplicate_phone_raises(self):
        """Test that matching phone number between contacts raises an error."""
        contact_two = self._make_contact(email="different@email.com", phone_number="9195551111")
        with pytest.raises(ContactTwoMatchesContactOneException):
            self.party_service._validate_contact_two_differs_from_contact_one(
                "student@unc.edu", "9195551111", contact_two
            )

    def test_both_duplicate_raises(self):
        """Test that when both email and phone match, an error is raised."""
        contact_two = self._make_contact(email="student@unc.edu", phone_number="9195551111")
        with pytest.raises(ContactTwoMatchesContactOneException):
            self.party_service._validate_contact_two_differs_from_contact_one(
                "student@unc.edu", "9195551111", contact_two
            )
