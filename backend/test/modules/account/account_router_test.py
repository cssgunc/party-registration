import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import authenticate_admin
from src.core.database import get_session
from src.main import app
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_model import Account
from src.modules.police.police_entity import PoliceEntity


@pytest_asyncio.fixture()
async def unauthenticated_client(test_async_session: AsyncSession):
    """Create an async test client WITHOUT authentication override."""

    async def override_get_session():
        yield test_async_session

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def client(test_async_session: AsyncSession):
    """Create an async test client with admin authentication override."""

    async def override_get_session():
        yield test_async_session

    async def override_authenticate_admin():
        return Account(
            id=999,
            email="admin@test.com",
            first_name="Admin",
            last_name="User",
            pid="999999999",
            role=AccountRole.ADMIN,
        )

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[authenticate_admin] = override_authenticate_admin

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def sample_accounts(test_async_session: AsyncSession) -> list[AccountEntity]:
    """Create sample accounts with different roles for testing."""
    accounts = [
        AccountEntity(
            email="student1@example.com",
            first_name="Student",
            last_name="One",
            pid="111111111",
            role=AccountRole.STUDENT,
        ),
        AccountEntity(
            email="student2@example.com",
            first_name="Student",
            last_name="Two",
            pid="222222222",
            role=AccountRole.STUDENT,
        ),
        AccountEntity(
            email="staff1@example.com",
            first_name="Staff",
            last_name="One",
            pid="333333333",
            role=AccountRole.STAFF,
        ),
        AccountEntity(
            email="admin1@example.com",
            first_name="Admin",
            last_name="One",
            pid="444444444",
            role=AccountRole.ADMIN,
        ),
    ]
    for account in accounts:
        test_async_session.add(account)
    await test_async_session.commit()
    for account in accounts:
        await test_async_session.refresh(account)
    return accounts


@pytest_asyncio.fixture
async def sample_police(test_async_session: AsyncSession) -> PoliceEntity:
    """Create sample police credentials for testing."""
    police = PoliceEntity(
        id=1, email="police@example.com", hashed_password="$2b$12$test_hashed_password"
    )
    test_async_session.add(police)
    await test_async_session.commit()
    await test_async_session.refresh(police)
    return police


