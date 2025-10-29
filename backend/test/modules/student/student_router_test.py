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


@pytest_asyncio.fixture(autouse=True)
async def override_dependencies(test_async_session: AsyncSession):
    async def _get_test_session():
        yield test_async_session

    async def _fake_admin():
        return {"sub": "test-admin", "role": "admin"}

    app.dependency_overrides[get_session] = _get_test_session
    app.dependency_overrides[authenticate_admin] = _fake_admin
    yield
    app.dependency_overrides.clear()


def auth_headers():
    return {"Authorization": "Bearer testtoken"}


@pytest.mark.asyncio
async def test_list_students_empty():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/students/", headers=auth_headers())
        assert res.status_code == 200
        assert res.json() == []


@pytest.mark.asyncio
async def test_create_and_get_student(test_async_session: AsyncSession):
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
            "call_or_text_pref": "text",
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
async def test_update_and_delete_student(test_async_session: AsyncSession):
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
            call_or_text_pref=ContactPreference.text,
            phone_number="1111111111",
        ),
        acc.id,
    )
    test_async_session.add(student)
    await test_async_session.commit()

    update_payload = {
        "first_name": "Jane",
        "last_name": "Doe",
        "call_or_text_pref": "call",
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
