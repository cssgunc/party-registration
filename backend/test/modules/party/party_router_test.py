import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from src.main import app
from src.core.database import get_session
from src.core.authentication import authenticate_admin
from src.modules.party.party_entity import PartyEntity
from src.modules.location.location_entity import LocationEntity
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.user.user_model import User


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
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def sample_party_setup(test_async_session: AsyncSession):
    """Create sample location and students for party tests."""
    # Create account
    account = AccountEntity(
        id=1,
        email="test@example.com",
        hashed_password="hashed_password",
        role=AccountRole.STUDENT
    )
    test_async_session.add(account)

    # Create location
    location = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_id_1",
        formatted_address="123 Test St, Test City, TC 12345"
    )
    test_async_session.add(location)

    # Create students
    student_one = StudentEntity(
        id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
        account_id=1
    )
    student_two = StudentEntity(
        id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
        phone_number="0987654321",
        account_id=1
    )
    test_async_session.add_all([student_one, student_two])
    await test_async_session.commit()

    return {
        "location_id": 1,
        "contact_one_id": 1,
        "contact_two_id": 2
    }


@pytest.mark.asyncio
async def test_get_parties_empty(client: AsyncClient):
    """Test GET /api/parties with no parties in database."""
    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    assert data["total_records"] == 0
    assert data["parties"] == []
    assert data["page_number"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 0


@pytest.mark.asyncio
async def test_get_parties_with_data(
    client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict
):
    """Test GET /api/parties with multiple parties."""
    # Create 5 parties
    for i in range(5):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_id=sample_party_setup["contact_two_id"]
        )
        test_async_session.add(party)
    await test_async_session.commit()

    response = await client.get("/api/parties/")
    assert response.status_code == 200

    data = response.json()
    assert data["total_records"] == 5
    assert len(data["parties"]) == 5
    assert data["page_number"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 1


@pytest.mark.asyncio
async def test_get_parties_pagination(
    client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict
):
    """Test GET /api/parties pagination with multiple pages."""
    # Create 25 parties
    for i in range(25):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_id=sample_party_setup["contact_two_id"]
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
    client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict
):
    """Test GET /api/parties with page number beyond available data."""
    # Create 5 parties
    for i in range(5):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_id=sample_party_setup["contact_two_id"]
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
    client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict
):
    """Test GET /api/parties with custom page size."""
    # Create 10 parties
    for i in range(10):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_id=sample_party_setup["contact_two_id"]
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
    client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict
):
    """Test GET /api/parties/{party_id} successfully retrieves a party."""
    # Create a party
    party_datetime = datetime.now() + timedelta(days=1)
    party = PartyEntity(
        party_datetime=party_datetime,
        location_id=sample_party_setup["location_id"],
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_id=sample_party_setup["contact_two_id"]
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
    client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict
):
    """Test DELETE /api/parties/{party_id} successfully deletes a party."""
    # Create a party
    party = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=1),
        location_id=sample_party_setup["location_id"],
        contact_one_id=sample_party_setup["contact_one_id"],
        contact_two_id=sample_party_setup["contact_two_id"]
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
    client: AsyncClient,
    test_async_session: AsyncSession,
    sample_party_setup: dict
):
    """Test that deleting a party removes it from the list."""
    # Create 3 parties
    for i in range(3):
        party = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=i),
            location_id=sample_party_setup["location_id"],
            contact_one_id=sample_party_setup["contact_one_id"],
            contact_two_id=sample_party_setup["contact_two_id"]
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
