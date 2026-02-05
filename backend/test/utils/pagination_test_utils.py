"""
Reusable test utilities for pagination, sorting, and filtering endpoints.

These utilities help test 'get all' routes across different modules without
duplicating test logic.
"""

from collections.abc import Awaitable, Callable
from typing import Any

from httpx import AsyncClient
from pydantic import BaseModel

from test.utils.http.assertions import assert_res_paginated


async def assert_basic_pagination[T: BaseModel](
    client: AsyncClient,
    endpoint: str,
    create_items: Callable[[int], Awaitable[None]],
    dto_class: type[T],
    num_items: int = 15,
) -> None:
    """
    Test basic pagination functionality for any endpoint.

    Args:
        client: HTTP client
        endpoint: API endpoint (e.g., "/api/parties/")
        create_items: Async function that creates n items
        dto_class: Expected DTO class for items
        num_items: Number of items to create for testing
    """
    # Create test items
    await create_items(num_items)

    # Test first page
    response = await client.get(f"{endpoint}?page_number=1&page_size=10")
    paginated = assert_res_paginated(
        response, dto_class, total_records=num_items, page_size=10, total_pages=2, page_number=1
    )
    assert len(paginated.items) == 10

    # Test second page
    response = await client.get(f"{endpoint}?page_number=2&page_size=10")
    paginated = assert_res_paginated(
        response, dto_class, total_records=num_items, page_size=10, total_pages=2, page_number=2
    )
    assert len(paginated.items) == 5


async def assert_sorting[T: BaseModel](
    client: AsyncClient,
    endpoint: str,
    create_sorted_items: Callable[[], Awaitable[None]],
    dto_class: type[T],
    sort_field: str,
    get_sort_value: Callable[[T], Any],
) -> None:
    """
    Test sorting functionality for any endpoint.

    Args:
        client: HTTP client
        endpoint: API endpoint
        create_sorted_items: Async function that creates items with different sort values
        dto_class: Expected DTO class
        sort_field: Field name to sort by
        get_sort_value: Function to extract sort value from DTO (e.g., lambda x: x.created_at)
    """
    # Create items with different sort values
    await create_sorted_items()

    # Test ascending
    response = await client.get(f"{endpoint}?sort_by={sort_field}&sort_order=asc")
    paginated = assert_res_paginated(response, dto_class)
    values = [get_sort_value(item) for item in paginated.items]
    assert values == sorted(values), "Items not sorted in ascending order"

    # Test descending
    response = await client.get(f"{endpoint}?sort_by={sort_field}&sort_order=desc")
    paginated = assert_res_paginated(response, dto_class)
    values = [get_sort_value(item) for item in paginated.items]
    assert values == sorted(values, reverse=True), "Items not sorted in descending order"


async def assert_filtering[T: BaseModel](
    client: AsyncClient,
    endpoint: str,
    create_filtered_items: Callable[[], Awaitable[None]],
    dto_class: type[T],
    filter_params: dict[str, Any],
    expected_count: int,
    match_fn: Callable[[T], bool],
) -> None:
    """
    Test filtering functionality for any endpoint.

    Args:
        client: HTTP client
        endpoint: API endpoint
        create_filtered_items: Async function that creates items (some matching filter, some not)
        dto_class: Expected DTO class
        filter_params: Query parameters for filtering (e.g., {"location_id": 5})
        expected_count: Expected number of items after filtering
        match_fn: Function to verify item matches filter (e.g., lambda item: item.location_id == 5)
    """
    # Create items
    await create_filtered_items()

    # Build query string
    query_string = "&".join(f"{k}={v}" for k, v in filter_params.items())

    # Test filter
    response = await client.get(f"{endpoint}?{query_string}")
    paginated = assert_res_paginated(response, dto_class, total_records=expected_count)

    # Verify all items match filter
    assert all(match_fn(item) for item in paginated.items), "Not all items match filter"


async def assert_combined_features[T: BaseModel](
    client: AsyncClient,
    endpoint: str,
    create_items: Callable[[], Awaitable[None]],
    dto_class: type[T],
    filter_params: dict[str, Any],
    sort_field: str,
    expected_filtered_count: int,
    page_size: int = 5,
) -> None:
    """
    Test pagination + sorting + filtering together.

    Args:
        client: HTTP client
        endpoint: API endpoint
        create_items: Async function that creates items
        dto_class: Expected DTO class
        filter_params: Filter parameters
        sort_field: Field to sort by
        expected_filtered_count: Expected count after filtering
        page_size: Page size for pagination
    """
    # Create items
    await create_items()

    # Build query string
    filter_query = "&".join(f"{k}={v}" for k, v in filter_params.items())
    full_query = f"{filter_query}&sort_by={sort_field}&sort_order=desc&page_size={page_size}"

    # Test combined features
    response = await client.get(f"{endpoint}?{full_query}")
    expected_pages = (expected_filtered_count + page_size - 1) // page_size
    paginated = assert_res_paginated(
        response,
        dto_class,
        total_records=expected_filtered_count,
        page_size=page_size,
        total_pages=expected_pages,
    )
    assert len(paginated.items) <= page_size
