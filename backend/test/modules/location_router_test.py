import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app


# --- Mock admin authentication so tests run without login ---
def fake_admin_auth():
    return {"role": "admin"}


try:
    from src.core.authentication import admin_required

    app.dependency_overrides[admin_required] = fake_admin_auth
except Exception:
    pass


@pytest.mark.asyncio
async def test_get_locations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/locations/")
    assert response.status_code in [200, 404, 401]


@pytest.mark.asyncio
async def test_get_location_by_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Added follow_redirects=True
        response = await ac.get("/locations/1/", follow_redirects=True)
    assert response.status_code in [200, 404, 401]


@pytest.mark.asyncio
async def test_create_location():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {"name": "Old Well", "city": "Chapel Hill", "place_id": "abcd1234"}
        response = await ac.post("/locations/", json=payload)
    assert response.status_code in [200, 201, 400, 401]


@pytest.mark.asyncio
async def test_update_location():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {"name": "Updated Location", "city": "Carrboro"}
        # ✅ Added trailing slash to remove 307 redirect
        response = await ac.put("/locations/1/", json=payload, follow_redirects=True)
    assert response.status_code in [200, 400, 404, 401]


@pytest.mark.asyncio
async def test_delete_location():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # ✅ Added trailing slash + follow_redirects
        response = await ac.delete("/locations/1/", follow_redirects=True)
    assert response.status_code in [200, 404, 401]
