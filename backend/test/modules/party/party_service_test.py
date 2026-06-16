import pytest
from src.modules.party.party_model import (
    ContactDto,
    PartyStatus,
    StudentCreatePartyDto,
)
from src.modules.party.party_service import (
    PartyNotFoundException,
    PartyService,
)
from src.modules.student.student_model import ContactPreference
from src.modules.student.student_service import StudentNotFoundException
from test.modules.location.location_utils import LocationTestUtils
from test.modules.party.party_utils import (
    PartyTestUtils,
    get_valid_party_datetime,
)
from test.modules.student.student_utils import StudentTestUtils


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
    async def test_cancel_party_as_admin(self):
        """Admin cancellation flips status to CANCELLED without ownership check."""
        party_entity = await self.party_utils.create_one()

        cancelled = await self.party_service.cancel_party(party_entity.id, student_id=None)

        party_entity.status = PartyStatus.CANCELLED
        self.party_utils.assert_matches(party_entity, cancelled)

        # Party still exists in the DB
        fetched = await self.party_service.get_party_by_id(party_entity.id)
        self.party_utils.assert_matches(party_entity, fetched)

    @pytest.mark.asyncio
    async def test_cancel_party_as_admin_not_found(self):
        with pytest.raises(PartyNotFoundException):
            await self.party_service.cancel_party(999, student_id=None)

    @pytest.mark.asyncio
    async def test_cancel_party_idempotent(self):
        """Cancelling an already-cancelled party is a no-op (no error)."""
        party_entity = await self.party_utils.create_one()
        await self.party_service.cancel_party(party_entity.id, student_id=None)

        result = await self.party_service.cancel_party(party_entity.id, student_id=None)
        party_entity.status = PartyStatus.CANCELLED
        self.party_utils.assert_matches(party_entity, result)

    @pytest.mark.asyncio
    async def test_restore_party(self):
        """Restoring a cancelled party flips status back to CONFIRMED."""
        party_entity = await self.party_utils.create_one()
        await self.party_service.cancel_party(party_entity.id, student_id=None)

        restored = await self.party_service.restore_party(party_entity.id)

        self.party_utils.assert_matches(party_entity, restored)

        fetched = await self.party_service.get_party_by_id(party_entity.id)
        self.party_utils.assert_matches(party_entity, fetched)

    @pytest.mark.asyncio
    async def test_restore_party_idempotent(self):
        """Restoring an already-confirmed party is a no-op."""
        party_entity = await self.party_utils.create_one()

        result = await self.party_service.restore_party(party_entity.id)
        self.party_utils.assert_matches(party_entity, result)

    @pytest.mark.asyncio
    async def test_restore_party_not_found(self):
        with pytest.raises(PartyNotFoundException):
            await self.party_service.restore_party(999)


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
    async def test_get_parties_by_contact(self):
        """Test getting parties by contact_one."""
        student1 = await self.party_utils.student_utils.create_one()
        student2 = await self.party_utils.student_utils.create_one()

        # Create parties with student1 as contact_one
        party1 = await self.party_utils.create_one(contact_one_id=student1.account_id)
        party2 = await self.party_utils.create_one(contact_one_id=student1.account_id)

        # Create party with different contact_one
        party3 = await self.party_utils.create_one(contact_one_id=student2.account_id)

        parties = await self.party_service.get_parties_for_student(student1.account_id)

        assert len(parties) == 2
        party_ids = [p.id for p in parties]
        assert party1.id in party_ids
        assert party2.id in party_ids
        assert party3.id not in party_ids


class TestPartyStudentInfoValidation:
    """Tests that party creation requires a Student entity with contact info."""

    party_service: PartyService
    student_utils: StudentTestUtils
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        party_service: PartyService,
        student_utils: StudentTestUtils,
        party_utils: PartyTestUtils,
    ):
        self.party_service = party_service
        self.student_utils = student_utils
        self.party_utils = party_utils

    @pytest.mark.asyncio
    async def test_create_party_from_student_dto_no_student_row(self):
        """No Student row at all surfaces as a 404 from the student lookup."""
        account = await self.student_utils.account_utils.create_one(role="student")
        dto = StudentCreatePartyDto(
            type="student",
            party_datetime=get_valid_party_datetime(),
            contact_two=ContactDto(
                email="other@unc.edu",
                first_name="Other",
                last_name="Person",
                phone_number="9195559999",
                contact_preference=ContactPreference.TEXT,
            ),
        )

        with pytest.raises(StudentNotFoundException):
            await self.party_service.create_party_from_student_dto(dto, account.id)
