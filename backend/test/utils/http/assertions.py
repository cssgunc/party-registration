from typing import Any, Optional, TypeVar, get_args, get_origin, overload

from fastapi import HTTPException
from httpx import Response
from pydantic import BaseModel
from src.core.models import PaginatedResponse

T = TypeVar("T", bound=BaseModel)


@overload
def assert_res_success(res: Response, ExpectedModel: type[T], *, status: Optional[int] = 200) -> T:
    pass


@overload
def assert_res_success(
    res: Response, ExpectedModel: type[list[T]], *, status: Optional[int] = 200
) -> list[T]:
    pass


def assert_res_success(
    res: Response,
    ExpectedModel: type[T] | type[list[T]],
    *,
    status: Optional[int] = 200,
) -> T | list[T]:
    if status is not None:
        assert res.status_code == status, (
            f"Expected status {status}, got {res.status_code}. Response: {res.text}"
        )
    else:
        assert res.status_code < 400, (
            f"Expected status < 400, got {res.status_code}. Response: {res.text}"
        )

    content_type = res.headers.get("content-type", "")
    assert "application/json" in content_type, (
        f"Expected Content-Type to contain 'application/json', got '{content_type}'"
    )

    data = res.json()
    assert data is not None, "Expected response data but got None"

    model_origin = get_origin(ExpectedModel)
    if model_origin is list:
        assert isinstance(data, list), f"Expected list response but got {type(data).__name__}"

        args = get_args(ExpectedModel)
        assert args is not None, "Expected type args for list model but got None"
        assert len(args) > 0, "Expected at least one type arg for list model but got empty args"

        inner_model = args[0]
        inner_fields = set(inner_model.model_fields.keys())
        for item in data:
            extra = set(item.keys()) - inner_fields
            assert not extra, f"Unexpected fields {extra} in response data item: {item}"
        return [inner_model(**item) for item in res.json()]

    # Single model case
    assert isinstance(data, dict), f"Expected dict response but got {type(data).__name__}"

    assert isinstance(ExpectedModel, type) and issubclass(ExpectedModel, BaseModel)
    model_fields = set(ExpectedModel.model_fields.keys())
    extra_fields = set(data.keys()) - model_fields
    assert not extra_fields, f"Unexpected fields {extra_fields} in response data: {data}"
    return ExpectedModel(**data)


def assert_res_failure(res: Response, expected_error: HTTPException) -> dict[str, Any]:
    assert res.status_code == expected_error.status_code, (
        f"Expected status {expected_error.status_code}, got {res.status_code}. Response: {res.text}"
    )

    content_type = res.headers.get("content-type", "")
    assert "application/json" in content_type, (
        f"Expected Content-Type to contain 'application/json', got '{content_type}'"
    )

    if hasattr(expected_error, "headers") and expected_error.headers:
        for header_name, header_value in expected_error.headers.items():
            actual_value = res.headers.get(header_name)
            assert actual_value == header_value, (
                f"Expected header '{header_name}' to be '{header_value}', got '{actual_value}'"
            )

    data = res.json()
    assert data is not None, "Expected response data but got None"
    assert isinstance(data, dict), f"Expected dict response but got {type(data).__name__}"
    assert "message" in data, "Expected 'message' in response data but got None"

    message = data["message"]
    assert isinstance(message, str), (
        f"Expected 'message' to be a string but got {type(message).__name__}"
    )

    assert message == expected_error.detail, (
        f"Expected error message '{expected_error.detail}', got '{message}'"
    )

    return data


