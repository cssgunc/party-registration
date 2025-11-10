from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import authenticate_admin
from src.core.database import get_session
from src.main import app
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.location.location_entity import LocationEntity
from src.modules.party.party_entity import PartyEntity
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference
from src.modules.user.user_model import User


@pytest_asyncio.fixture()
async def unauthenticated_client(test_async_session: AsyncSession):
    """Create an async test client WITHOUT authentication override."""

    async def override_get_session():
        yield test_async_session

    app.dependency_overrides[get_session] = override_get_session
    # Note: We do NOT override authenticate_admin here

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def client(test_async_session: AsyncSession):
    """Create an async test client with database session override."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_admin():
        return User(id=1, email="admin@test.com")

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_admin] = override_authenticate_admin

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
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
        hashed_password="hashed_password",
        role=AccountRole.STUDENT,
    )
    account_two = AccountEntity(
        id=2,
        email="test2@example.com",
        hashed_password="hashed_password",
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

    # Create students
    student_one = StudentEntity(
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student_two = StudentEntity(
        first_name="Jane",
        last_name="Smith",
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    test_async_session.add_all([student_one, student_two])
    await test_async_session.commit()

    return {"location_id": 1, "contact_one_id": 1, "contact_two_id": 2}


@pytest.mark.asyncio
async def test_get_parties_empty(client: AsyncClient):
    """Test GET /api/parties with no parties in database."""
    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    assert data["total_records"] == 0
    assert data["parties"] == []
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
            contact_two_id=sample_party_setup["contact_two_id"],
        )
        test_async_session.add(party)
    await test_async_session.commit()

    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    assert data["total_records"] == 5
    assert len(data["parties"]) == 5
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
        contact_two_id=sample_party_setup["contact_two_id"],
    )
    party2 = PartyEntity(
        party_datetime=party_datetime_2,
        location_id=sample_party_setup["location_id"],
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_id=sample_party_setup["contact_two_id"],
    )
    test_async_session.add_all([party1, party2])
    await test_async_session.commit()
    await test_async_session.refresh(party1)
    await test_async_session.refresh(party2)

    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    parties = data["parties"]

    # Verify we got the correct number of parties
    assert len(parties) == 2

    # Validate structure and content of each party
    for party in parties:
        # Check all required fields are present
        assert "id" in party
        assert "party_datetime" in party
        assert "location_id" in party
        assert "contact_one_id" in party
        assert "contact_two_id" in party

        # Validate field values match what we created
        assert party["location_id"] == sample_party_setup["location_id"]
        assert party["contact_one_id"] == sample_party_setup["contact_one_id"]
        assert party["contact_two_id"] == sample_party_setup["contact_two_id"]

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
            contact_two_id=sample_party_setup["contact_two_id"],
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
    assert len(page1_data["parties"]) == 5
    page1_ids = [p["id"] for p in page1_data["parties"]]

    # Request second page
    response = await client.get("/api/parties/?page_size=5&page_number=2")
    assert response.status_code == 200
    page2_data = response.json()

    # Verify page 2 content
    assert len(page2_data["parties"]) == 5
    page2_ids = [p["id"] for p in page2_data["parties"]]

    # Ensure no overlap between pages
    assert len(set(page1_ids) & set(page2_ids)) == 0

    # Verify all parties have correct structure and data
    for party in page1_data["parties"] + page2_data["parties"]:
        assert party["location_id"] == sample_party_setup["location_id"]
        assert party["contact_one_id"] == sample_party_setup["contact_one_id"]
        assert party["contact_two_id"] == sample_party_setup["contact_two_id"]
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
            contact_two_id=sample_party_setup["contact_two_id"],
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Test page 1
    response = await client.get("/api/parties/?page_number=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 25
    assert len(data["parties"]) == 10
    assert data["page_number"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 3

    # Test page 2
    response = await client.get("/api/parties/?page_number=2&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 25
    assert len(data["parties"]) == 10
    assert data["page_number"] == 2
    assert data["total_pages"] == 3

    # Test page 3 (partial page)
    response = await client.get("/api/parties/?page_number=3&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 25
    assert len(data["parties"]) == 5
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
            contact_two_id=sample_party_setup["contact_two_id"],
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Request page 10 when only 1 page exists
    response = await client.get("/api/parties/?page_number=10&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 5
    assert len(data["parties"]) == 0  # No data on this page
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
            contact_two_id=sample_party_setup["contact_two_id"],
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Request page size of 3
    response = await client.get("/api/parties/?page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 10
    assert len(data["parties"]) == 3
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
        contact_two_id=sample_party_setup["contact_two_id"],
    )
    test_async_session.add(party)
    await test_async_session.commit()
    await test_async_session.refresh(party)

    # Fetch the party
    response = await client.get(f"/api/parties/{party.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == party.id
    assert data["location_id"] == sample_party_setup["location_id"]
    assert data["contact_one_id"] == sample_party_setup["contact_one_id"]
    assert data["contact_two_id"] == sample_party_setup["contact_two_id"]


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
        contact_two_id=sample_party_setup["contact_two_id"],
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
            contact_two_id=sample_party_setup["contact_two_id"],
        )
        test_async_session.add(party)
    await test_async_session.commit()

    # Get all parties
    response = await client.get("/api/parties/")
    assert response.status_code == 200
    initial_data = response.json()
    assert initial_data["total_records"] == 3

    # Delete one party
    party_to_delete = initial_data["parties"][0]["id"]
    response = await client.delete(f"/api/parties/{party_to_delete}")
    assert response.status_code == 200

    # Verify count decreased
    response = await client.get("/api/parties/")
    assert response.status_code == 200
    final_data = response.json()
    assert final_data["total_records"] == 2
    assert len(final_data["parties"]) == 2

    # Verify deleted party is not in the list
    party_ids = [p["id"] for p in final_data["parties"]]
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
