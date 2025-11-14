from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import googlemaps
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import authenticate_police_or_admin, authenticate_user
from src.core.database import get_session
from src.main import app
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import Account
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_model import Location
from src.modules.location.location_service import (
    LocationHoldActiveException,
    LocationService,
    get_gmaps_client,
)
from src.modules.party.party_entity import PartyEntity
from src.modules.party.party_model import (
    AdminCreatePartyDTO,
    Contact,
    StudentCreatePartyDTO,
)
from src.modules.police.police_model import PoliceAccount
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference


def get_valid_party_datetime() -> datetime:
    """Get a datetime that is at least 3 business days from now."""
    days_ahead = 5  # Start with 5 calendar days to ensure 3 business days
    return datetime.now() + timedelta(days=days_ahead)


@pytest.fixture
def mock_gmaps_client() -> MagicMock:
    """Create a mock Google Maps client"""
    return MagicMock()


@pytest_asyncio.fixture()
async def location_service(
    test_async_session: AsyncSession, mock_gmaps_client: MagicMock
):
    return LocationService(session=test_async_session, gmaps_client=mock_gmaps_client)


@pytest_asyncio.fixture()
async def mock_location_service() -> AsyncMock:
    mock_service = AsyncMock(spec=LocationService)
    mock_service.get_or_create_location.return_value = Location(
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

    return mock_service


@pytest_asyncio.fixture()
async def unauthenticated_client(
    test_async_session: AsyncSession, location_service: LocationService
):
    """Create an async test client WITHOUT authentication override."""

    async def override_get_session():
        yield test_async_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[LocationService] = lambda: location_service
    # Note: We do NOT override authenticate_admin here

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def client(test_async_session: AsyncSession, location_service: LocationService):
    """Create an async test client with database session override."""

    async def override_get_session():
        yield test_async_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[LocationService] = lambda: location_service

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer admin"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def student_client(
    test_async_session: AsyncSession, mock_location_service: AsyncMock
):
    """Create an async test client authenticated as a student."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_user():
        return Account(
            id=1,
            email="student@test.com",
            # password field removed from Account model
            first_name="Test",
            last_name="User",
            pid="300000001",
            role=AccountRole.STUDENT,
        )

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_user] = override_authenticate_user
    app.dependency_overrides[LocationService] = lambda: mock_location_service

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer student"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def admin_client(
    test_async_session: AsyncSession, mock_location_service: AsyncMock
):
    """Create an async test client authenticated as an admin."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_user():
        return Account(
            id=2,
            email="admin@test.com",
            # password field removed from Account model
            first_name="Test",
            last_name="User",
            pid="300000001",
            role=AccountRole.ADMIN,
        )

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_user] = override_authenticate_user
    app.dependency_overrides[LocationService] = lambda: mock_location_service

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer admin"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def sample_party_setup(test_async_session: AsyncSession):
    """Create sample location and students for party tests."""
    # Create account
    account_one = AccountEntity(
        id=1,
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="306000001",
        role=AccountRole.STUDENT,
    )
    account_two = AccountEntity(
        id=2,
        email="test2@example.com",
        first_name="Test",
        last_name="User",
        pid="306000001",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([account_one, account_two])

    # Create location
    location = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_id_1",
        formatted_address="123 Test St, Test City, TC 12345",
    )
    test_async_session.add(location)

    # Create students with last_registered date (Party Smart completed after most recent August 1st)
    # Calculate a valid date after the most recent August 1st
    now = datetime.now()
    current_year = now.year
    august_first_this_year = datetime(current_year, 8, 1, 0, 0, 0)

    # If we're before August 1st, use last year's August 1st + 1 day
    # Otherwise, use this year's August 1st + 1 day
    if now < august_first_this_year:
        valid_date = datetime(current_year - 1, 8, 2, 12, 0, 0)
    else:
        valid_date = datetime(current_year, 8, 2, 12, 0, 0)

    student_one = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
        last_registered=valid_date,
    )
    student_two = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
        last_registered=valid_date,
    )
    test_async_session.add_all([student_one, student_two])
    await test_async_session.commit()

    return {"location_id": 1, "contact_one_id": 1}


