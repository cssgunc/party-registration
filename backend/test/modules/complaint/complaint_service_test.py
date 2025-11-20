from datetime import datetime

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.complaint.complaint_entity import ComplaintEntity
from src.modules.complaint.complaint_model import Complaint, ComplaintCreate
from src.modules.complaint.complaint_service import (
    ComplaintNotFoundException,
    ComplaintService,
)
from src.modules.location.location_entity import LocationEntity


@pytest.fixture
def complaint_service_db(test_async_session: AsyncSession) -> ComplaintService:
    """Create ComplaintService with database session."""
    return ComplaintService(session=test_async_session)


@pytest.fixture
def sample_complaint_create_data() -> ComplaintCreate:
    """Create sample complaint create data for testing."""
    return ComplaintCreate(
        location_id=1,
        complaint_datetime=datetime(2025, 11, 18, 20, 30, 0),
        description="Noise complaint",
    )


@pytest.fixture
def sample_complaint_create_data_2() -> ComplaintCreate:
    """Create another sample complaint create data for testing."""
    return ComplaintCreate(
        location_id=1,
        complaint_datetime=datetime(2025, 11, 19, 22, 0, 0),
        description="Noise complaint",
    )


@pytest_asyncio.fixture
async def test_location(test_async_session: AsyncSession) -> LocationEntity:
    """Create a test location entity directly in the database."""
    location_entity = LocationEntity(
        google_place_id="ChIJ123abc",
        formatted_address="123 Main St, Chapel Hill, NC 27514, USA",
        latitude=35.9132,
        longitude=-79.0558,
        street_number="123",
        street_name="Main Street",
        city="Chapel Hill",
        county="Orange County",
        state="NC",
        country="US",
        zip_code="27514",
        warning_count=0,
        citation_count=0,
    )
    test_async_session.add(location_entity)
    await test_async_session.commit()
    await test_async_session.refresh(location_entity)
    return location_entity


@pytest_asyncio.fixture
async def test_complaint(
    test_async_session: AsyncSession, test_location: LocationEntity
) -> Complaint:
    """Create a test complaint entity directly in the database."""
    complaint_entity = ComplaintEntity(
        location_id=test_location.id,
        complaint_datetime=datetime(2025, 11, 18, 20, 30, 0),
        description="Noise complaint",
    )
    test_async_session.add(complaint_entity)
    await test_async_session.commit()
    await test_async_session.refresh(complaint_entity)
    return complaint_entity.to_model()


@pytest_asyncio.fixture
async def test_complaints_multiple(
    test_async_session: AsyncSession, test_location: LocationEntity
) -> list[Complaint]:
    """Create multiple test complaint entities directly in the database."""
    complaint_entities = [
        ComplaintEntity(
            location_id=test_location.id,
            complaint_datetime=datetime(2025, 11, 18, 20, 30, 0),
            description="Noise complaint",
        ),
        ComplaintEntity(
            location_id=test_location.id,
            complaint_datetime=datetime(2025, 11, 19, 22, 0, 0),
            description="Noise complaint",
        ),
    ]

    for entity in complaint_entities:
        test_async_session.add(entity)
    await test_async_session.commit()

    complaints = []
    for entity in complaint_entities:
        await test_async_session.refresh(entity)
        complaints.append(entity.to_model())

    return complaints


@pytest.mark.asyncio
async def test_create_complaint(
    complaint_service_db: ComplaintService,
    test_location: LocationEntity,
    sample_complaint_create_data: ComplaintCreate,
) -> None:
    """Test creating a new complaint."""
    complaint = await complaint_service_db.create_complaint(
        test_location.id, sample_complaint_create_data
    )

    assert complaint is not None
    assert complaint.id is not None
    assert complaint.location_id == test_location.id
    assert complaint.complaint_datetime == datetime(2025, 11, 18, 20, 30, 0)
    assert complaint.description == "Noise complaint"


@pytest.mark.asyncio
async def test_create_complaint_with_empty_description(
    complaint_service_db: ComplaintService, test_location: LocationEntity
) -> None:
    """Test creating a complaint with empty description (default)."""
    complaint_data = ComplaintCreate(
        location_id=test_location.id,
        complaint_datetime=datetime(2025, 11, 18, 20, 30, 0),
        description="",
    )
    complaint = await complaint_service_db.create_complaint(
        test_location.id, complaint_data
    )

    assert complaint is not None
    assert complaint.id is not None
    assert complaint.description == ""


@pytest.mark.asyncio
async def test_get_complaints_by_location_empty(
    complaint_service_db: ComplaintService, test_location: LocationEntity
) -> None:
    """Test getting complaints for a location with no complaints."""
    complaints = await complaint_service_db.get_complaints_by_location(test_location.id)
    assert complaints == []


@pytest.mark.asyncio
async def test_get_complaints_by_location(
    complaint_service_db: ComplaintService,
    test_location: LocationEntity,
    test_complaints_multiple: list[Complaint],
) -> None:
    """Test getting all complaints for a location."""
    complaints = await complaint_service_db.get_complaints_by_location(test_location.id)

    assert len(complaints) == 2
    descriptions = sorted([c.description for c in complaints])
    assert descriptions == ["Noise complaint", "Noise complaint"]


