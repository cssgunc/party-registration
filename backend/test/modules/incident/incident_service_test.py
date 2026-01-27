from datetime import UTC, datetime

import pytest
from src.modules.incident.incident_model import IncidentSeverity
from src.modules.incident.incident_service import IncidentNotFoundException, IncidentService
from test.modules.incident.incident_utils import IncidentTestUtils
from test.modules.location.location_utils import LocationTestUtils


class TestIncidentService:
    incident_utils: IncidentTestUtils
    location_utils: LocationTestUtils
    incident_service: IncidentService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        incident_utils: IncidentTestUtils,
        location_utils: LocationTestUtils,
        incident_service: IncidentService,
    ):
        self.incident_utils = incident_utils
        self.location_utils = location_utils
        self.incident_service = incident_service

    @pytest.mark.asyncio
    async def test_create_incident(self) -> None:
        """Test creating a new incident."""
        location = await self.location_utils.create_one()
        data = await self.incident_utils.next_data(location_id=location.id)

        incident = await self.incident_service.create_incident(location.id, data)

        self.incident_utils.assert_matches(incident, data)

    @pytest.mark.asyncio
    async def test_create_incident_with_empty_description(self) -> None:
        """Test creating an incident with empty description (default)."""
        location = await self.location_utils.create_one()
        data = await self.incident_utils.next_data(location_id=location.id, description="")

        incident = await self.incident_service.create_incident(location.id, data)

        assert incident.description == ""

    @pytest.mark.asyncio
    async def test_create_incident_with_severity(self) -> None:
        """Test creating incidents with different severity levels."""
        location = await self.location_utils.create_one()

        for severity in IncidentSeverity:
            data = await self.incident_utils.next_data(location_id=location.id, severity=severity)
            incident = await self.incident_service.create_incident(location.id, data)
            assert incident.severity == severity

    @pytest.mark.asyncio
    async def test_get_incidents_by_location_empty(self) -> None:
        """Test getting incidents for a location with no incidents."""
        location = await self.location_utils.create_one()

        incidents = await self.incident_service.get_incidents_by_location(location.id)

        assert incidents == []

    @pytest.mark.asyncio
    async def test_get_incidents_by_location(self) -> None:
        """Test getting all incidents for a location."""
        location = await self.location_utils.create_one()
        incidents = await self.incident_utils.create_many(i=2, location_id=location.id)

        fetched = await self.incident_service.get_incidents_by_location(location.id)

        assert len(fetched) == 2
        for incident, expected in zip(fetched, incidents, strict=False):
            self.incident_utils.assert_matches(incident, expected)

    @pytest.mark.asyncio
    async def test_get_incident_by_id(self) -> None:
        """Test getting an incident by its ID."""
        incident_entity = await self.incident_utils.create_one()

        fetched = await self.incident_service.get_incident_by_id(incident_entity.id)

        self.incident_utils.assert_matches(fetched, incident_entity)

    @pytest.mark.asyncio
    async def test_get_incident_by_id_not_found(self) -> None:
        """Test getting an incident by non-existent ID raises not found exception."""
        with pytest.raises(IncidentNotFoundException, match="Incident with ID 999 not found"):
            await self.incident_service.get_incident_by_id(999)

    @pytest.mark.asyncio
    async def test_update_incident(self) -> None:
        """Test updating an incident."""
        incident_entity = await self.incident_utils.create_one()

        update_data = await self.incident_utils.next_data(
            location_id=incident_entity.location_id,
        )

        updated = await self.incident_service.update_incident(
            incident_entity.id, incident_entity.location_id, update_data
        )

        assert updated.id == incident_entity.id
        self.incident_utils.assert_matches(updated, update_data)

    @pytest.mark.asyncio
    async def test_update_incident_severity(self) -> None:
        """Test updating an incident's severity."""
        incident_entity = await self.incident_utils.create_one(severity=IncidentSeverity.COMPLAINT)

        update_data = await self.incident_utils.next_data(
            location_id=incident_entity.location_id,
            severity=IncidentSeverity.CITATION,
        )

        updated = await self.incident_service.update_incident(
            incident_entity.id, incident_entity.location_id, update_data
        )

        assert updated.severity == IncidentSeverity.CITATION

    @pytest.mark.asyncio
    async def test_update_incident_not_found(self) -> None:
        """Test updating a non-existent incident raises not found exception."""
        data = await self.incident_utils.next_data()

        with pytest.raises(IncidentNotFoundException, match="Incident with ID 999 not found"):
            await self.incident_service.update_incident(999, data.location_id, data)

    @pytest.mark.asyncio
    async def test_delete_incident(self) -> None:
        """Test deleting an incident."""
        incident_entity = await self.incident_utils.create_one()

        deleted = await self.incident_service.delete_incident(incident_entity.id)

        self.incident_utils.assert_matches(deleted, incident_entity)

        # Verify it's actually deleted
        with pytest.raises(IncidentNotFoundException):
            await self.incident_service.get_incident_by_id(incident_entity.id)

    @pytest.mark.asyncio
    async def test_delete_incident_not_found(self) -> None:
        """Test deleting a non-existent incident raises not found exception."""
        with pytest.raises(IncidentNotFoundException, match="Incident with ID 999 not found"):
            await self.incident_service.delete_incident(999)

    @pytest.mark.asyncio
    async def test_delete_incident_verify_others_remain(self) -> None:
        """Test that deleting one incident doesn't affect others."""
        location = await self.location_utils.create_one()
        incidents = await self.incident_utils.create_many(i=2, location_id=location.id)

        await self.incident_service.delete_incident(incidents[0].id)

        # incident 2 should still exist
        fetched = await self.incident_service.get_incident_by_id(incidents[1].id)
        self.incident_utils.assert_matches(fetched, incidents[1])

        # Only one incident should remain for this location
        all_incidents = await self.incident_service.get_incidents_by_location(location.id)
        assert len(all_incidents) == 1
        self.incident_utils.assert_matches(all_incidents[0], incidents[1])

    @pytest.mark.asyncio
    async def test_create_incident_from_location_dto(self) -> None:
        """Test creating an incident with location data (IncidentData)."""
        location = await self.location_utils.create_one()
        data = await self.incident_utils.next_data(
            location_id=location.id, description="Location noise incident"
        )

        incident = await self.incident_service.create_incident(location.id, data)

        self.incident_utils.assert_matches(incident, data)

    @pytest.mark.asyncio
    async def test_incident_data_persistence(self) -> None:
        """Test that all incident data fields are properly persisted."""
        location = await self.location_utils.create_one()
        data = await self.incident_utils.next_data(
            location_id=location.id,
            incident_datetime=datetime(2025, 12, 25, 14, 30, 45, tzinfo=UTC),
            description="Detailed description of the incident issue",
            severity=IncidentSeverity.WARNING,
        )

        created = await self.incident_service.create_incident(location.id, data)
        fetched = await self.incident_service.get_incident_by_id(created.id)

        self.incident_utils.assert_matches(fetched, data)
