import pytest
from httpx import AsyncClient
from src.modules.police.police_model import PoliceAccountDto
from src.modules.police.police_service import PoliceConflictException, PoliceNotFoundException
from test.modules.police.police_utils import PoliceTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_paginated,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import generate_auth_required_tests

test_police_auth = generate_auth_required_tests(
    ({"admin"}, "GET", "/api/accounts/police", None),
    ({"admin"}, "POST", "/api/accounts/police", {"email": "x@unc.edu", "password": "pass"}),
    ({"admin"}, "GET", "/api/accounts/police/1", None),
    ({"admin"}, "PUT", "/api/accounts/police/1", {"email": "x@unc.edu", "password": "pass"}),
    ({"admin"}, "DELETE", "/api/accounts/police/1", None),
)


class TestPoliceListRouter:
    admin_client: AsyncClient
    police_utils: PoliceTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, admin_client: AsyncClient, police_utils: PoliceTestUtils):
        self.admin_client = admin_client
        self.police_utils = police_utils

    @pytest.mark.asyncio
    async def test_list_police_empty(self) -> None:
        """Test listing police when none exist returns empty paginated response."""
        response = await self.admin_client.get("/api/accounts/police")
        assert_res_paginated(response, PoliceAccountDto, total_records=0)

    @pytest.mark.asyncio
    async def test_list_police_returns_all(self) -> None:
        """Test listing police returns all created accounts."""
        police1, police2 = await self.police_utils.create_many(i=2)

        response = await self.admin_client.get("/api/accounts/police")
        paginated = assert_res_paginated(response, PoliceAccountDto, total_records=2)

        returned = {item.id: item for item in paginated.items}
        self.police_utils.assert_matches(returned[police1.id], police1.to_dto())
        self.police_utils.assert_matches(returned[police2.id], police2.to_dto())

    @pytest.mark.asyncio
    async def test_list_police_sort_by_email(self) -> None:
        """Test sorting police list by email."""
        await self.police_utils.create_many(i=3)

        response = await self.admin_client.get(
            "/api/accounts/police", params={"sort_by": "email", "sort_order": "asc"}
        )

        paginated = assert_res_paginated(response, PoliceAccountDto, total_records=3)
        emails = [p.email for p in paginated.items]
        assert emails == sorted(emails)

    @pytest.mark.asyncio
    async def test_list_police_filter_by_email(self) -> None:
        """Test filtering police list by email."""
        police = await self.police_utils.create_one()
        await self.police_utils.create_many(i=2)

        response = await self.admin_client.get(
            "/api/accounts/police", params={"email_contains": police.email}
        )

        paginated = assert_res_paginated(response, PoliceAccountDto)
        returned = {item.id: item for item in paginated.items}
        self.police_utils.assert_matches(returned[police.id], police.to_dto())

    @pytest.mark.asyncio
    async def test_list_police_pagination(self) -> None:
        """Test pagination on police list."""
        await self.police_utils.create_many(i=3)

        response = await self.admin_client.get(
            "/api/accounts/police", params={"page_number": 1, "page_size": 2}
        )

        paginated = assert_res_paginated(
            response, PoliceAccountDto, total_records=3, page_number=1, page_size=2
        )
        assert len(paginated.items) == 2


