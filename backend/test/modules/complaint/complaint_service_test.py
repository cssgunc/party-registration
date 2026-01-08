from datetime import UTC, datetime

import pytest
from src.modules.complaint.complaint_service import ComplaintNotFoundException, ComplaintService
from test.modules.complaint.complaint_utils import ComplaintTestUtils
from test.modules.location.location_utils import LocationTestUtils


class TestComplaintService:
    complaint_utils: ComplaintTestUtils
    location_utils: LocationTestUtils
    complaint_service: ComplaintService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        complaint_utils: ComplaintTestUtils,
        location_utils: LocationTestUtils,
        complaint_service: ComplaintService,
    ):
        self.complaint_utils = complaint_utils
        self.location_utils = location_utils
        self.complaint_service = complaint_service

    @pytest.mark.asyncio
    async def test_create_complaint(self) -> None:
        """Test creating a new complaint."""
        location = await self.location_utils.create_one()
        data = await self.complaint_utils.next_data(location_id=location.id)

        complaint = await self.complaint_service.create_complaint(location.id, data)

        self.complaint_utils.assert_matches(complaint, data)

    @pytest.mark.asyncio
    async def test_create_complaint_with_empty_description(self) -> None:
        """Test creating a complaint with empty description (default)."""
        location = await self.location_utils.create_one()
        data = await self.complaint_utils.next_data(location_id=location.id, description="")

        complaint = await self.complaint_service.create_complaint(location.id, data)

        assert complaint.description == ""

    @pytest.mark.asyncio
    async def test_get_complaints_by_location_empty(self) -> None:
        """Test getting complaints for a location with no complaints."""
        location = await self.location_utils.create_one()

        complaints = await self.complaint_service.get_complaints_by_location(location.id)

        assert complaints == []

    @pytest.mark.asyncio
    async def test_get_complaints_by_location(self) -> None:
        """Test getting all complaints for a location."""
        location = await self.location_utils.create_one()
        complaints = await self.complaint_utils.create_many(i=2, location_id=location.id)

        fetched = await self.complaint_service.get_complaints_by_location(location.id)

        assert len(fetched) == 2
        for complaint, expected in zip(fetched, complaints, strict=False):
            self.complaint_utils.assert_matches(complaint, expected)

    @pytest.mark.asyncio
    async def test_get_complaint_by_id(self) -> None:
        """Test getting a complaint by its ID."""
        complaint_entity = await self.complaint_utils.create_one()

        fetched = await self.complaint_service.get_complaint_by_id(complaint_entity.id)

        self.complaint_utils.assert_matches(fetched, complaint_entity)

    @pytest.mark.asyncio
    async def test_get_complaint_by_id_not_found(self) -> None:
        """Test getting a complaint by non-existent ID raises not found exception."""
        with pytest.raises(ComplaintNotFoundException, match="Complaint with ID 999 not found"):
            await self.complaint_service.get_complaint_by_id(999)

    @pytest.mark.asyncio
    async def test_update_complaint(self) -> None:
        """Test updating a complaint."""
        complaint_entity = await self.complaint_utils.create_one()

        update_data = await self.complaint_utils.next_data(
            location_id=complaint_entity.location_id,
        )

        updated = await self.complaint_service.update_complaint(
            complaint_entity.id, complaint_entity.location_id, update_data
        )

        assert updated.id == complaint_entity.id
        self.complaint_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_complaint_not_found(self) -> None:
        """Test updating a non-existent complaint raises not found exception."""
        data = await self.complaint_utils.next_data()

        with pytest.raises(ComplaintNotFoundException, match="Complaint with ID 999 not found"):
            await self.complaint_service.update_complaint(999, data.location_id, data)

    @pytest.mark.asyncio
    async def test_delete_complaint(self) -> None:
        """Test deleting a complaint."""
        complaint_entity = await self.complaint_utils.create_one()

        deleted = await self.complaint_service.delete_complaint(complaint_entity.id)

        self.complaint_utils.assert_matches(deleted, complaint_entity)

        # Verify it's actually deleted
        with pytest.raises(ComplaintNotFoundException):
            await self.complaint_service.get_complaint_by_id(complaint_entity.id)

    @pytest.mark.asyncio
    async def test_delete_complaint_not_found(self) -> None:
        """Test deleting a non-existent complaint raises not found exception."""
        with pytest.raises(ComplaintNotFoundException, match="Complaint with ID 999 not found"):
            await self.complaint_service.delete_complaint(999)

    @pytest.mark.asyncio
    async def test_delete_complaint_verify_others_remain(self) -> None:
        """Test that deleting one complaint doesn't affect others."""
        location = await self.location_utils.create_one()
        complaints = await self.complaint_utils.create_many(i=2, location_id=location.id)

        await self.complaint_service.delete_complaint(complaints[0].id)

        # complaint 2 should still exist
        fetched = await self.complaint_service.get_complaint_by_id(complaints[1].id)
        self.complaint_utils.assert_matches(fetched, complaints[1])

        # Only one complaint should remain for this location
        all_complaints = await self.complaint_service.get_complaints_by_location(location.id)
        assert len(all_complaints) == 1
        self.complaint_utils.assert_matches(all_complaints[0], complaints[1])

    @pytest.mark.asyncio
    async def test_create_complaint_from_location_dto(self) -> None:
        """Test creating a complaint with location data (ComplaintData)."""
        location = await self.location_utils.create_one()
        data = await self.complaint_utils.next_data(
            location_id=location.id, description="Location noise complaint"
        )

        complaint = await self.complaint_service.create_complaint(location.id, data)

        self.complaint_utils.assert_matches(complaint, data)

    @pytest.mark.asyncio
    async def test_complaint_data_persistence(self) -> None:
        """Test that all complaint data fields are properly persisted."""
        location = await self.location_utils.create_one()
        data = await self.complaint_utils.next_data(
            location_id=location.id,
            complaint_datetime=datetime(2025, 12, 25, 14, 30, 45, tzinfo=UTC),
            description="Detailed description of the complaint issue",
        )

        created = await self.complaint_service.create_complaint(location.id, data)
        fetched = await self.complaint_service.get_complaint_by_id(created.id)

        self.complaint_utils.assert_matches(fetched, data)