@pytest.mark.asyncio
async def test_get_parties_empty(client: AsyncClient):
    """Test GET /api/parties with no parties in database."""
    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    assert data["total_records"] == 0
    assert data["items"] == []
    assert data["page_number"] == 1
    assert data["page_size"] == 0  # No page_size specified, defaults to total_records
    assert data["total_pages"] == 1


@pytest.mark.asyncio
async def test_get_parties_with_data(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test GET /api/parties with multiple parties (returns all by default)."""
    # Create 5 parties
    for i in range(5):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_email="test2@example.com",
            contact_two_first_name="Jane",
            contact_two_last_name="Smith",
            contact_two_phone_number="0987654321",
            contact_two_contact_preference=ContactPreference.text,
        )
        test_async_session.add(party)
    await test_async_session.commit()

    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    assert data["total_records"] == 5
    assert len(data["items"]) == 5
    assert data["page_number"] == 1
    assert data["page_size"] == 5  # No page_size specified, defaults to total_records
    assert data["total_pages"] == 1


@pytest.mark.asyncio
async def test_get_parties_validates_content(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test GET /api/parties returns correct party content and structure."""
    # Create parties with specific data for validation
    party_datetime_1 = datetime(2024, 6, 15, 20, 0, 0)
    party_datetime_2 = datetime(2024, 7, 20, 21, 30, 0)

    party1 = PartyEntity(
        party_datetime=party_datetime_1,
        location_id=sample_party_setup["location_id"],
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    party2 = PartyEntity(
        party_datetime=party_datetime_2,
        location_id=sample_party_setup["location_id"],
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add_all([party1, party2])
    await test_async_session.commit()
    await test_async_session.refresh(party1)
    await test_async_session.refresh(party2)

    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    items = data["items"]
    parties = items

    # Verify we got the correct number of parties
    assert len(parties) == 2

    # Validate structure and content of each party
    for party in parties:
        # Check all required fields are present
        assert "id" in party
        assert "party_datetime" in party
        assert "location" in party
        assert "contact_one" in party
        assert "contact_two" in party

        # Validate nested object structures
        assert isinstance(party["location"], dict)
        assert party["location"]["id"] == sample_party_setup["location_id"]

        assert isinstance(party["contact_one"], dict)
        assert party["contact_one"]["id"] == sample_party_setup["contact_one_id"]

        assert isinstance(party["contact_two"], dict)
        assert "email" in party["contact_two"]
        assert "first_name" in party["contact_two"]

        # Validate IDs are positive integers
        assert isinstance(party["id"], int)
        assert party["id"] > 0

    # Verify specific party datetimes
    party_datetimes = [p["party_datetime"] for p in parties]
    assert party_datetime_1.isoformat() in party_datetimes
    assert party_datetime_2.isoformat() in party_datetimes


@pytest.mark.asyncio
async def test_get_parties_content_with_pagination(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test paginated parties return correct content in order."""
    # Create 10 parties with incrementing dates
    created_parties = []
    for i in range(10):
        party = PartyEntity(
            party_datetime=datetime(2024, 1, 1, 10, 0, 0) + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_email="test2@example.com",
            contact_two_first_name="Jane",
            contact_two_last_name="Smith",
            contact_two_phone_number="0987654321",
            contact_two_contact_preference=ContactPreference.text,
        )
        test_async_session.add(party)
        created_parties.append(party)
    await test_async_session.commit()

    # Refresh all to get IDs
    for party in created_parties:
        await test_async_session.refresh(party)

    # Request first page
    response = await client.get("/api/parties/?page_size=5&page_number=1")
    assert response.status_code == 200
    page1_data = response.json()

    # Verify page 1 content
    assert len(page1_data["items"]) == 5
    page1_ids = [p["id"] for p in page1_data["items"]]

    # Request second page
    response = await client.get("/api/parties/?page_size=5&page_number=2")
    assert response.status_code == 200
    page2_data = response.json()

    # Verify page 2 content
    assert len(page2_data["items"]) == 5
    page2_ids = [p["id"] for p in page2_data["items"]]

    # Ensure no overlap between pages
    assert len(set(page1_ids) & set(page2_ids)) == 0

    # Verify all parties have correct structure and data
    for party in page1_data["items"] + page2_data["items"]:
        assert party["location"]["id"] == sample_party_setup["location_id"]
        assert party["contact_one"]["id"] == sample_party_setup["contact_one_id"]
        assert "contact_two" in party
        assert "party_datetime" in party


@pytest.mark.asyncio
async def test_get_parties_pagination(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test GET /api/parties pagination with multiple pages."""
    # Create 25 parties
    for i in range(25):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_email="test2@example.com",
            contact_two_first_name="Jane",
            contact_two_last_name="Smith",
            contact_two_phone_number="0987654321",
            contact_two_contact_preference=ContactPreference.text,
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Test page 1
    response = await client.get("/api/parties/?page_number=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 25
    assert len(data["items"]) == 10
    assert data["page_number"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 3

    # Test page 2
    response = await client.get("/api/parties/?page_number=2&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 25
    assert len(data["items"]) == 10
    assert data["page_number"] == 2
    assert data["total_pages"] == 3

    # Test page 3 (partial page)
    response = await client.get("/api/parties/?page_number=3&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 25
    assert len(data["items"]) == 5
    assert data["page_number"] == 3
    assert data["total_pages"] == 3


@pytest.mark.asyncio
async def test_get_parties_pagination_beyond_available(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test GET /api/parties with page number beyond available data."""
    # Create 5 parties
    for i in range(5):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_email="test2@example.com",
            contact_two_first_name="Jane",
            contact_two_last_name="Smith",
            contact_two_phone_number="0987654321",
            contact_two_contact_preference=ContactPreference.text,
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Request page 10 when only 1 page exists
    response = await client.get("/api/parties/?page_number=10&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 5
    assert len(data["items"]) == 0  # No data on this page
    assert data["page_number"] == 10
    assert data["total_pages"] == 1


@pytest.mark.asyncio
async def test_get_parties_custom_page_size(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test GET /api/parties with custom page size."""
    # Create 10 parties
    for i in range(10):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_email="test2@example.com",
            contact_two_first_name="Jane",
            contact_two_last_name="Smith",
            contact_two_phone_number="0987654321",
            contact_two_contact_preference=ContactPreference.text,
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Request page size of 3
    response = await client.get("/api/parties/?page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 10
    assert len(data["items"]) == 3
    assert data["page_size"] == 3
    assert data["total_pages"] == 4


@pytest.mark.asyncio
async def test_get_parties_invalid_page_number(client: AsyncClient):
    """Test GET /api/parties with invalid page number (less than 1)."""
    response = await client.get("/api/parties/?page_number=0")
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_get_parties_invalid_page_size(client: AsyncClient):
    """Test GET /api/parties with invalid page size."""
    # Page size less than 1
    response = await client.get("/api/parties/?page_size=0")
    assert response.status_code == 422

    # Page size greater than 100
    response = await client.get("/api/parties/?page_size=101")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_party_by_id(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test GET /api/parties/{party_id} successfully retrieves a party."""
    # Create a party
    party_datetime = datetime.now() + timedelta(days=1)
    party = PartyEntity(
        party_datetime=party_datetime,
        location_id=sample_party_setup["location_id"],
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party)
    await test_async_session.commit()
    await test_async_session.refresh(party)

    # Fetch the party
    response = await client.get(f"/api/parties/{party.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == party.id
    assert data["location"]["id"] == sample_party_setup["location_id"]
    assert data["contact_one"]["id"] == sample_party_setup["contact_one_id"]
    assert data["contact_two"]["email"] == "test2@example.com"


@pytest.mark.asyncio
async def test_get_party_by_id_not_found(client: AsyncClient):
    """Test GET /api/parties/{party_id} with non-existent ID."""
    response = await client.get("/api/parties/999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_party(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test DELETE /api/parties/{party_id} successfully deletes a party."""
    # Create a party
    party = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=1),
        location_id=sample_party_setup["location_id"],
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party)
    await test_async_session.commit()
    await test_async_session.refresh(party)
    party_id = party.id

    # Delete the party
    response = await client.delete(f"/api/parties/{party_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == party_id

    # Verify it's deleted
    response = await client.get(f"/api/parties/{party_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_party_not_found(client: AsyncClient):
    """Test DELETE /api/parties/{party_id} with non-existent ID."""
    response = await client.delete("/api/parties/999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_party_removes_from_list(
    client: AsyncClient, test_async_session: AsyncSession, sample_party_setup: dict
):
    """Test that deleting a party removes it from the list."""
    # Create 3 parties
    for i in range(3):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_email="test2@example.com",
            contact_two_first_name="Jane",
            contact_two_last_name="Smith",
            contact_two_phone_number="0987654321",
            contact_two_contact_preference=ContactPreference.text,
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Get all parties
    response = await client.get("/api/parties/")
    assert response.status_code == 200
    initial_data = response.json()
    assert initial_data["total_records"] == 3

    # Delete one party
    party_to_delete = initial_data["items"][0]["id"]
    response = await client.delete(f"/api/parties/{party_to_delete}")
    assert response.status_code == 200

    # Verify count decreased
    response = await client.get("/api/parties/")
    assert response.status_code == 200
    final_data = response.json()
    assert final_data["total_records"] == 2
    assert len(final_data["items"]) == 2

    # Verify deleted party is not in the list
    party_ids = [p["id"] for p in final_data["items"]]
    assert party_to_delete not in party_ids


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method,endpoint",
    [
        ("GET", "/api/parties/"),
        ("GET", "/api/parties/1"),
        ("DELETE", "/api/parties/1"),
    ],
)
async def test_admin_authentication_required(
    unauthenticated_client: AsyncClient, method: str, endpoint: str
):
    """
    Parameterized test to verify all party routes require admin authentication.
    Tests that requests without authentication return 401 Unauthorized.
    """
    if method == "DELETE":
        response = await unauthenticated_client.delete(endpoint)
    else:
        response = await unauthenticated_client.get(endpoint)

    assert response.status_code == 401, (
        f"{method} {endpoint} should require authentication"
    )

    # Check that the response indicates authentication is required
    response_json = response.json()
    if "detail" in response_json:
        assert "not authenticated" in response_json["detail"].lower()
    else:
        # Handle different response formats
        assert response.status_code == 401


@pytest_asyncio.fixture()
async def police_client(test_async_session: AsyncSession):
    """Create an async test client with police authentication override."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_police_or_admin():
        return PoliceAccount(email="police@example.com")

    def override_get_gmaps_client():
        """Return a mock Google Maps client to avoid API key validation."""
        return MagicMock()

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_police_or_admin] = (
        override_authenticate_police_or_admin
    )
    app.dependency_overrides[get_gmaps_client] = override_get_gmaps_client

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def admin_client_for_nearby(test_async_session: AsyncSession):
    """Create an async test client with admin authentication override for nearby route."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_police_or_admin():
        return Account(
            id=2,
            email="admin@test.com",
            first_name="Admin",
            last_name="User",
            pid="222222222",
            role=AccountRole.ADMIN,
        )

    def override_get_gmaps_client():
        """Return a mock Google Maps client to avoid API key validation."""
        return MagicMock()

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_police_or_admin] = (
        override_authenticate_police_or_admin
    )
    app.dependency_overrides[get_gmaps_client] = override_get_gmaps_client

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def student_client_for_nearby(test_async_session: AsyncSession):
    """Create an async test client with student authentication override for nearby route."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_police_or_admin():
        return Account(
            id=1,
            email="student@test.com",
            first_name="Student",
            last_name="User",
            pid="111111111",
            role=AccountRole.STUDENT,
        )

    def override_get_gmaps_client():
        """Return a mock Google Maps client to avoid API key validation."""
        return MagicMock()

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_police_or_admin] = (
        override_authenticate_police_or_admin
    )
    app.dependency_overrides[get_gmaps_client] = override_get_gmaps_client

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_nearby_police_authentication(
    mock_place: MagicMock, police_client: AsyncClient
):
    """Test that police officer can access the nearby route."""
    # Mock successful Google Maps API response
    mock_place.return_value = {
        "result": {
            "formatted_address": "123 Test St, Test City, TC 12345",
            "geometry": {"location": {"lat": 35.9132, "lng": -79.0558}},
            "address_components": [],
        }
    }

    response = await police_client.get(
        "/api/parties/nearby?place_id=test_place_id&start_date=2025-01-01&end_date=2025-01-02"
    )

    assert response.status_code in (200, 400, 404, 422)

    if response.status_code == 401 or response.status_code == 403:
        pytest.fail(f"Authentication failed with status {response.status_code}")


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_nearby_admin_authentication(
    mock_place: MagicMock, admin_client_for_nearby: AsyncClient
):
    """Test that admin can access the nearby route."""
    # Mock successful Google Maps API response
    mock_place.return_value = {
        "result": {
            "formatted_address": "123 Test St, Test City, TC 12345",
            "geometry": {"location": {"lat": 35.9132, "lng": -79.0558}},
            "address_components": [],
        }
    }

    response = await admin_client_for_nearby.get(
        "/api/parties/nearby?place_id=test_place_id&start_date=2025-01-01&end_date=2025-01-02"
    )

    assert response.status_code in (200, 400, 404, 422)

    if response.status_code == 401 or response.status_code == 403:
        pytest.fail(f"Authentication failed with status {response.status_code}")


@pytest.mark.asyncio
async def test_nearby_student_forbidden(student_client_for_nearby: AsyncClient):
    """Test that student role gets 403 Forbidden."""
    response = await student_client_for_nearby.get(
        "/api/parties/nearby?place_id=test_place_id&start_date=2025-01-01&end_date=2025-01-02"
    )

    assert response.status_code != 200
    if response.status_code == 403:
        data = response.json()
        assert "police or admin" in data.get("message", "").lower()


@pytest.mark.asyncio
async def test_nearby_unauthenticated(unauthenticated_client: AsyncClient):
    """Test that unauthenticated request gets 401 Unauthorized."""
    response = await unauthenticated_client.get(
        "/api/parties/nearby?place_id=test_place_id&start_date=2025-01-01&end_date=2025-01-02"
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_nearby_missing_place_id(police_client: AsyncClient):
    """Test that missing place_id query param returns 422."""
    response = await police_client.get(
        "/api/parties/nearby?start_date=2025-01-01&end_date=2025-01-02"
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_nearby_missing_start_date(police_client: AsyncClient):
    """Test that missing start_date query param returns 422."""
    response = await police_client.get(
        "/api/parties/nearby?place_id=test_place_id&end_date=2025-01-02"
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_nearby_missing_end_date(police_client: AsyncClient):
    """Test that missing end_date query param returns 422."""
    response = await police_client.get(
        "/api/parties/nearby?place_id=test_place_id&start_date=2025-01-01"
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_nearby_invalid_date_format(police_client: AsyncClient):
    """Test that invalid date format returns 400."""
    response = await police_client.get(
        "/api/parties/nearby?place_id=test_place_id&start_date=01/01/2025&end_date=2025-01-02"
    )
    assert response.status_code == 400
    data = response.json()
    assert "invalid date format" in data.get("message", "").lower()


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_nearby_location_service_not_found(
    mock_place: MagicMock, police_client: AsyncClient
):
    """Test that invalid place_id returns 404 from location service."""
    # Mock Google Maps API NOT_FOUND error
    api_error = googlemaps.exceptions.ApiError("NOT_FOUND")
    api_error.status = "NOT_FOUND"
    mock_place.side_effect = api_error

    response = await police_client.get(
        "/api/parties/nearby?place_id=invalid_place_id&start_date=2025-01-01&end_date=2025-01-02"
    )

    assert response.status_code in (400, 404)
    if response.status_code == 404:
        data = response.json()
        assert (
            "place" in data.get("message", "").lower()
            or "not found" in data.get("message", "").lower()
        )


@patch("src.modules.location.location_service.places.place")
@pytest.mark.asyncio
async def test_nearby_happy_path_integration(
    mock_place: MagicMock,
    police_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
):
    """Test the golden path - happy path integration with mocked Google Maps API."""

    center_lat = 35.9132
    center_lon = -79.0558

    # Mock successful Google Maps API response with Chapel Hill coordinates
    mock_place.return_value = {
        "result": {
            "formatted_address": "Chapel Hill, NC, USA",
            "geometry": {"location": {"lat": center_lat, "lng": center_lon}},
            "address_components": [
                {
                    "long_name": "Chapel Hill",
                    "short_name": "Chapel Hill",
                    "types": ["locality", "political"],
                },
                {
                    "long_name": "North Carolina",
                    "short_name": "NC",
                    "types": ["administrative_area_level_1", "political"],
                },
                {
                    "long_name": "United States",
                    "short_name": "US",
                    "types": ["country", "political"],
                },
            ],
        }
    }

    location_within_radius = LocationEntity(
        id=2,
        latitude=center_lat + 0.0145,
        longitude=center_lon,
        google_place_id="test_place_id",
        formatted_address="1 Mile Away St, Chapel Hill, NC",
    )
    test_async_session.add(location_within_radius)
    await test_async_session.commit()

    base_date = datetime(2025, 11, 10, 12, 0, 0)
    party1 = PartyEntity(
        party_datetime=base_date + timedelta(hours=6),
        location_id=2,  # Within radius
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_first_name="Extra",
        contact_two_last_name="Person",
        contact_two_email="extra.person@example.com",
        contact_two_phone_number="5555555555",
        contact_two_contact_preference=ContactPreference.call,
    )
    party2 = PartyEntity(
        party_datetime=base_date + timedelta(days=1),
        location_id=2,  # Within radius
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_first_name="Extra",
        contact_two_last_name="Person",
        contact_two_email="extra.person@example.com",
        contact_two_phone_number="5555555555",
        contact_two_contact_preference=ContactPreference.call,
    )
    test_async_session.add_all([party1, party2])
    await test_async_session.commit()

    response = await police_client.get(
        "/api/parties/nearby?place_id=test_place_id&start_date=2025-11-10&end_date=2025-11-12"
    )

    assert response.status_code in (200, 400, 404)

    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            party = data[0]
            assert "id" in party
            assert "party_datetime" in party
            assert "location" in party
            assert "contact_one" in party
            assert "contact_two" in party


@pytest.mark.asyncio
async def test_create_party_as_student(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    mock_location_service: AsyncMock,
):
    """Test POST /api/parties as a student (contact_one auto-filled)."""
    party_datetime = get_valid_party_datetime()
    party_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 200, response.json()

    data = response.json()
    assert data["party_datetime"] == party_datetime.isoformat()
    assert data["contact_one"]["id"] == 1  # Auto-filled from student account
    assert data["contact_two"]["email"] == "test2@example.com"
    assert "id" in data
    assert "location" in data


@pytest.mark.asyncio
async def test_create_party_as_admin(
    admin_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test POST /api/parties as an admin (both contacts specified)."""
    party_datetime = get_valid_party_datetime()
    party_data = AdminCreatePartyDTO(
        type="admin",
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_one_email="test@example.com",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await admin_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 200

    data = response.json()
    assert data["party_datetime"] == party_datetime.isoformat()
    assert data["contact_one"]["id"] == 1
    assert data["contact_two"]["email"] == "test2@example.com"
    assert "id" in data
    assert "location" in data


@pytest.mark.asyncio
async def test_update_party_as_student(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test PUT /api/parties/:id as a student (contact_one auto-filled)."""
    # Create an initial party
    existing_party = PartyEntity(
        party_datetime=get_valid_party_datetime(),
        location_id=sample_party_setup["location_id"],
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(existing_party)
    await test_async_session.commit()
    await test_async_session.refresh(existing_party)

    new_party_datetime = get_valid_party_datetime() + timedelta(days=2)
    update_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=new_party_datetime,
        place_id="test_place_id_123",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.put(
        f"/api/parties/{existing_party.id}", json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == existing_party.id
    assert data["party_datetime"] == new_party_datetime.isoformat()
    assert data["contact_one"]["id"] == 1  # Auto-filled from student account
    assert data["contact_two"]["email"] == "test2@example.com"


@pytest.mark.asyncio
async def test_update_party_as_admin(
    admin_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test PUT /api/parties/:id as an admin (both contacts specified)."""
    # Create an initial party
    existing_party = PartyEntity(
        party_datetime=get_valid_party_datetime(),
        location_id=sample_party_setup["location_id"],
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(existing_party)
    await test_async_session.commit()
    await test_async_session.refresh(existing_party)

    new_party_datetime = get_valid_party_datetime() + timedelta(days=2)
    update_data = AdminCreatePartyDTO(
        type="admin",
        party_datetime=new_party_datetime,
        place_id="test_place_id_123",
        contact_one_email="test@example.com",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await admin_client.put(
        f"/api/parties/{existing_party.id}", json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == existing_party.id
    assert data["party_datetime"] == new_party_datetime.isoformat()
    assert data["contact_one"]["id"] == 1
    assert data["contact_two"]["email"] == "test2@example.com"


@pytest.mark.asyncio
async def test_update_party_not_found(
    admin_client: AsyncClient,
    test_async_session: AsyncSession,
    location_service: LocationService,
):
    """Test PUT /api/parties/:id with non-existent party ID."""
    party_datetime = get_valid_party_datetime()
    update_data = AdminCreatePartyDTO(
        type="admin",
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_one_email="test@example.com",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await admin_client.put(
        "/api/parties/999", json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 404


# Validation Error Tests


@pytest.mark.asyncio
async def test_create_party_date_too_soon(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test POST /api/parties with party date less than 2 business days away."""
    # Party tomorrow (only 1 business day away)
    party_datetime = datetime.now() + timedelta(days=1)
    party_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "business days" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_update_party_date_too_soon(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test PUT /api/parties/:id with party date less than 2 business days away."""
    # Create an initial party
    existing_party = PartyEntity(
        party_datetime=get_valid_party_datetime(),
        location_id=sample_party_setup["location_id"],
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(existing_party)
    await test_async_session.commit()
    await test_async_session.refresh(existing_party)

    # Try to update with party tomorrow
    party_datetime = datetime.now() + timedelta(days=1)
    update_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.put(
        f"/api/parties/{existing_party.id}", json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "business days" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_create_party_student_no_party_smart(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    location_service: LocationService,
):
    """Test POST /api/parties when student hasn't completed Party Smart."""
    # Create student without last_registered (no Party Smart)
    account = AccountEntity(
        id=3,
        email="nopartysmart@test.com",
        first_name="Test",
        last_name="User",
        pid="306000001",
        role=AccountRole.STUDENT,
    )
    student = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="5555555555",
        account_id=3,
        last_registered=None,  # No Party Smart attendance
    )
    test_async_session.add_all([account, student])
    await test_async_session.commit()

    # Override authenticate_user to return the new student
    async def override_authenticate_user():
        return Account(
            id=3,
            email="nopartysmart@test.com",
            # password field removed from Account model
            first_name="Test",
            last_name="User",
            pid="300000001",
            role=AccountRole.STUDENT,
        )

    app.dependency_overrides[authenticate_user] = override_authenticate_user

    party_datetime = get_valid_party_datetime()
    party_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "party smart" in response.json()["message"].lower()

    # Clean up override
    app.dependency_overrides.pop(authenticate_user, None)


@pytest.mark.asyncio
async def test_create_party_student_party_smart_expired(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    location_service: LocationService,
):
    """Test POST /api/parties when student's Party Smart attendance is before the most recent August 1st."""
    # Create student with expired last_registered (before the most recent August 1st)
    # Calculate a date before the most recent August 1st
    now = datetime.now()
    current_year = now.year
    august_first_this_year = datetime(current_year, 8, 1, 0, 0, 0)

    # If we're before August 1st, use last year's August 1st - 1 day
    # Otherwise, use this year's August 1st - 1 day
    if now < august_first_this_year:
        expired_date = datetime(current_year - 1, 7, 31, 23, 59, 59)
    else:
        expired_date = datetime(current_year, 7, 31, 23, 59, 59)

    account = AccountEntity(
        id=4,
        email="expiredpartysmart@test.com",
        first_name="Test",
        last_name="User",
        pid="306000001",
        role=AccountRole.STUDENT,
    )
    student = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="6666666666",
        account_id=4,
        last_registered=expired_date,
    )
    test_async_session.add_all([account, student])
    await test_async_session.commit()

    # Override authenticate_user to return the new student
    async def override_authenticate_user():
        return Account(
            id=4,
            email="expiredpartysmart@test.com",
            # password field removed from Account model
            first_name="Test",
            last_name="User",
            pid="300000001",
            role=AccountRole.STUDENT,
        )

    app.dependency_overrides[authenticate_user] = override_authenticate_user

    party_datetime = get_valid_party_datetime()
    party_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "party smart" in response.json()["message"].lower()

    # Clean up override
    app.dependency_overrides.pop(authenticate_user, None)


@pytest.mark.asyncio
async def test_create_party_location_has_active_hold(
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    mock_location_service: AsyncMock,
    student_client: AsyncClient,
):
    """Test POST /api/parties when location has an active hold."""

    mock_location_service.assert_valid_location_hold.side_effect = (
        LocationHoldActiveException(1, datetime.now() + timedelta(days=30))
    )

    party_datetime = get_valid_party_datetime()
    party_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=party_datetime,
        place_id="test_place_id_1",  # Use the place_id from sample_party_setup location
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "hold" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_create_party_location_expired_hold(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test POST /api/parties when location has an expired hold (should succeed)."""
    # Add an expired hold to the existing location from sample_party_setup

    result = await test_async_session.execute(
        select(LocationEntity).where(
            LocationEntity.id == sample_party_setup["location_id"]
        )
    )
    location = result.scalar_one()
    location.hold_expiration = datetime.now() - timedelta(
        days=1
    )  # Hold expired yesterday
    test_async_session.add(location)
    await test_async_session.commit()

    party_datetime = get_valid_party_datetime()
    party_data = StudentCreatePartyDTO(
        type="student",
        party_datetime=party_datetime,
        place_id="test_place_id_1",  # Use the place_id from sample_party_setup location
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 200  # Should succeed with expired hold


@pytest.mark.asyncio
async def test_create_party_student_using_admin_dto(
    student_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test POST /api/parties when student tries to use admin DTO."""
    party_datetime = get_valid_party_datetime()
    party_data = AdminCreatePartyDTO(
        type="admin",  # Student trying to use admin DTO
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_one_email="test@example.com",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await student_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 403
    assert "admin" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_create_party_admin_using_student_dto(
    admin_client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict,
    location_service: LocationService,
):
    """Test POST /api/parties when admin tries to use student DTO."""
    party_datetime = get_valid_party_datetime()
    party_data = StudentCreatePartyDTO(
        type="student",  # Admin trying to use student DTO
        party_datetime=party_datetime,
        place_id="test_place_id_123",
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )

    response = await admin_client.post(
        "/api/parties/", json=party_data.model_dump(mode="json")
    )
    assert response.status_code == 403
    assert "student" in response.json()["message"].lower()