def assert_res_validation_error(
    res: Response, *, expected_fields: Optional[list[str]] = None
) -> dict[str, Any]:
    """
    Assert that a response is a FastAPI validation error (422).

    Args:
        res: The HTTP response to check
        expected_fields: Optional list of field names that should have validation errors

    Returns:
        The response data dict containing the validation error details
    """
    assert res.status_code == 422, (
        f"Expected validation error status 422, got {res.status_code}. Response: {res.text}"
    )

    content_type = res.headers.get("content-type", "")
    assert "application/json" in content_type, (
        f"Expected Content-Type to contain 'application/json', got '{content_type}'"
    )

    data = res.json()
    assert data is not None, "Expected response data but got None"
    assert isinstance(data, dict), f"Expected dict response but got {type(data).__name__}"
    assert "detail" in data, "Expected 'detail' in validation error response"

    detail = data["detail"]
    assert isinstance(detail, list), (
        f"Expected 'detail' to be a list but got {type(detail).__name__}"
    )
    assert len(detail) > 0, "Expected at least one validation error in 'detail'"

    # Verify each error has the expected structure
    for error in detail:
        assert isinstance(error, dict), (
            f"Expected each error to be a dict but got {type(error).__name__}"
        )
        assert "loc" in error, f"Expected 'loc' in validation error: {error}"
        assert "msg" in error, f"Expected 'msg' in validation error: {error}"
        assert "type" in error, f"Expected 'type' in validation error: {error}"

    # If expected fields are provided, verify they appear in the errors
    if expected_fields is not None:
        error_fields = set()
        for error in detail:
            # loc is typically ["body", "field_name"] or ["query", "field_name"]
            loc = error["loc"]
            if len(loc) >= 2:
                error_fields.add(loc[-1])  # Get the field name (last item in loc)

        missing_fields = set(expected_fields) - error_fields
        assert not missing_fields, (
            f"Expected validation errors for fields {expected_fields}, "
            f"but missing errors for: {missing_fields}. "
            f"Found errors for: {error_fields}"
        )

    return data


def assert_res_paginated(
    res: Response,
    ItemModel: type[T],
    *,
    total_records: Optional[int] = None,
    page_number: int = 1,
    page_size: Optional[int] = None,
    total_pages: Optional[int] = None,
) -> PaginatedResponse[T]:
    """
    Assert that a response is a successful paginated response.

    Args:
        res: The HTTP response to check
        ItemModel: The expected type of items in the paginated response
        total_records: Optional expected total_records count
        page_number: Expected page number (default 1)
        page_size: Optional expected page size
        total_pages: Optional expected total_pages count (calculated automatically
            from total_records and page_size if both are provided and this is None)
    Returns:
        The paginated response with items converted to the expected model type
    """
    assert res.status_code == 200, (
        f"Expected status 200, got {res.status_code}. Response: {res.text}"
    )

    content_type = res.headers.get("content-type", "")
    assert "application/json" in content_type, (
        f"Expected Content-Type to contain 'application/json', got '{content_type}'"
    )

    data = res.json()
    assert data is not None, "Expected response data but got None"
    assert isinstance(data, dict), f"Expected dict response but got {type(data).__name__}"

    # Check for required pagination fields
    required_fields = ["items", "total_records", "page_size", "page_number", "total_pages"]
    for field in required_fields:
        assert field in data, f"Expected '{field}' in paginated response"

    # Validate items
    items = data["items"]
    assert isinstance(items, list), f"Expected items to be a list but got {type(items).__name__}"

    # Convert items to model instances
    item_fields = set(ItemModel.model_fields.keys())
    converted_items = []
    for item in items:
        extra = set(item.keys()) - item_fields
        assert not extra, f"Unexpected fields {extra} in response item: {item}"
        converted_items.append(ItemModel(**item))

    # Validate pagination metadata
    if total_records is not None:
        assert data["total_records"] == total_records, (
            f"Expected total_records={total_records}, got {data['total_records']}"
        )

    assert data["page_number"] == page_number, (
        f"Expected page_number={page_number}, got {data['page_number']}"
    )

    if page_size is not None:
        assert data["page_size"] == page_size, (
            f"Expected page_size={page_size}, got {data['page_size']}"
        )

    # Calculate expected_total_pages if not provided but both total and page_size are known
    if total_pages is None and total_records is not None and page_size is not None:
        if page_size > 0:
            total_pages = (
                (total_records + page_size - 1) // page_size
                if total_records > 0
                else 0
            )
        else:
            # Page size of 0 means all results on one page (no pagination)
            total_pages = 0 if total_records == 0 else 1

    if total_pages is not None:
        assert data["total_pages"] == total_pages, (
            f"Expected total_pages={total_pages}, got {data['total_pages']}"
        )

    # Return a properly typed PaginatedResponse
    return PaginatedResponse[ItemModel](
        items=converted_items,
        total_records=data["total_records"],
        page_size=data["page_size"],
        page_number=data["page_number"],
        total_pages=data["total_pages"],
    )
