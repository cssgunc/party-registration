from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import authenticate_admin
from src.core.database import get_session
from src.main import app
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference, StudentData
from src.modules.location.location_service import LocationService
from src.modules.location.location_model import LocationData


@pytest_asyncio.fixture()
async def mock_location_service():
    """Create a mock LocationService that returns test data."""
    mock_service = AsyncMock(spec=LocationService)
    mock_service.get_place_details = AsyncMock(return_value=LocationData(
        google_place_id="test_place_id_123",
        formatted_address="456 New St, Test City, TC 67890",
        latitude=35.9132,
        longitude=-79.0558,
        street_number="456",
        street_name="New St",
        unit=None,
        city="Test City",
        county="Test County",
        state="NC",
        country="US",
        zip_code="67890"
    ))
    return mock_service


@pytest_asyncio.fixture()
async def override_dependencies_admin(test_async_session: AsyncSession, mock_location_service: AsyncMock):
    """Override dependencies to simulate admin authentication."""

    async def _get_test_session():
        yield test_async_session

    async def _fake_admin():
        return {"sub": "test-admin", "role": "admin"}

    app.dependency_overrides[get_session] = _get_test_session
    app.dependency_overrides[authenticate_admin] = _fake_admin
    app.dependency_overrides[LocationService] = lambda: mock_location_service
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def override_dependencies_no_auth(test_async_session: AsyncSession, mock_location_service: AsyncMock):
    """Override dependencies without authentication."""

    async def _get_test_session():
        yield test_async_session

    app.dependency_overrides[get_session] = _get_test_session
    app.dependency_overrides[LocationService] = lambda: mock_location_service
    yield
    app.dependency_overrides.clear()


def auth_headers():
    return {"Authorization": "Bearer testtoken"}


@pytest.mark.asyncio
async def test_list_students_empty(override_dependencies_admin: Any):
    """Test listing students when database is empty."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/", headers=auth_headers())
        assert res.status_code == 200
        data = res.json()
        assert data["items"] == []
        assert data["total_records"] == 0


@pytest.mark.asyncio
async def test_list_students_with_data(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test listing students when multiple students exist."""
    from sqlalchemy import select

    for i in range(3):
        acc = AccountEntity(
            email=f"student{i}@example.com",
            first_name=f"Student{i}",
            last_name=f"Test{i}",
            pid=f"12345678{i}",
            role=AccountRole.STUDENT,
        )
        test_async_session.add(acc)
    await test_async_session.commit()

    result = await test_async_session.execute(
        select(AccountEntity).order_by(AccountEntity.id)
    )
    accounts = result.scalars().all()

    for idx, acc in enumerate(accounts):
        student = StudentEntity.from_model(
            StudentData(
                first_name=f"Student{idx}",
                last_name=f"Test{idx}",
                contact_preference=ContactPreference.text,
                phone_number=f"555000{idx}{idx}{idx}{idx}",
            ),
            acc.id,
        )
        test_async_session.add(student)
    await test_async_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/", headers=auth_headers())
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 3
        assert data["total_records"] == 3


