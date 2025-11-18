from datetime import datetime
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session
from src.main import app
from src.modules.complaint.complaint_model import Complaint
from src.modules.complaint.complaint_service import (
    ComplaintNotFoundException,
    ComplaintService,
)
from src.modules.location.location_model import Location
from src.modules.party.party_model import Contact, Party
from src.modules.party.party_service import PartyNotFoundException, PartyService
from src.modules.student.student_model import ContactPreference, Student


@pytest_asyncio.fixture()
async def mock_complaint_service() -> ComplaintService:
    mock_service = AsyncMock(spec=ComplaintService)
    return mock_service


@pytest_asyncio.fixture()
async def mock_party_service() -> PartyService:
    mock_service = AsyncMock(spec=PartyService)
    return mock_service


@pytest_asyncio.fixture()
async def unauthenticated_client(
    test_async_session: AsyncSession,
    mock_complaint_service: ComplaintService,
    mock_party_service: PartyService,
):
    """Create an async test client WITHOUT authentication override."""

    async def override_get_session():
        yield test_async_session

    def get_mock_complaint_service():
        return mock_complaint_service

    def get_mock_party_service():
        return mock_party_service

    app.dependency_overrides[ComplaintService] = get_mock_complaint_service
    app.dependency_overrides[PartyService] = get_mock_party_service
    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test/api",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def client(
    test_async_session: AsyncSession,
    mock_complaint_service: ComplaintService,
    mock_party_service: PartyService,
):
    """Create an async test client with authentication and service overrides."""

    async def override_get_session():
        yield test_async_session

    def get_mock_complaint_service():
        return mock_complaint_service

    def get_mock_party_service():
        return mock_party_service

    app.dependency_overrides[ComplaintService] = get_mock_complaint_service
    app.dependency_overrides[PartyService] = get_mock_party_service
    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test/api",
        headers={"Authorization": "Bearer admin"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_location() -> Location:
    """Create sample location for testing."""
    return Location(
        id=1,
        google_place_id="ChIJ123abc",
        formatted_address="123 Main St, Chapel Hill, NC 27514, USA",
        latitude=35.9132,
        longitude=-79.0558,
        street_number="123",
        street_name="Main Street",
        unit=None,
        city="Chapel Hill",
        county="Orange County",
        state="NC",
        country="US",
        zip_code="27514",
        warning_count=0,
        citation_count=0,
        hold_expiration=None,
    )


@pytest.fixture
def sample_student() -> Student:
    """Create sample student for testing."""
    return Student(
        id=1,
        pid="123456789",
        email="student@example.com",
        first_name="John",
        last_name="Doe",
        phone_number="1234567890",
        contact_preference=ContactPreference.text,
        last_registered=datetime(2025, 8, 15),
    )


@pytest.fixture
def sample_contact() -> Contact:
    """Create sample contact for testing."""
    return Contact(
        email="contact2@example.com",
        first_name="Jane",
        last_name="Smith",
        phone_number="9876543210",
        contact_preference=ContactPreference.call,
    )


@pytest.fixture
def sample_party(
    sample_location: Location, sample_student: Student, sample_contact: Contact
) -> Party:
    """Create sample party for testing."""
    return Party(
        id=1,
        party_datetime=datetime(2025, 11, 20, 20, 0, 0),
        location=sample_location,
        contact_one=sample_student,
        contact_two=sample_contact,
    )


@pytest.fixture
def sample_complaint() -> Complaint:
    """Create sample complaint for testing."""
    return Complaint(
        id=1,
        location_id=1,
        complaint_datetime=datetime(2025, 11, 18, 20, 30, 0),
        description="Noise complaint",
    )


@pytest.fixture
def sample_complaint_2() -> Complaint:
    """Create another sample complaint for testing."""
    return Complaint(
        id=2,
        location_id=1,
        complaint_datetime=datetime(2025, 11, 19, 22, 0, 0),
        description="Noise complaint",
    )


# GET /locations/{location_id}/complaints tests


@pytest.mark.asyncio
async def test_get_complaints_by_location_success(
    client: AsyncClient,
    mock_complaint_service: ComplaintService,
    sample_complaint: Complaint,
    sample_complaint_2: Complaint,
) -> None:
    """Test successfully getting all complaints for a location."""
    mock_complaint_service.get_complaints_by_location.return_value = [
        sample_complaint,
        sample_complaint_2,
    ]

    response = await client.get("/locations/1/complaints")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == 1
    assert data[0]["description"] == "Noise complaint"
    assert data[1]["id"] == 2
    assert data[1]["description"] == "Noise complaint"
    mock_complaint_service.get_complaints_by_location.assert_called_once_with(1)


@pytest.mark.asyncio
async def test_get_complaints_by_location_empty(
    client: AsyncClient, mock_complaint_service: ComplaintService
) -> None:
    """Test getting complaints for a location with no complaints."""
    mock_complaint_service.get_complaints_by_location.return_value = []

    response = await client.get("/locations/1/complaints")

    assert response.status_code == 200
    data = response.json()
    assert data == []


# POST /locations/{location_id}/complaints tests


@pytest.mark.asyncio
async def test_create_complaint_success(
    client: AsyncClient,
    mock_complaint_service: ComplaintService,
    mock_party_service: PartyService,
    sample_party: Party,
    sample_complaint: Complaint,
) -> None:
    """Test successfully creating a complaint."""
    mock_party_service.get_party_by_id.return_value = sample_party
    mock_complaint_service.create_complaint.return_value = sample_complaint

    complaint_data = {
        "party_id": 1,
        "complaint_datetime": "2025-11-18T20:30:00",
        "description": "Noise complaint",
    }

    response = await client.post("/locations/1/complaints", json=complaint_data)

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 1
    assert data["location_id"] == 1
    assert data["description"] == "Noise complaint"
    mock_party_service.get_party_by_id.assert_called_once_with(1)
    mock_complaint_service.create_complaint.assert_called_once()


@pytest.mark.asyncio
async def test_create_complaint_with_empty_description(
    client: AsyncClient,
    mock_complaint_service: ComplaintService,
    mock_party_service: PartyService,
    sample_party: Party,
) -> None:
    """Test creating a complaint with empty description."""
    empty_complaint = Complaint(
        id=1,
        location_id=1,
        complaint_datetime=datetime(2025, 11, 18, 20, 30, 0),
        description="",
    )
    mock_party_service.get_party_by_id.return_value = sample_party
    mock_complaint_service.create_complaint.return_value = empty_complaint

    complaint_data = {
        "party_id": 1,
        "complaint_datetime": "2025-11-18T20:30:00",
        "description": "",
    }

    response = await client.post("/locations/1/complaints", json=complaint_data)

    assert response.status_code == 201
    data = response.json()
    assert data["description"] == ""


@pytest.mark.asyncio
async def test_create_complaint_party_not_found(
    client: AsyncClient,
    mock_party_service: PartyService,
) -> None:
    """Test creating a complaint with non-existent party."""
    mock_party_service.get_party_by_id.side_effect = PartyNotFoundException(999)

    complaint_data = {
        "party_id": 999,
        "complaint_datetime": "2025-11-18T20:30:00",
        "description": "Noise complaint",
    }

    response = await client.post("/locations/1/complaints", json=complaint_data)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_complaint_location_mismatch(
    client: AsyncClient,
    mock_party_service: PartyService,
    sample_party: Party,
) -> None:
    """Test creating a complaint when party is at a different location than URL."""
    # Party is at location 1, but trying to create complaint at location 2
    mock_party_service.get_party_by_id.return_value = sample_party

    complaint_data = {
        "party_id": 1,
        "complaint_datetime": "2025-11-18T20:30:00",
        "description": "Noise complaint",
    }

    response = await client.post("/locations/2/complaints", json=complaint_data)

    assert response.status_code == 400
    data = response.json()
    message = data.get("detail", data.get("message", ""))
    assert "location" in str(message).lower()


# PUT /locations/{location_id}/complaints/{complaint_id} tests


@pytest.mark.asyncio
async def test_update_complaint_success(
    client: AsyncClient,
    mock_complaint_service: ComplaintService,
    mock_party_service: PartyService,
    sample_party: Party,
) -> None:
    """Test successfully updating a complaint."""
    updated_complaint = Complaint(
        id=1,
        location_id=1,
        complaint_datetime=datetime(2025, 11, 20, 23, 0, 0),
        description="Updated description",
    )
    mock_party_service.get_party_by_id.return_value = sample_party
    mock_complaint_service.update_complaint.return_value = updated_complaint

    update_data = {
        "party_id": 1,
        "complaint_datetime": "2025-11-20T23:00:00",
        "description": "Updated description",
    }

    response = await client.put("/locations/1/complaints/1", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["description"] == "Updated description"
    mock_party_service.get_party_by_id.assert_called_once_with(1)
    mock_complaint_service.update_complaint.assert_called_once()


@pytest.mark.asyncio
async def test_update_complaint_not_found(
    client: AsyncClient,
    mock_complaint_service: ComplaintService,
    mock_party_service: PartyService,
    sample_party: Party,
) -> None:
    """Test updating a non-existent complaint."""
    mock_party_service.get_party_by_id.return_value = sample_party
    mock_complaint_service.update_complaint.side_effect = ComplaintNotFoundException(
        999
    )

    update_data = {
        "party_id": 1,
        "complaint_datetime": "2025-11-20T23:00:00",
        "description": "Updated description",
    }

    response = await client.put("/locations/1/complaints/999", json=update_data)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_complaint_party_not_found(
    client: AsyncClient,
    mock_party_service: PartyService,
) -> None:
    """Test updating a complaint with non-existent party."""
    mock_party_service.get_party_by_id.side_effect = PartyNotFoundException(999)

    update_data = {
        "party_id": 999,
        "complaint_datetime": "2025-11-20T23:00:00",
        "description": "Updated description",
    }

    response = await client.put("/locations/1/complaints/1", json=update_data)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_complaint_location_mismatch(
    client: AsyncClient,
    mock_party_service: PartyService,
    sample_party: Party,
) -> None:
    """Test updating a complaint when party is at a different location than URL."""
    # Party is at location 1, but trying to update complaint at location 2
    mock_party_service.get_party_by_id.return_value = sample_party

    update_data = {
        "party_id": 1,
        "complaint_datetime": "2025-11-20T23:00:00",
        "description": "Updated description",
    }

    response = await client.put("/locations/2/complaints/1", json=update_data)

    assert response.status_code == 400
    data = response.json()
    message = data.get("detail", data.get("message", ""))
    assert "location" in str(message).lower()


# DELETE /locations/{location_id}/complaints/{complaint_id} tests


@pytest.mark.asyncio
async def test_delete_complaint_success(
    client: AsyncClient,
    mock_complaint_service: ComplaintService,
    sample_complaint: Complaint,
) -> None:
    """Test successfully deleting a complaint."""
    mock_complaint_service.delete_complaint.return_value = sample_complaint

    response = await client.delete("/locations/1/complaints/1")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["description"] == "Noise complaint"
    mock_complaint_service.delete_complaint.assert_called_once_with(1)


@pytest.mark.asyncio
async def test_delete_complaint_not_found(
    client: AsyncClient,
    mock_complaint_service: ComplaintService,
) -> None:
    """Test deleting a non-existent complaint."""
    mock_complaint_service.delete_complaint.side_effect = ComplaintNotFoundException(
        999
    )

    response = await client.delete("/locations/1/complaints/999")

    assert response.status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method,endpoint",
    [
        ("GET", "/locations/1/complaints"),
        ("POST", "/locations/1/complaints"),
        ("PUT", "/locations/1/complaints/1"),
        ("DELETE", "/locations/1/complaints/1"),
    ],
)
async def test_admin_authentication_required(
    unauthenticated_client: AsyncClient, method: str, endpoint: str
):
    """
    Parameterized test to verify all complaint routes require admin authentication.
    Tests that requests without authentication return 401 Unauthorized.
    """
    request_data = {
        "party_id": 1,
        "complaint_datetime": "2025-11-18T20:30:00",
        "description": "Test complaint",
    }

    if method == "GET":
        response = await unauthenticated_client.get(endpoint)
    elif method == "POST":
        response = await unauthenticated_client.post(endpoint, json=request_data)
    elif method == "PUT":
        response = await unauthenticated_client.put(endpoint, json=request_data)
    else:
        response = await unauthenticated_client.delete(endpoint)

    assert response.status_code == 401, (
        f"{method} {endpoint} should require authentication"
    )