@pytest.mark.asyncio
async def test_get_all_accounts(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test getting all accounts without filter."""
    response = await client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_accounts_by_single_role_student(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test filtering accounts by student role."""
    response = await client.get("/api/accounts?role=student")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(account["role"] == "student" for account in data)


@pytest.mark.asyncio
async def test_get_accounts_by_single_role_staff(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test filtering accounts by staff role."""
    response = await client.get("/api/accounts?role=staff")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["role"] == "staff"


@pytest.mark.asyncio
async def test_get_accounts_by_single_role_admin(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test filtering accounts by admin role."""
    response = await client.get("/api/accounts?role=admin")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["role"] == "admin"


@pytest.mark.asyncio
async def test_get_accounts_by_multiple_roles(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test filtering accounts by multiple roles."""
    response = await client.get("/api/accounts?role=student&role=staff")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    roles = {account["role"] for account in data}
    assert roles == {"student", "staff"}


@pytest.mark.asyncio
async def test_get_accounts_unauthenticated(
    unauthenticated_client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test that unauthenticated requests return 401."""
    response = await unauthenticated_client.get("/api/accounts")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_accounts_empty_database(client: AsyncClient):
    """Test getting accounts when database is empty."""
    response = await client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


@pytest.mark.asyncio
async def test_create_account_admin(client: AsyncClient):
    """Test creating an admin account."""
    new_account = {
        "email": "newadmin@example.com",
        "first_name": "New",
        "last_name": "Admin",
        "pid": "555555555",
        "role": "admin",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newadmin@example.com"
    assert data["first_name"] == "New"
    assert data["last_name"] == "Admin"
    assert data["pid"] == "555555555"
    assert data["role"] == "admin"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_account_staff(client: AsyncClient):
    """Test creating a staff account."""
    new_account = {
        "email": "newstaff@example.com",
        "first_name": "New",
        "last_name": "Staff",
        "pid": "666666666",
        "role": "staff",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newstaff@example.com"
    assert data["role"] == "staff"


@pytest.mark.asyncio
async def test_create_account_student(client: AsyncClient):
    """Test creating a student account."""
    new_account = {
        "email": "newstudent@example.com",
        "first_name": "New",
        "last_name": "Student",
        "pid": "777777777",
        "role": "student",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newstudent@example.com"
    assert data["role"] == "student"


@pytest.mark.asyncio
async def test_create_account_duplicate_email(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test that creating an account with duplicate email returns 409."""
    new_account = {
        "email": "student1@example.com",
        "first_name": "Duplicate",
        "last_name": "User",
        "pid": "888888888",
        "role": "student",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_account_invalid_pid_too_short(client: AsyncClient):
    """Test that invalid PID format returns 422."""
    new_account = {
        "email": "invalid@example.com",
        "first_name": "Invalid",
        "last_name": "User",
        "pid": "12345",
        "role": "student",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_account_invalid_pid_too_long(client: AsyncClient):
    """Test that invalid PID format returns 422."""
    new_account = {
        "email": "invalid@example.com",
        "first_name": "Invalid",
        "last_name": "User",
        "pid": "1234567890",
        "role": "student",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_account_invalid_pid_non_numeric(client: AsyncClient):
    """Test that non-numeric PID returns 422."""
    new_account = {
        "email": "invalid@example.com",
        "first_name": "Invalid",
        "last_name": "User",
        "pid": "12345678a",
        "role": "student",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_account_invalid_email(client: AsyncClient):
    """Test that invalid email returns 422."""
    new_account = {
        "email": "not-an-email",
        "first_name": "Invalid",
        "last_name": "User",
        "pid": "123456789",
        "role": "student",
    }
    response = await client.post("/api/accounts", json=new_account)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_account_unauthenticated(unauthenticated_client: AsyncClient):
    """Test that unauthenticated POST returns 401."""
    new_account = {
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "pid": "999999999",
        "role": "student",
    }
    response = await unauthenticated_client.post("/api/accounts", json=new_account)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_account(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test updating an existing account."""
    account_to_update = sample_accounts[0]
    updated_data = {
        "email": "updated@example.com",
        "first_name": "Updated",
        "last_name": "Name",
        "pid": "999999991",
        "role": "staff",
    }
    response = await client.put(
        f"/api/accounts/{account_to_update.id}", json=updated_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "updated@example.com"
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Name"
    assert data["pid"] == "999999991"
    assert data["role"] == "staff"


@pytest.mark.asyncio
async def test_update_account_change_email(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test changing an account's email successfully."""
    account_to_update = sample_accounts[0]
    updated_data = {
        "email": "newemail@example.com",
        "first_name": account_to_update.first_name,
        "last_name": account_to_update.last_name,
        "pid": account_to_update.pid,
        "role": account_to_update.role.value,
    }
    response = await client.put(
        f"/api/accounts/{account_to_update.id}", json=updated_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newemail@example.com"


@pytest.mark.asyncio
async def test_update_account_duplicate_email(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test that updating to an email that already exists returns 409."""
    account_to_update = sample_accounts[0]
    updated_data = {
        "email": sample_accounts[1].email,
        "first_name": "Test",
        "last_name": "User",
        "pid": "999999992",
        "role": "student",
    }
    response = await client.put(
        f"/api/accounts/{account_to_update.id}", json=updated_data
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_account_not_found(client: AsyncClient):
    """Test updating a non-existent account returns 404."""
    updated_data = {
        "email": "doesnotexist@example.com",
        "first_name": "Does",
        "last_name": "NotExist",
        "pid": "999999993",
        "role": "student",
    }
    response = await client.put("/api/accounts/99999", json=updated_data)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_account_invalid_data(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test updating with invalid data returns 422."""
    account_to_update = sample_accounts[0]
    updated_data = {
        "email": "invalid-email",
        "first_name": "Test",
        "last_name": "User",
        "pid": "123",
        "role": "student",
    }
    response = await client.put(
        f"/api/accounts/{account_to_update.id}", json=updated_data
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_account_unauthenticated(
    unauthenticated_client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test that unauthenticated PUT returns 401."""
    account_to_update = sample_accounts[0]
    updated_data = {
        "email": "updated@example.com",
        "first_name": "Updated",
        "last_name": "Name",
        "pid": "999999994",
        "role": "student",
    }
    response = await unauthenticated_client.put(
        f"/api/accounts/{account_to_update.id}", json=updated_data
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_account(
    client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test deleting an account successfully."""
    account_to_delete = sample_accounts[0]
    response = await client.delete(f"/api/accounts/{account_to_delete.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == account_to_delete.id
    assert data["email"] == account_to_delete.email

    get_response = await client.get("/api/accounts")
    accounts = get_response.json()
    assert len(accounts) == 3


@pytest.mark.asyncio
async def test_delete_account_not_found(client: AsyncClient):
    """Test deleting a non-existent account returns 404."""
    response = await client.delete("/api/accounts/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_account_unauthenticated(
    unauthenticated_client: AsyncClient, sample_accounts: list[AccountEntity]
):
    """Test that unauthenticated DELETE returns 401."""
    account_to_delete = sample_accounts[0]
    response = await unauthenticated_client.delete(
        f"/api/accounts/{account_to_delete.id}"
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_police_credentials(client: AsyncClient, sample_police: PoliceEntity):
    """Test getting police credentials returns email only."""
    response = await client.get("/api/accounts/police")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "police@example.com"
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_get_police_no_password_exposed(
    client: AsyncClient, sample_police: PoliceEntity
):
    """Verify password is not exposed in police credentials response."""
    response = await client.get("/api/accounts/police")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert "email" in data


@pytest.mark.asyncio
async def test_get_police_unauthenticated(
    unauthenticated_client: AsyncClient, sample_police: PoliceEntity
):
    """Test that unauthenticated GET police returns 401."""
    response = await unauthenticated_client.get("/api/accounts/police")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_police_not_found(client: AsyncClient):
    """Test getting police when not configured returns 500."""
    response = await client.get("/api/accounts/police")
    assert response.status_code == 500


@pytest.mark.asyncio
async def test_update_police_credentials(
    client: AsyncClient, sample_police: PoliceEntity
):
    """Test updating police credentials."""
    updated_data = {"email": "newpolice@example.com", "password": "newpassword123"}
    response = await client.put("/api/accounts/police", json=updated_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newpolice@example.com"
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_update_police_credentials_email_only(
    client: AsyncClient, sample_police: PoliceEntity
):
    """Test updating police email."""
    updated_data = {
        "email": "updatedpolice@example.com",
        "password": "somepassword",
    }
    response = await client.put("/api/accounts/police", json=updated_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "updatedpolice@example.com"


@pytest.mark.asyncio
async def test_update_police_credentials_password_only(
    client: AsyncClient, sample_police: PoliceEntity
):
    """Test updating police password."""
    updated_data = {"email": sample_police.email, "password": "newpassword456"}
    response = await client.put("/api/accounts/police", json=updated_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == sample_police.email


@pytest.mark.asyncio
async def test_update_police_credentials_invalid_email(
    client: AsyncClient, sample_police: PoliceEntity
):
    """Test updating police with invalid email returns 422."""
    updated_data = {"email": "not-an-email", "password": "password123"}
    response = await client.put("/api/accounts/police", json=updated_data)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_police_credentials_unauthenticated(
    unauthenticated_client: AsyncClient, sample_police: PoliceEntity
):
    """Test that unauthenticated PUT police returns 401."""
    updated_data = {"email": "newpolice@example.com", "password": "newpassword"}
    response = await unauthenticated_client.put(
        "/api/accounts/police", json=updated_data
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_police_not_found(client: AsyncClient):
    """Test updating police when not configured returns 500."""
    updated_data = {"email": "police@example.com", "password": "password123"}
    response = await client.put("/api/accounts/police", json=updated_data)
    assert response.status_code == 500