class TestPoliceCRUDRouter:
    admin_client: AsyncClient
    police_utils: PoliceTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, admin_client: AsyncClient, police_utils: PoliceTestUtils):
        self.admin_client = admin_client
        self.police_utils = police_utils

    @pytest.mark.asyncio
    async def test_create_police_success(self) -> None:
        """Test creating a new police account returns 201 with PoliceAccountDto."""
        data = await self.police_utils.next_data()

        response = await self.admin_client.post(
            "/api/accounts/police", json=data.model_dump(mode="json")
        )

        result = assert_res_success(response, PoliceAccountDto, status=201)
        assert result.email == data.email
        assert result.id is not None

    @pytest.mark.asyncio
    async def test_create_police_duplicate_email(self) -> None:
        """Test creating a police account with duplicate email returns 409."""
        police = await self.police_utils.create_one()
        data = await self.police_utils.next_data(email=police.email)

        response = await self.admin_client.post(
            "/api/accounts/police", json=data.model_dump(mode="json")
        )

        assert_res_failure(response, PoliceConflictException(police.email))

    @pytest.mark.asyncio
    async def test_create_police_invalid_email(self) -> None:
        """Test creating a police account with invalid email returns 422."""
        data = await self.police_utils.next_dict(email="not-an-email")

        response = await self.admin_client.post("/api/accounts/police", json=data)

        assert_res_validation_error(response, expected_fields=["email"])

    @pytest.mark.asyncio
    async def test_get_police_by_id_success(self) -> None:
        """Test getting a police account by ID."""
        police = await self.police_utils.create_one()

        response = await self.admin_client.get(f"/api/accounts/police/{police.id}")

        result = assert_res_success(response, PoliceAccountDto)
        self.police_utils.assert_matches(police, result)

    @pytest.mark.asyncio
    async def test_get_police_by_id_not_found(self) -> None:
        """Test getting a non-existent police account returns 404."""
        response = await self.admin_client.get("/api/accounts/police/99999")

        assert_res_failure(response, PoliceNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_update_police_success(self) -> None:
        """Test updating a police account."""
        police = await self.police_utils.create_one()
        update_data = await self.police_utils.next_data()

        response = await self.admin_client.put(
            f"/api/accounts/police/{police.id}",
            json=update_data.model_dump(mode="json"),
        )

        result = assert_res_success(response, PoliceAccountDto)
        assert result.id == police.id
        assert result.email == update_data.email

    @pytest.mark.asyncio
    async def test_update_police_not_found(self) -> None:
        """Test updating a non-existent police account returns 404."""
        data = await self.police_utils.next_data()

        response = await self.admin_client.put(
            "/api/accounts/police/99999", json=data.model_dump(mode="json")
        )

        assert_res_failure(response, PoliceNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_update_police_duplicate_email(self) -> None:
        """Test updating to a duplicate email returns 409."""
        police1 = await self.police_utils.create_one()
        police2 = await self.police_utils.create_one()
        data = await self.police_utils.next_data(email=police2.email)

        response = await self.admin_client.put(
            f"/api/accounts/police/{police1.id}",
            json=data.model_dump(mode="json"),
        )

        assert_res_failure(response, PoliceConflictException(police2.email))

    @pytest.mark.asyncio
    async def test_update_police_password_is_hashed(self) -> None:
        """Test that password is hashed when updating police credentials."""
        police = await self.police_utils.create_one()
        plain_password = "my_plain_password_123"
        data = await self.police_utils.next_data(password=plain_password)

        await self.admin_client.put(
            f"/api/accounts/police/{police.id}",
            json=data.model_dump(mode="json"),
        )

        all_police = await self.police_utils.get_all()
        all_by_id = {p.id: p for p in all_police}
        updated = all_by_id[police.id]
        assert updated.hashed_password != plain_password
        assert self.police_utils.verify_password(plain_password, updated.hashed_password)

    @pytest.mark.asyncio
    async def test_delete_police_success(self) -> None:
        """Test deleting a police account."""
        police = await self.police_utils.create_one()

        response = await self.admin_client.delete(f"/api/accounts/police/{police.id}")

        result = assert_res_success(response, PoliceAccountDto)
        self.police_utils.assert_matches(police, result)

        all_police = await self.police_utils.get_all()
        assert len(all_police) == self.police_utils.count - 1

    @pytest.mark.asyncio
    async def test_delete_police_not_found(self) -> None:
        """Test deleting a non-existent police account returns 404."""
        response = await self.admin_client.delete("/api/accounts/police/99999")

        assert_res_failure(response, PoliceNotFoundException(99999))
