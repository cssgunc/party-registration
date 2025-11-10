from datetime import datetime, timezone
from typing import Any

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


@pytest_asyncio.fixture()
async def override_dependencies_admin(test_async_session: AsyncSession):
    """Override dependencies to simulate admin authentication."""

    async def _get_test_session():
        yield test_async_session

    async def _fake_admin():
        return {"sub": "test-admin", "role": "admin"}

    app.dependency_overrides[get_session] = _get_test_session
    app.dependency_overrides[authenticate_admin] = _fake_admin
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def override_dependencies_no_auth(test_async_session: AsyncSession):
    """Override dependencies without authentication."""

    async def _get_test_session():
        yield test_async_session

    app.dependency_overrides[get_session] = _get_test_session
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
        assert res.json() == []


@pytest.mark.asyncio
async def test_list_students_with_data(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test listing students when multiple students exist."""
    from sqlalchemy import select

    for i in range(3):
        acc = AccountEntity(
            email=f"student{i}@example.com",
            hashed_password="$2b$12$test_hashed_password",
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
        assert len(data) == 3


@pytest.mark.asyncio
async def test_create_student_success(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    """Test successfully creating a student."""
    acc = AccountEntity(
        email="newstudent@example.com",
        hashed_password="$2b$12$test_hashed_password",
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
        assert body["email"] == acc.email
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
        hashed_password="$2b$12$test_hashed_password",
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
        hashed_password="$2b$12$test_hashed_password",
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
        hashed_password="$2b$12$test_hashed_password",
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
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    acc2 = AccountEntity(
        email="phone2@example.com",
        hashed_password="$2b$12$test_hashed_password",
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
        hashed_password="$2b$12$test_hashed_password",
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
        hashed_password="$2b$12$test_hashed_password",
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
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    acc2 = AccountEntity(
        email="update2@example.com",
        hashed_password="$2b$12$test_hashed_password",
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
        hashed_password="$2b$12$test_hashed_password",
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
        assert res.json() == []


@pytest.mark.asyncio
async def test_create_and_get_student(
    override_dependencies_admin: Any, test_async_session: AsyncSession
):
    acc = AccountEntity(
        email="router1@example.com",
        hashed_password="$2b$12$test_hashed_password",
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
        assert body["email"] == acc.email
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
        hashed_password="$2b$12$test_hashed_password",
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


@pytest_asyncio.fixture()
async def override_dependencies_student(test_async_session: AsyncSession):
    from src.modules.account.account_model import Account, AccountRole

    async def _get_test_session():
        yield test_async_session

    async def _fake_student():
        return Account(
            id=1,
            email="student@example.com",
            password="hashed",
            role=AccountRole.STUDENT,
        )

    app.dependency_overrides[get_session] = _get_test_session
    from src.core.authentication import authenticate_student

    app.dependency_overrides[authenticate_student] = _fake_student
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def override_dependencies_admin_for_student_routes(
    test_async_session: AsyncSession,
):
    """Override dependencies to simulate admin trying to access student routes."""
    from src.modules.account.account_model import Account, AccountRole

    async def _get_test_session():
        yield test_async_session

    async def _fake_admin_user():
        return Account(
            id=2,
            email="admin@example.com",
            password="hashed",
            role=AccountRole.ADMIN,
        )

    app.dependency_overrides[get_session] = _get_test_session
    from src.core.authentication import authenticate_user

    app.dependency_overrides[authenticate_user] = _fake_admin_user
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def override_dependencies_police_for_student_routes(
    test_async_session: AsyncSession,
):
    """Override dependencies to simulate police trying to access student routes."""
    from src.modules.account.account_model import Account, AccountRole

    async def _get_test_session():
        yield test_async_session

    async def _fake_police_user():
        return Account(
            id=3,
            email="police@example.com",
            password="hashed",
            role=AccountRole.POLICE,
        )

    app.dependency_overrides[get_session] = _get_test_session
    from src.core.authentication import authenticate_user

    app.dependency_overrides[authenticate_user] = _fake_police_user
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_me_success(
    override_dependencies_student: Any, test_async_session: AsyncSession
):
    acc = AccountEntity(
        id=1,
        email="student@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()

    student = StudentEntity.from_model(
        StudentData(
            first_name="Current",
            last_name="User",
            contact_preference=ContactPreference.text,
            phone_number="5551234567",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me", headers=auth_headers())
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == 1
        assert body["first_name"] == "Current"
        assert body["last_name"] == "User"
        assert body["phone_number"] == "5551234567"
        assert body["contact_preference"] == "text"


@pytest.mark.asyncio
async def test_get_me_not_found(override_dependencies_student: Any):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me", headers=auth_headers())
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_get_me_unauthenticated(override_dependencies_no_auth: Any):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me")
        assert res.status_code in [401, 403]


@pytest.mark.asyncio
async def test_get_me_forbidden_admin(
    override_dependencies_admin_for_student_routes: Any,
):
    """Test that admin users cannot access GET /api/students/me endpoint."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me", headers=auth_headers())
        assert res.status_code == 403
        response_data = res.json()
        assert "message" in response_data
        assert "Student privileges required" in response_data["message"]


