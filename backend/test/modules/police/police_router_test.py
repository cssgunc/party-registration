import pytest
from httpx import AsyncClient
from src.core.exceptions import ForbiddenException
from src.modules.police.police_model import PoliceAccountDto, PoliceRole
from src.modules.police.police_service import PoliceConflictException, PoliceNotFoundException
from test.modules.police.police_utils import PoliceTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_paginated,
    assert_res_success,
)
from test.utils.http.test_templates import assert_excel_response, generate_auth_required_tests

test_police_auth = generate_auth_required_tests(
    ({"admin", "police_admin"}, "GET", "/api/police", None),
    ({"admin", "police_admin"}, "GET", "/api/police/1", None),
    # PUT: police_admin is excluded because is_verified is a required field they cannot set
    (
        {"admin"},
        "PUT",
        "/api/police/1",
        {"email": "x@unc.edu", "role": "officer", "is_verified": True},
    ),
    ({"admin", "police_admin"}, "DELETE", "/api/police/1", None),
    ({"admin", "police_admin"}, "GET", "/api/police/csv", None),
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
        response = await self.admin_client.get("/api/police")
        assert_res_paginated(response, PoliceAccountDto, total_records=0)

    @pytest.mark.asyncio
    async def test_list_police_returns_all(self) -> None:
        """Test listing police returns all created accounts."""
        police1, police2 = await self.police_utils.create_many(i=2)

        response = await self.admin_client.get("/api/police")
        paginated = assert_res_paginated(response, PoliceAccountDto, total_records=2)

        returned = {item.id: item for item in paginated.items}
        self.police_utils.assert_matches(returned[police1.id], police1.to_dto())
        self.police_utils.assert_matches(returned[police2.id], police2.to_dto())

    @pytest.mark.asyncio
    async def test_list_police_sort_by_email(self) -> None:
        """Test sorting police list by email."""
        await self.police_utils.create_many(i=3)

        response = await self.admin_client.get(
            "/api/police", params={"sort_by": "email", "sort_order": "asc"}
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
            "/api/police", params={"email_contains": police.email}
        )

        paginated = assert_res_paginated(response, PoliceAccountDto)
        returned = {item.id: item for item in paginated.items}
        self.police_utils.assert_matches(returned[police.id], police.to_dto())

    @pytest.mark.asyncio
    async def test_list_police_pagination(self) -> None:
        """Test pagination on police list."""
        await self.police_utils.create_many(i=3)

        response = await self.admin_client.get(
            "/api/police", params={"page_number": 1, "page_size": 2}
        )
        paginated = assert_res_paginated(
            response, PoliceAccountDto, total_records=3, page_number=1, page_size=2
        )
        assert len(paginated.items) == 2

    @pytest.mark.asyncio
    async def test_list_police_filter_by_role(self) -> None:
        await self.police_utils.create_one(role=PoliceRole.POLICE_ADMIN)
        await self.police_utils.create_many(i=2, role="officer")

        response = await self.admin_client.get("/api/police", params={"role": "police_admin"})
        paginated = assert_res_paginated(response, PoliceAccountDto, total_records=1)
        assert paginated.items[0].role.value == "police_admin"

    @pytest.mark.asyncio
    async def test_get_police_csv(self) -> None:
        await self.police_utils.create_one(role=PoliceRole.POLICE_ADMIN)
        await self.police_utils.create_one(role=PoliceRole.OFFICER)

        response = await self.admin_client.get("/api/police/csv")
        rows = assert_excel_response(response, expected_headers=("Email", "Role"))
        assert len(rows) == 3


class TestPoliceCRUDRouter:
    admin_client: AsyncClient
    police_admin_client: AsyncClient
    police_utils: PoliceTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        admin_client: AsyncClient,
        police_admin_client: AsyncClient,
        police_utils: PoliceTestUtils,
    ):
        self.admin_client = admin_client
        self.police_admin_client = police_admin_client
        self.police_utils = police_utils

    @pytest.mark.asyncio
    async def test_get_police_by_id_success(self) -> None:
        """Test getting a police account by ID."""
        police = await self.police_utils.create_one()

        response = await self.admin_client.get(f"/api/police/{police.id}")

        result = assert_res_success(response, PoliceAccountDto)
        self.police_utils.assert_matches(police, result)

    @pytest.mark.asyncio
    async def test_get_police_by_id_not_found(self) -> None:
        """Test getting a non-existent police account returns 404."""
        response = await self.admin_client.get("/api/police/99999")

        assert_res_failure(response, PoliceNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_update_police_success(self) -> None:
        """Test updating a police account."""
        police = await self.police_utils.create_one()
        update_data = await self.police_utils.next_update_data()

        response = await self.admin_client.put(
            f"/api/police/{police.id}",
            json=update_data.model_dump(mode="json"),
        )

        result = assert_res_success(response, PoliceAccountDto)
        assert result.id == police.id
        assert result.email == update_data.email
        assert result.role == update_data.role

    @pytest.mark.asyncio
    async def test_update_police_set_is_verified(self) -> None:
        """Test admin can flip is_verified via PUT."""
        police = await self.police_utils.create_one()
        assert not police.is_verified

        update_data = await self.police_utils.next_update_data(is_verified=True)
        response = await self.admin_client.put(
            f"/api/police/{police.id}",
            json=update_data.model_dump(mode="json"),
        )

        result = assert_res_success(response, PoliceAccountDto)
        assert result.is_verified

    @pytest.mark.asyncio
    async def test_update_police_not_found(self) -> None:
        """Test updating a non-existent police account returns 404."""
        data = await self.police_utils.next_update_data()

        response = await self.admin_client.put(
            "/api/police/99999", json=data.model_dump(mode="json")
        )

        assert_res_failure(response, PoliceNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_update_police_duplicate_email(self) -> None:
        """Test updating to a duplicate email returns 409."""
        police1 = await self.police_utils.create_one()
        police2 = await self.police_utils.create_one()
        data = await self.police_utils.next_update_data(email=police2.email)

        response = await self.admin_client.put(
            f"/api/police/{police1.id}",
            json=data.model_dump(mode="json"),
        )

        assert_res_failure(response, PoliceConflictException(police2.email))

    @pytest.mark.asyncio
    async def test_update_police_password_unchanged(self) -> None:
        """Test updating police account does not modify password hash."""
        police = await self.police_utils.create_one()
        original_hashed_password = police.hashed_password
        data = await self.police_utils.next_update_data()

        await self.admin_client.put(
            f"/api/police/{police.id}",
            json=data.model_dump(mode="json"),
        )

        all_police = await self.police_utils.get_all()
        all_by_id = {p.id: p for p in all_police}
        updated = all_by_id[police.id]
        assert updated.hashed_password == original_hashed_password

    @pytest.mark.asyncio
    async def test_police_admin_cannot_set_is_verified(self) -> None:
        """Test that police_admin is rejected from PUT entirely (admin-only route)."""
        police = await self.police_utils.create_one()
        data = await self.police_utils.next_update_data()

        response = await self.police_admin_client.put(
            f"/api/police/{police.id}",
            json=data.model_dump(mode="json"),
        )

        assert_res_failure(response, ForbiddenException("Insufficient privileges"))

    @pytest.mark.asyncio
    async def test_delete_police_success(self) -> None:
        """Test deleting a police account."""
        police = await self.police_utils.create_one()

        response = await self.admin_client.delete(f"/api/police/{police.id}")

        result = assert_res_success(response, PoliceAccountDto)
        self.police_utils.assert_matches(police, result)

        all_police = await self.police_utils.get_all()
        assert len(all_police) == self.police_utils.count - 1

    @pytest.mark.asyncio
    async def test_delete_police_not_found(self) -> None:
        """Test deleting a non-existent police account returns 404."""
        response = await self.admin_client.delete("/api/police/99999")

        assert_res_failure(response, PoliceNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_police_admin_cannot_delete_own_account(self) -> None:
        response = await self.police_admin_client.delete("/api/police/99999")
        assert_res_failure(
            response, ForbiddenException("Police admins cannot delete their own account")
        )
