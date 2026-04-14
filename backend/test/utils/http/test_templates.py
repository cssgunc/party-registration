from collections.abc import AsyncGenerator, Callable
from io import BytesIO
from typing import Any

import openpyxl
import pytest
from httpx import AsyncClient, Response
from pydantic import BaseModel
from src.core.authentication import StringRole
from src.core.exceptions import CredentialsException, ForbiddenException
from test.utils.http.assertions import assert_res_failure, assert_res_paginated

all_roles: set[StringRole] = {"admin", "staff", "student", "officer", "police_admin"}


def generate_auth_required_tests(*params: tuple[set[StringRole], str, str, dict | None]):
    """Generate authentication and authorization tests for HTTP endpoints.

    Ensures that allowed roles can access the endpoint, disallowed roles are forbidden,
    and unauthenticated requests are unauthorized.

    Args:
        params: A variable number of tuples, each containing:
            - allowed_roles (set[StringRole]): Roles allowed to access the endpoint.
            - method (str): The HTTP method (e.g., "GET", "POST").
            - path (str): The endpoint path (e.g., "/api/resource").
            - body (dict | None): The request body for methods like POST or PUT.
    """

    @pytest.mark.parametrize("allowed_roles, method, path, body", params)
    @pytest.mark.asyncio
    async def test_authentication(
        create_test_client: Callable[..., AsyncGenerator[AsyncClient, Any]],
        allowed_roles: set[StringRole],
        method: str,
        path: str,
        body: dict | None,
    ):
        """Test authentication and authorization for endpoints."""

        for role in allowed_roles:
            async for client in create_test_client(role):
                response = await client.request(method, path, json=body)
                print(f"\nExpecting authorized for {role} client... ", end="")
                # Needs to get past validation and authorization
                assert response.status_code not in [401, 403, 422], (
                    f"Role {role} should be allowed to access {method} {path}, "
                    f"but got authentication error {response.status_code}\n"
                    f"Response: {response.text}"
                )
                print("✓", end="")

        # Test disallowed roles are rejected
        for role in all_roles - allowed_roles:
            async for client in create_test_client(role):
                print(f"\nExpecting forbidden for {role} client... ", end="")
                response = await client.request(method, path, json=body)
                assert_res_failure(response, ForbiddenException(detail="Insufficient privileges"))
                print("✓", end="")

        # Test unauthenticated requests are rejected
        async for unauthenticated_client in create_test_client(None):
            print("\nExpecting unauthorized for unauthenticated client... ", end="")
            response = await unauthenticated_client.request(method, path, json=body)
            assert_res_failure(response, CredentialsException())
            print("✓")

    return test_authentication


def generate_csv_empty_test(
    client_role: StringRole,
    endpoint: str,
    expected_headers: tuple,
):
    """Generate a test verifying an Excel CSV export endpoint returns only a header row when empty.

    Args:
        client_role: The role of the client used to make the request.
        endpoint: The endpoint path (e.g., "/api/students/csv").
        expected_headers: Tuple of expected column header strings.
    """

    @pytest.mark.asyncio
    async def test_csv_empty(
        create_test_client: Callable[..., AsyncGenerator[AsyncClient, Any]],
    ):
        async for client in create_test_client(client_role):
            response = await client.get(endpoint)
            assert response.status_code == 200
            assert (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                in response.headers["content-type"]
            )
            workbook = openpyxl.load_workbook(BytesIO(response.content))
            sheet = workbook.active
            assert sheet is not None
            rows = list(sheet.values)
            assert len(rows) == 1
            assert rows[0] == expected_headers
            assert sheet["A1"].font.bold is True

    return test_csv_empty


def assert_excel_response(
    response: Response,
    expected_headers: tuple,
    expected_row_count: int | None = None,
) -> list:
    """Assert standard Excel response properties and return all rows (including header).

    Args:
        response: The HTTP response from the CSV endpoint.
        expected_headers: Tuple of expected column header strings.
        expected_row_count: If provided, assert the total number of rows (header + data).

    Returns:
        List of row tuples from the workbook (rows[0] is the header row).
    """
    assert response.status_code == 200
    assert (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        in response.headers["content-type"]
    )
    workbook = openpyxl.load_workbook(BytesIO(response.content))
    sheet = workbook.active
    assert sheet is not None
    rows = list(sheet.values)
    assert rows[0] == expected_headers
    if expected_row_count is not None:
        assert len(rows) == expected_row_count
    return rows


def generate_filter_sort_tests(
    endpoint: str,
    dto_class: type[BaseModel],
    sort_fields: list[str],
    filter_cases: list[tuple[str, Any]],
):
    """Generate tests verifying each allowed sort/filter field works without error.

    Args:
        endpoint: The API endpoint path (e.g., "/api/incidents").
        dto_class: The DTO class to validate paginated response items against.
        sort_fields: List of field names allowed for sorting.
        filter_cases: List of (query_param_key, sample_value) tuples for filter testing.
    """

    @pytest.mark.parametrize(
        "sort_field,sort_order",
        [(f, o) for f in sort_fields for o in ["asc", "desc"]],
    )
    @pytest.mark.asyncio
    async def test_allowed_sort_fields(admin_client: AsyncClient, sort_field: str, sort_order: str):
        response = await admin_client.get(
            f"{endpoint}?sort_by={sort_field}&sort_order={sort_order}"
        )
        assert_res_paginated(response, dto_class)

    @pytest.mark.parametrize("filter_key,filter_value", filter_cases)
    @pytest.mark.asyncio
    async def test_allowed_filter_fields(
        admin_client: AsyncClient, filter_key: str, filter_value: Any
    ):
        response = await admin_client.get(f"{endpoint}?{filter_key}={filter_value}")
        assert_res_paginated(response, dto_class)

    return test_allowed_sort_fields, test_allowed_filter_fields


def generate_search_tests(
    endpoint: str,
    dto_class: type[BaseModel],
):
    """Generate generic search tests for a paginated list endpoint.

    Produces two tests:
    - test_search_no_results: a nonsense term returns an empty page
    - test_search_returns_ok: any search term is accepted without error

    Field-specific search tests (which fields are searched, case insensitivity)
    belong in each module's test file since they require module-specific fixtures.

    Args:
        endpoint: The API endpoint path (e.g., "/api/accounts").
        dto_class: The DTO class to validate paginated response items against.
    """

    @pytest.mark.asyncio
    async def test_search_no_results(admin_client: AsyncClient):
        """A nonsense search term should return an empty page."""
        response = await admin_client.get(f"{endpoint}?search=zzznomatch__xyzzy")
        assert_res_paginated(response, dto_class, total_records=0)

    @pytest.mark.asyncio
    async def test_search_returns_ok(admin_client: AsyncClient):
        """search param is accepted by the endpoint without error."""
        response = await admin_client.get(f"{endpoint}?search=test")
        assert_res_paginated(response, dto_class)

    return test_search_no_results, test_search_returns_ok