@pytest.mark.asyncio
async def test_get_complaint_by_id(
    complaint_service_db: ComplaintService, test_complaint: Complaint
) -> None:
    """Test getting a complaint by its ID."""
    fetched = await complaint_service_db.get_complaint_by_id(test_complaint.id)

    assert fetched.id == test_complaint.id
    assert fetched.location_id == test_complaint.location_id
    assert fetched.complaint_datetime == test_complaint.complaint_datetime
    assert fetched.description == test_complaint.description


@pytest.mark.asyncio
async def test_get_complaint_by_id_not_found(
    complaint_service_db: ComplaintService,
) -> None:
    """Test getting a complaint by non-existent ID raises not found exception."""
    with pytest.raises(
        ComplaintNotFoundException, match="Complaint with ID 999 not found"
    ):
        await complaint_service_db.get_complaint_by_id(999)


@pytest.mark.asyncio
async def test_update_complaint(
    complaint_service_db: ComplaintService,
    test_location: LocationEntity,
    test_complaint: Complaint,
) -> None:
    """Test updating a complaint."""
    update_data = ComplaintCreate(
        location_id=test_location.id,
        complaint_datetime=datetime(2025, 11, 20, 23, 0, 0),
        description="Updated complaint description",
    )

    updated = await complaint_service_db.update_complaint(
        test_complaint.id, test_location.id, update_data
    )

    assert updated.id == test_complaint.id
    assert updated.location_id == test_location.id
    assert updated.complaint_datetime == datetime(2025, 11, 20, 23, 0, 0)
    assert updated.description == "Updated complaint description"


@pytest.mark.asyncio
async def test_update_complaint_not_found(
    complaint_service_db: ComplaintService,
    sample_complaint_create_data: ComplaintCreate,
) -> None:
    """Test updating a non-existent complaint raises not found exception."""
    with pytest.raises(
        ComplaintNotFoundException, match="Complaint with ID 999 not found"
    ):
        await complaint_service_db.update_complaint(
            999, 1, sample_complaint_create_data
        )


@pytest.mark.asyncio
async def test_delete_complaint(
    complaint_service_db: ComplaintService, test_complaint: Complaint
) -> None:
    """Test deleting a complaint."""
    deleted = await complaint_service_db.delete_complaint(test_complaint.id)

    assert deleted.id == test_complaint.id
    assert deleted.location_id == test_complaint.location_id

    # Verify it's actually deleted
    with pytest.raises(ComplaintNotFoundException):
        await complaint_service_db.get_complaint_by_id(test_complaint.id)


@pytest.mark.asyncio
async def test_delete_complaint_not_found(
    complaint_service_db: ComplaintService,
) -> None:
    """Test deleting a non-existent complaint raises not found exception."""
    with pytest.raises(
        ComplaintNotFoundException, match="Complaint with ID 999 not found"
    ):
        await complaint_service_db.delete_complaint(999)


@pytest.mark.asyncio
async def test_delete_complaint_verify_others_remain(
    complaint_service_db: ComplaintService, test_complaints_multiple: list[Complaint]
) -> None:
    """Test that deleting one complaint doesn't affect others."""
    complaint1 = test_complaints_multiple[0]
    complaint2 = test_complaints_multiple[1]

    await complaint_service_db.delete_complaint(complaint1.id)

    # complaint2 should still exist
    fetched = await complaint_service_db.get_complaint_by_id(complaint2.id)
    assert fetched.id == complaint2.id

    # Only one complaint should remain for this location
    all_complaints = await complaint_service_db.get_complaints_by_location(
        complaint2.location_id
    )
    assert len(all_complaints) == 1
    assert all_complaints[0].id == complaint2.id


@pytest.mark.asyncio
async def test_create_complaint_from_location_dto(
    complaint_service_db: ComplaintService, test_location: LocationEntity
) -> None:
    """Test creating a complaint with location data (ComplaintCreate)."""
    complaint_data = ComplaintCreate(
        location_id=test_location.id,
        complaint_datetime=datetime(2025, 11, 18, 20, 30, 0),
        description="Location noise complaint",
    )

    complaint = await complaint_service_db.create_complaint(
        test_location.id, complaint_data
    )

    assert complaint is not None
    assert complaint.id is not None
    assert complaint.location_id == test_location.id
    assert complaint.description == "Location noise complaint"


@pytest.mark.asyncio
async def test_complaint_data_persistence(
    complaint_service_db: ComplaintService, test_location: LocationEntity
) -> None:
    """Test that all complaint data fields are properly persisted."""
    data = ComplaintCreate(
        location_id=test_location.id,
        complaint_datetime=datetime(2025, 12, 25, 14, 30, 45),
        description="Detailed description of the complaint issue",
    )

    created = await complaint_service_db.create_complaint(test_location.id, data)
    fetched = await complaint_service_db.get_complaint_by_id(created.id)

    # Verify all fields are preserved
    assert fetched.location_id == test_location.id
    assert fetched.complaint_datetime == datetime(2025, 12, 25, 14, 30, 45)
    assert fetched.description == "Detailed description of the complaint issue"