@pytest.mark.asyncio
async def test_create_student_success(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test successfully creating a student."""
    acc = AccountEntity(
        email="newstudent@example.com",
        first_name="New",
        last_name="Student",
        pid="123456789",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    payload = {
        "account_id": acc.id,
        "data": {
            "first_name": "Rita",
            "last_name": "Lee",
            "contact_preference": "text",
            "phone_number": "5555555555",
            "last_registered": None,
        },
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/api/students/", json=payload, headers=auth_headers())
        assert res.status_code == 201
        body = res.json()
        assert body["id"] == acc.id
        assert body["first_name"] == "Rita"
        assert body["last_name"] == "Lee"
        assert body["phone_number"] == "5555555555"


@pytest.mark.asyncio
async def test_create_student_with_datetime(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test creating a student with last_registered datetime."""
    acc = AccountEntity(
        email="datetime@example.com",
        first_name="DateTime",
        last_name="Test",
        pid="987654321",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    dt = datetime(2024, 3, 15, 10, 30, 0, tzinfo=timezone.utc)
    payload = {
        "account_id": acc.id,
        "data": {
            "first_name": "John",
            "last_name": "Date",
            "contact_preference": "call",
            "phone_number": "5551234567",
            "last_registered": dt.isoformat(),
        },
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/api/students/", json=payload, headers=auth_headers())
        assert res.status_code == 201
        body = res.json()
        assert body["last_registered"] is not None


@pytest.mark.asyncio
async def test_create_student_nonexistent_account(override_dependencies_admin: Any):
    """Test creating a student with non-existent account ID."""
    payload = {
        "account_id": 99999,
        "data": {
            "first_name": "Test",
            "last_name": "User",
            "contact_preference": "text",
            "phone_number": "5551112222",
        },
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/api/students/", json=payload, headers=auth_headers())
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_create_student_wrong_role(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test creating a student with account that has non-student role."""
    admin_acc = AccountEntity(
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
        pid="111111111",
        role=AccountRole.ADMIN,
    )
    test_async_session.add(admin_acc)
    await test_async_session.commit()
    await test_async_session.refresh(admin_acc)

    payload = {
        "account_id": admin_acc.id,
        "data": {
            "first_name": "Test",
            "last_name": "User",
            "contact_preference": "text",
            "phone_number": "5553334444",
        },
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/api/students/", json=payload, headers=auth_headers())
        assert res.status_code == 400


@pytest.mark.asyncio
async def test_create_student_duplicate_account(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test creating a student when account already has a student record."""
    acc = AccountEntity(
        email="duplicate@example.com",
        first_name="Duplicate",
        last_name="Student",
        pid="222222222",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    student1 = StudentEntity.from_model(
        StudentData(
            first_name="First",
            last_name="Student",
            contact_preference=ContactPreference.text,
            phone_number="5555555555",
        ),
        acc.id,
    )
    test_async_session.add(student1)
    await test_async_session.commit()

    payload = {
        "account_id": acc.id,
        "data": {
            "first_name": "Second",
            "last_name": "Student",
            "contact_preference": "call",
            "phone_number": "5556666666",
        },
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/api/students/", json=payload, headers=auth_headers())
        assert res.status_code == 409


@pytest.mark.asyncio
async def test_create_student_duplicate_phone(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test creating students with duplicate phone numbers."""
    acc1 = AccountEntity(
        email="phone1@example.com",
        first_name="Phone",
        last_name="One",
        pid="333333333",
        role=AccountRole.STUDENT,
    )
    acc2 = AccountEntity(
        email="phone2@example.com",
        first_name="Phone",
        last_name="Two",
        pid="444444444",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([acc1, acc2])
    await test_async_session.commit()
    await test_async_session.refresh(acc1)
    await test_async_session.refresh(acc2)

    student1 = StudentEntity.from_model(
        StudentData(
            first_name="First",
            last_name="Student",
            contact_preference=ContactPreference.text,
            phone_number="5557777777",
        ),
        acc1.id,
    )
    test_async_session.add(student1)
    await test_async_session.commit()

    payload = {
        "account_id": acc2.id,
        "data": {
            "first_name": "Second",
            "last_name": "Student",
            "contact_preference": "call",
            "phone_number": "5557777777",
        },
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/api/students/", json=payload, headers=auth_headers())
        assert res.status_code == 409


@pytest.mark.asyncio
async def test_get_student_success(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test successfully getting a student by ID."""
    acc = AccountEntity(
        email="getstudent@example.com",
        first_name="Get",
        last_name="Student",
        pid="555555555",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    student = StudentEntity.from_model(
        StudentData(
            first_name="Get",
            last_name="Student",
            contact_preference=ContactPreference.text,
            phone_number="5558888888",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get(f"/api/students/{acc.id}", headers=auth_headers())
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == acc.id
        assert body["first_name"] == "Get"
        assert body["phone_number"] == "5558888888"


@pytest.mark.asyncio
async def test_get_student_not_found(override_dependencies_admin: Any):
    """Test getting a non-existent student."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/99999", headers=auth_headers())
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_student_success(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test successfully updating a student."""
    acc = AccountEntity(
        email="updatestudent@example.com",
        first_name="Update",
        last_name="Student",
        pid="666666666",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    student = StudentEntity.from_model(
        StudentData(
            first_name="Old",
            last_name="Name",
            contact_preference=ContactPreference.text,
            phone_number="5559999999",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    update_payload = {
        "first_name": "New",
        "last_name": "Name",
        "contact_preference": "call",
        "phone_number": "5550000000",
        "last_registered": None,
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.put(
            f"/api/students/{acc.id}", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 200
        body = res.json()
        assert body["first_name"] == "New"
        assert body["phone_number"] == "5550000000"


@pytest.mark.asyncio
async def test_update_student_not_found(override_dependencies_admin: Any):
    """Test updating a non-existent student."""
    update_payload = {
        "first_name": "Test",
        "last_name": "User",
        "contact_preference": "text",
        "phone_number": "5551112222",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.put(
            "/api/students/99999", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_student_phone_conflict(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test updating student with phone number that already exists."""
    acc1 = AccountEntity(
        email="update1@example.com",
        first_name="Update",
        last_name="One",
        pid="777777777",
        role=AccountRole.STUDENT,
    )
    acc2 = AccountEntity(
        email="update2@example.com",
        first_name="Update",
        last_name="Two",
        pid="888888888",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([acc1, acc2])
    await test_async_session.commit()
    await test_async_session.refresh(acc1)
    await test_async_session.refresh(acc2)

    student1 = StudentEntity.from_model(
        StudentData(
            first_name="Student",
            last_name="One",
            contact_preference=ContactPreference.text,
            phone_number="5551111111",
        ),
        acc1.id,
    )
    student2 = StudentEntity.from_model(
        StudentData(
            first_name="Student",
            last_name="Two",
            contact_preference=ContactPreference.text,
            phone_number="5552222222",
        ),
        acc2.id,
    )
    test_async_session.add_all([student1, student2])
    await test_async_session.commit()

    update_payload = {
        "first_name": "Student",
        "last_name": "Two",
        "contact_preference": "text",
        "phone_number": "5551111111",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.put(
            f"/api/students/{acc2.id}", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 409


@pytest.mark.asyncio
async def test_delete_student_success(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test successfully deleting a student."""
    acc = AccountEntity(
        email="deletestudent@example.com",
        first_name="Delete",
        last_name="Me",
        pid="999999999",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    student = StudentEntity.from_model(
        StudentData(
            first_name="Delete",
            last_name="Me",
            contact_preference=ContactPreference.text,
            phone_number="5553333333",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.delete(f"/api/students/{acc.id}", headers=auth_headers())
        assert res.status_code == 200

        res2 = await client.get(f"/api/students/{acc.id}", headers=auth_headers())
        assert res2.status_code == 404


@pytest.mark.asyncio
async def test_delete_student_not_found(override_dependencies_admin: Any):
    """Test deleting a non-existent student."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.delete("/api/students/99999", headers=auth_headers())
        assert res.status_code == 404


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("GET", "/api/students/", None),
        ("GET", "/api/students/1", None),
        (
            "POST",
            "/api/students/",
            {
                "account_id": 1,
                "data": {
                    "first_name": "Test",
                    "last_name": "User",
                    "contact_preference": "text",
                    "phone_number": "5551234567",
                },
            },
        ),
        (
            "PUT",
            "/api/students/1",
            {
                "first_name": "Test",
                "last_name": "User",
                "contact_preference": "text",
                "phone_number": "5551234567",
            },
        ),
        ("DELETE", "/api/students/1", None),
    ],
)
@pytest.mark.asyncio
async def test_routes_require_authentication(
    method: str, path: str, body: dict | None, override_dependencies_no_auth: Any
):
    """Test that all student routes require admin authentication."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        if method == "GET":
            res = await client.get(path)
        elif method == "POST":
            res = await client.post(path, json=body)
        elif method == "PUT":
            res = await client.put(path, json=body)
        else:
            res = await client.delete(path)

        assert res.status_code in [401, 403]


@pytest.mark.asyncio
async def test_list_students_empty_workflow(override_dependencies_admin: Any):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/", headers=auth_headers())
        assert res.status_code == 200
        data = res.json()
        assert data["items"] == []
        assert data["total_records"] == 0


@pytest.mark.asyncio
async def test_create_and_get_student(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    acc = AccountEntity(
        email="router1@example.com",
        first_name="Router",
        last_name="One",
        pid="111222333",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    payload = {
        "account_id": acc.id,
        "data": {
            "first_name": "Rita",
            "last_name": "Lee",
            "contact_preference": "text",
            "phone_number": "5555555555",
            "last_registered": None,
        },
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/api/students/", json=payload, headers=auth_headers())
        assert res.status_code == 201, res.text
        body = res.json()
        assert body["id"] == acc.id
        assert body["first_name"] == "Rita"

        res2 = await client.get(f"/api/students/{acc.id}", headers=auth_headers())
        assert res2.status_code == 200
        body2 = res2.json()
        assert body2["id"] == acc.id
        assert body2["phone_number"] == "5555555555"


@pytest.mark.asyncio
async def test_update_and_delete_student(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    acc = AccountEntity(
        email="router2@example.com",
        first_name="Router",
        last_name="Two",
        pid="444555666",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()
    await test_async_session.refresh(acc)

    student = StudentEntity.from_model(
        StudentData(
            first_name="John",
            last_name="Doe",
            contact_preference=ContactPreference.text,
            phone_number="1111111111",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    update_payload = {
        "first_name": "Jane",
        "last_name": "Doe",
        "contact_preference": "call",
        "phone_number": "9999990000",
        "last_registered": None,
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.put(
            f"/api/students/{acc.id}", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 200, res.text
        assert res.json()["first_name"] == "Jane"

        res2 = await client.delete(f"/api/students/{acc.id}", headers=auth_headers())
        assert res2.status_code == 200
        res3 = await client.get(f"/api/students/{acc.id}", headers=auth_headers())
        assert res3.status_code == 404