@pytest.mark.asyncio
async def test_get_me_forbidden_police(
    override_dependencies_police_for_student_routes: Any,
):
    """Test that police users cannot access GET /api/students/me endpoint."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me", headers=auth_headers())
        assert res.status_code == 403
        response_data = res.json()
        assert "message" in response_data
        assert "Student privileges required" in response_data["message"]


@pytest.mark.asyncio
async def test_update_me_success(
    override_dependencies_student: Any, test_async_session: AsyncSession
):
    acc = AccountEntity(
        id=1,
        email="student@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()

    student = StudentEntity.from_model(
        StudentData(
            first_name="Old",
            last_name="Name",
            contact_preference=ContactPreference.text,
            phone_number="5551111111",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    update_payload = {
        "first_name": "New",
        "last_name": "Name",
        "contact_preference": "call",
        "phone_number": "5552222222",
        "last_registered": None,
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.put(
            "/api/students/me", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 200
        body = res.json()
        assert body["first_name"] == "New"
        assert body["phone_number"] == "5552222222"
        assert body["contact_preference"] == "call"


@pytest.mark.asyncio
async def test_update_me_phone_conflict(
    override_dependencies_student: Any, test_async_session: AsyncSession
):
    acc1 = AccountEntity(
        id=1,
        email="student1@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    acc2 = AccountEntity(
        id=2,
        email="student2@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([acc1, acc2])
    await test_async_session.commit()

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
        "last_name": "One",
        "contact_preference": "text",
        "phone_number": "5552222222",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.put(
            "/api/students/me", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 409


@pytest.mark.asyncio
async def test_update_me_unauthenticated(override_dependencies_no_auth: Any):
    update_payload = {
        "first_name": "Test",
        "last_name": "User",
        "contact_preference": "text",
        "phone_number": "5551112222",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.put("/api/students/me", json=update_payload)
        assert res.status_code in [401, 403]


@pytest.mark.asyncio
async def test_update_me_forbidden_admin(
    override_dependencies_admin_for_student_routes: Any,
):
    """Test that admin users cannot access PUT /api/students/me endpoint."""
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
            "/api/students/me", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 403
        response_data = res.json()
        assert "message" in response_data
        assert "Student privileges required" in response_data["message"]


@pytest.mark.asyncio
async def test_update_me_forbidden_police(
    override_dependencies_police_for_student_routes: Any,
):
    """Test that police users cannot access PUT /api/students/me endpoint."""
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
            "/api/students/me", json=update_payload, headers=auth_headers()
        )
        assert res.status_code == 403
        response_data = res.json()
        assert "message" in response_data
        assert "Student privileges required" in response_data["message"]


@pytest.mark.asyncio
async def test_get_me_parties_empty(
    override_dependencies_student: Any, test_async_session: AsyncSession
):
    acc = AccountEntity(
        id=1,
        email="student@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    test_async_session.add(acc)
    await test_async_session.commit()

    student = StudentEntity.from_model(
        StudentData(
            first_name="Student",
            last_name="NoParties",
            contact_preference=ContactPreference.text,
            phone_number="5551234567",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me/parties", headers=auth_headers())
        assert res.status_code == 200
        assert res.json() == []


@pytest.mark.asyncio
async def test_get_me_parties_with_data(
    override_dependencies_student: Any, test_async_session: AsyncSession
):
    from src.modules.location.location_entity import LocationEntity
    from src.modules.party.party_entity import PartyEntity

    acc1 = AccountEntity(
        id=1,
        email="student1@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    acc2 = AccountEntity(
        id=2,
        email="student2@example.com",
        hashed_password="$2b$12$test_hashed_password",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([acc1, acc2])
    await test_async_session.commit()

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
            contact_preference=ContactPreference.call,
            phone_number="5552222222",
        ),
        acc2.id,
    )
    test_async_session.add_all([student1, student2])

    location = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_1",
        formatted_address="Test Address 1",
    )
    test_async_session.add(location)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime(2024, 12, 1, 20, 0, 0, tzinfo=timezone.utc),
        location_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    party2 = PartyEntity(
        party_datetime=datetime(2024, 12, 15, 21, 0, 0, tzinfo=timezone.utc),
        location_id=1,
        contact_one_id=2,
        contact_two_id=1,
    )
    test_async_session.add_all([party1, party2])
    await test_async_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me/parties", headers=auth_headers())
        assert res.status_code == 200
        parties = res.json()
        assert len(parties) == 2
        party_ids = [p["id"] for p in parties]
        assert party1.id in party_ids
        assert party2.id in party_ids


@pytest.mark.asyncio
async def test_get_me_parties_unauthenticated(override_dependencies_no_auth: Any):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me/parties")
        assert res.status_code in [401, 403]


@pytest.mark.asyncio
async def test_get_me_parties_forbidden_admin(
    override_dependencies_admin_for_student_routes: Any,
):
    """Test that admin users cannot access GET /api/students/me/parties endpoint."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me/parties", headers=auth_headers())
        assert res.status_code == 403
        response_data = res.json()
        assert "message" in response_data
        assert "Student privileges required" in response_data["message"]


@pytest.mark.asyncio
async def test_get_me_parties_forbidden_police(
    override_dependencies_police_for_student_routes: Any,
):
    """Test that police users cannot access GET /api/students/me/parties endpoint."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/me/parties", headers=auth_headers())
        assert res.status_code == 403
        response_data = res.json()
        assert "message" in response_data
        assert "Student privileges required" in response_data["message"]
