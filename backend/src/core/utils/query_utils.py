"""
Core utilities for server-side pagination, sorting, and filtering.

This module provides reusable functions to apply pagination, sorting, and filtering
to SQLAlchemy queries in a type-safe and flexible manner.
"""

from collections.abc import Callable
from contextlib import suppress
from datetime import datetime
from enum import Enum
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, ValidationError, field_validator
from pydantic_core import ValidationError as PydanticValidationError
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Select, asc, desc, func, inspect, or_, select
from sqlalchemy import String as SAString
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeMeta
from src.core.exceptions import BadRequestException


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total_records: int
    page_size: int
    page_number: int
    total_pages: int


__all__ = [
    "PAGINATED_OPENAPI_PARAMS",
    "FilterOperator",
    "FilterParam",
    "ListQueryParam",
    "PaginatedResponse",
    "PaginationParams",
    "SortOrder",
    "SortParam",
    "apply_query_params",
    "apply_search",
    "get_paginated_results",
    "get_total_count",
    "parse_pagination_params",
]

# OpenAPI extra params for paginated endpoints
PAGINATED_OPENAPI_PARAMS: dict[str, Any] = {
    "parameters": [
        {
            "name": "page_number",
            "in": "query",
            "required": False,
            "schema": {"type": "integer", "default": 1, "minimum": 1},
            "description": "Page number (1-indexed)",
        },
        {
            "name": "page_size",
            "in": "query",
            "required": False,
            "schema": {"type": "integer", "minimum": 1, "maximum": 100},
            "description": "Items per page (default: all)",
        },
        {
            "name": "sort_by",
            "in": "query",
            "required": False,
            "schema": {"type": "string"},
            "description": "Field to sort by",
        },
        {
            "name": "sort_order",
            "in": "query",
            "required": False,
            "schema": {"type": "string", "enum": ["asc", "desc"], "default": "asc"},
            "description": "Sort order",
        },
        {
            "name": "filters",
            "in": "query",
            "required": False,
            "style": "form",
            "explode": True,
            "schema": {"type": "object", "additionalProperties": True},
            "description": "Filters: field=value, field_contains=value, "
            "field_gt=value, field_gte=value, field_lt=value, field_lte=value",
        },
        {
            "name": "search",
            "in": "query",
            "required": False,
            "schema": {"type": "string"},
            "description": "Full-table search across searchable string fields (case-insensitive)",
        },
    ]
}


class SortOrder(str, Enum):
    """Sort order enumeration."""

    ASC = "asc"
    DESC = "desc"


class FilterOperator(str, Enum):
    """Filter operators for different comparison types."""

    EQUALS = "eq"
    NOT_EQUALS = "ne"
    GREATER_THAN = "gt"
    GREATER_THAN_OR_EQUAL = "gte"
    LESS_THAN = "lt"
    LESS_THAN_OR_EQUAL = "lte"
    CONTAINS = "contains"  # For string fields (case-insensitive LIKE)
    IN = "in"  # For checking if value is in a list
    NOT_IN = "not_in"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


class PaginationParams(BaseModel):
    """Parameters for pagination."""

    page_number: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int | None = Field(
        default=None, ge=1, le=100, description="Items per page (None = all items)"
    )

    @property
    def skip(self) -> int:
        """Calculate offset from page_number and page_size."""
        if self.page_size is None:
            return 0
        return (self.page_number - 1) * self.page_size

    @property
    def limit(self) -> int | None:
        """Alias for page_size."""
        return self.page_size


class SortParam(BaseModel):
    """Single sorting parameter."""

    field: str = Field(..., description="Field name to sort by")
    order: SortOrder = Field(default=SortOrder.ASC, description="Sort order")


class FilterParam(BaseModel):
    """Single filter parameter."""

    field: str = Field(..., description="Field name to filter on")
    operator: FilterOperator = Field(..., description="Comparison operator")
    value: Any | None = Field(default=None, description="Value to compare against")

    @field_validator("value")
    @classmethod
    def validate_value_for_operator(cls, v: Any, info: Any) -> Any:
        """Validate that value is appropriate for the operator."""
        operator = info.data.get("operator")

        if operator in [FilterOperator.IS_NULL, FilterOperator.IS_NOT_NULL]:
            # These operators don't need a value
            return None

        if operator in [FilterOperator.IN, FilterOperator.NOT_IN] and not isinstance(v, list):
            # These operators need a list
            raise ValueError(f"Operator {operator} requires a list value")

        return v


class ListQueryParam(BaseModel):
    """Combined parameters for pagination, sorting, filtering, and search."""

    pagination: PaginationParams | None = Field(default=None)
    sort: list[SortParam] | None = Field(default=None)
    filters: list[FilterParam] | None = Field(default=None)
    search: str | None = Field(default=None)


def apply_pagination(query: Select, params: PaginationParams | None = None) -> Select:
    """
    Apply pagination to a SQLAlchemy query.

    Args:
        query: The base SQLAlchemy query
        params: Pagination parameters (page_number, page_size)

    Returns:
        Modified query with LIMIT and OFFSET applied
    """
    if params is None:
        return query

    # Only apply offset if it's greater than 0 (MySQL requires ORDER BY with OFFSET)
    if params.skip > 0:
        query = query.offset(params.skip)
    if params.limit is not None:
        query = query.limit(params.limit)

    return query


def apply_sorting[ModelType: DeclarativeMeta](
    query: Select,
    model: type[ModelType] | None,
    sort_params: list[SortParam] | None = None,
    allowed_fields: list[str] | None = None,
    nested_field_columns: dict[str, Any] | None = None,
) -> Select:
    """
    Apply sorting to a SQLAlchemy query.

    Args:
        query: The base SQLAlchemy query
        model: The SQLAlchemy model class
        sort_params: List of sorting parameters
        allowed_fields: Optional list of fields that can be sorted on
        nested_field_columns: Optional mapping of field names to joined column refs

    Returns:
        Modified query with ORDER BY applied

    Raises:
        BadRequestException: If attempting to sort on a disallowed or non-existent field
    """
    if not sort_params:
        return query

    for sort_param in sort_params:
        if nested_field_columns and sort_param.field in nested_field_columns:
            if allowed_fields and sort_param.field not in allowed_fields:
                raise BadRequestException(f"Sorting on field '{sort_param.field}' is not allowed")
            field = nested_field_columns[sort_param.field]
        else:
            if model is None or not hasattr(model, sort_param.field):
                raise BadRequestException(f"Field '{sort_param.field}' does not exist on model")
            if allowed_fields and sort_param.field not in allowed_fields:
                raise BadRequestException(f"Sorting on field '{sort_param.field}' is not allowed")
            field = getattr(model, sort_param.field)

        # Apply sort order
        if sort_param.order == SortOrder.DESC:
            query = query.order_by(desc(field))
        else:
            query = query.order_by(asc(field))

    return query


def _convert_enum_value(field_column: Any, value: Any) -> Any:
    """Convert string value to enum if the field is an Enum column."""
    # Check if field has a type attribute with an enum_class (SQLAlchemy Enum)
    if hasattr(field_column, "type") and hasattr(field_column.type, "enum_class"):
        enum_class = field_column.type.enum_class
        if enum_class is not None and isinstance(value, str):
            # Try to get the enum member by value
            for member in enum_class:
                if member.value == value:
                    return member
    return value


def _validate_operator_for_field_type(field: Any, operator: FilterOperator) -> None:
    """Raise BadRequestException if operator is incompatible with the field's column type."""
    if not hasattr(field, "type"):
        return
    is_string = isinstance(field.type, SAString)
    is_enum = isinstance(field.type, SAEnum)
    comparison_ops = {
        FilterOperator.GREATER_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN,
        FilterOperator.LESS_THAN_OR_EQUAL,
    }
    if (is_string or is_enum) and operator in comparison_ops:
        raise BadRequestException(
            f"Operator '{operator.value}' is not supported for string/enum fields"
        )
    if not is_string and operator == FilterOperator.CONTAINS:
        raise BadRequestException("Operator 'contains' is only supported for string fields")


def _escape_like_wildcards(value: str, escape_char: str = "\\") -> str:
    """Escape SQL LIKE wildcard characters so user input is treated literally."""
    escaped = value.replace(escape_char, escape_char * 2)
    escaped = escaped.replace("%", f"{escape_char}%")
    escaped = escaped.replace("_", f"{escape_char}_")
    return escaped


def apply_filters[ModelType: DeclarativeMeta](
    query: Select,
    model: type[ModelType] | None,
    filter_params: list[FilterParam] | None = None,
    allowed_fields: list[str] | None = None,
    nested_field_columns: dict[str, Any] | None = None,
) -> Select:
    """
    Apply filters to a SQLAlchemy query.

    Args:
        query: The base SQLAlchemy query
        model: The SQLAlchemy model class
        filter_params: List of filter parameters
        allowed_fields: Optional list of fields that can be filtered on
        nested_field_columns: Optional mapping of field names to joined column refs

    Returns:
        Modified query with WHERE clauses applied

    Raises:
        BadRequestException: If attempting to filter on a disallowed or non-existent field
    """
    if not filter_params:
        return query

    for filter_param in filter_params:
        if nested_field_columns and filter_param.field in nested_field_columns:
            if allowed_fields and filter_param.field not in allowed_fields:
                raise BadRequestException(
                    f"Filtering on field '{filter_param.field}' is not allowed"
                )
            field = nested_field_columns[filter_param.field]
        else:
            if model is None or not hasattr(model, filter_param.field):
                raise BadRequestException(f"Field '{filter_param.field}' does not exist on model")
            if allowed_fields and filter_param.field not in allowed_fields:
                raise BadRequestException(
                    f"Filtering on field '{filter_param.field}' is not allowed"
                )
            field = getattr(model, filter_param.field)

        # Validate operator compatibility with field type
        _validate_operator_for_field_type(field, filter_param.operator)

        # Convert value to enum if needed
        value = _convert_enum_value(field, filter_param.value)

        # Apply the appropriate filter based on operator
        if filter_param.operator == FilterOperator.EQUALS:
            query = query.where(field == value)
        elif filter_param.operator == FilterOperator.NOT_EQUALS:
            query = query.where(field != value)
        elif filter_param.operator == FilterOperator.GREATER_THAN:
            query = query.where(field > value)
        elif filter_param.operator == FilterOperator.GREATER_THAN_OR_EQUAL:
            query = query.where(field >= value)
        elif filter_param.operator == FilterOperator.LESS_THAN:
            query = query.where(field < value)
        elif filter_param.operator == FilterOperator.LESS_THAN_OR_EQUAL:
            query = query.where(field <= value)
        elif filter_param.operator == FilterOperator.CONTAINS:
            # Case-insensitive LIKE for string fields
            escaped_value = _escape_like_wildcards(str(value))
            query = query.where(field.ilike(f"%{escaped_value}%", escape="\\"))
        elif filter_param.operator == FilterOperator.IN:
            query = query.where(field.in_(value))
        elif filter_param.operator == FilterOperator.NOT_IN:
            query = query.where(~field.in_(value))
        elif filter_param.operator == FilterOperator.IS_NULL:
            query = query.where(field.is_(None))
        elif filter_param.operator == FilterOperator.IS_NOT_NULL:
            query = query.where(field.is_not(None))

    return query


def apply_search(query: Select, search: str, search_columns: list[Any]) -> Select:
    """Apply case-insensitive search across multiple string columns using OR ilike.

    Each entry in ``search_columns`` may be either:
    - a single SQLAlchemy column, matched directly with ``ILIKE %search%``; or
    - a list/tuple of columns, concatenated with a single space and matched as a
      single value (useful for "full name" style searches across split fields).
    """
    if not search_columns:
        return query
    pattern = f"%{search}%"
    conditions = []
    for col in search_columns:
        if isinstance(col, list | tuple):
            if not col:
                continue
            # Concatenate columns with a space between them for full-name style matching.
            # Use func.concat (instead of the `+` operator) so NULL values are handled
            # safely by the database (MySQL's CONCAT treats NULLs as empty strings).
            concat_args: list[Any] = []
            for index, sub_col in enumerate(col):
                if index > 0:
                    concat_args.append(" ")
                concat_args.append(sub_col)
            conditions.append(func.concat(*concat_args).ilike(pattern))
        else:
            conditions.append(col.ilike(pattern))
    if not conditions:
        return query
    return query.where(or_(*conditions))


def apply_query_params[ModelType: DeclarativeMeta](
    query: Select,
    model: type[ModelType] | None,
    params: ListQueryParam | None = None,
    allowed_sort_fields: list[str] | None = None,
    allowed_filter_fields: list[str] | None = None,
    nested_field_columns: dict[str, Any] | None = None,
) -> Select:
    """
    Apply all query parameters (filtering, sorting, pagination) to a query.

    This is the main utility function that combines all operations.

    Args:
        query: The base SQLAlchemy query
        model: The SQLAlchemy model class
        params: Combined query parameters
        allowed_sort_fields: Optional list of fields that can be sorted on
        allowed_filter_fields: Optional list of fields that can be filtered on
        nested_field_columns: Optional mapping of field names to joined column refs

    Returns:
        Modified query with filters, sorting, and pagination applied
    """
    if params is None:
        return query

    # Apply filters first (narrows down the dataset)
    if params.filters:
        query = apply_filters(
            query, model, params.filters, allowed_filter_fields, nested_field_columns
        )

    # Apply sorting (before pagination to ensure consistent ordering)
    if params.sort:
        query = apply_sorting(query, model, params.sort, allowed_sort_fields, nested_field_columns)
    elif (
        params.pagination
        and (params.pagination.skip > 0 or params.pagination.limit is not None)
        and model is not None
    ):
        # MySQL requires ORDER BY when using OFFSET or LIMIT
        # Default to sorting by primary key if no explicit sort is provided and pagination is active
        # Get the primary key column(s) from the model's mapper
        mapper = inspect(model)
        if mapper is None:
            raise BadRequestException(
                f"Cannot inspect model {model.__name__}: not a valid SQLAlchemy model"
            )

        primary_key_columns = list(mapper.primary_key)
        if primary_key_columns:
            # Order by the first primary key column
            query = query.order_by(asc(primary_key_columns[0]))

    # Apply pagination last
    pagination_params = params.pagination
    if pagination_params:
        query = apply_pagination(query, pagination_params)

    return query


async def get_total_count(
    session: AsyncSession,
    base_query: Select,
) -> int:
    """
    Get the total count of results for a query (before pagination).

    Args:
        session: SQLAlchemy async session
        base_query: The base query (with filters but before pagination)

    Returns:
        Total number of results
    """
    # Use select(func.count()).select_from(base_query.subquery()) for proper counting
    count_query = select(func.count()).select_from(base_query.subquery())
    result = await session.execute(count_query)
    return result.scalar() or 0


def _parse_filter_value(value: str) -> int | datetime | str:
    """
    Parse a filter value string into the appropriate type.

    Attempts to parse as:
    1. Integer (e.g., "123")
    2. DateTime with timezone (e.g., "2024-01-01T12:00:00+00:00")
    3. DateTime without timezone (e.g., "2024-01-01T12:00:00")
    4. Date only (e.g., "2024-01-01")
    5. Falls back to string if none match
    """
    # Try integer
    with suppress(ValueError):
        return int(value)

    # Try datetime with timezone (ISO format)
    with suppress(ValueError):
        return datetime.fromisoformat(value)

    # Try date only (add time component)
    with suppress(ValueError):
        return datetime.strptime(value, "%Y-%m-%d")

    # Return as string
    return value


def parse_pagination_params(
    request: Request,
    allowed_sort_fields: list[str],
    allowed_filter_fields: list[str],
) -> ListQueryParam:
    """
    Parse pagination, sorting, and filtering params from FastAPI request.

    Args:
        request: FastAPI request object
        allowed_sort_fields: Whitelist of allowed sort fields
        allowed_filter_fields: Whitelist of allowed filter fields

    Returns:
        ListQueryParam object ready to use with apply_query_params
    """
    query_params_dict = dict(request.query_params)

    # Parse pagination
    page_number = int(query_params_dict.get("page_number", 1))
    page_size_str = query_params_dict.get("page_size")
    page_size = int(page_size_str) if page_size_str is not None else None
    try:
        pagination_params = PaginationParams(page_number=page_number, page_size=page_size)
    except (ValueError, ValidationError) as e:
        raise (
            RequestValidationError(errors=e.errors())
            if isinstance(e, PydanticValidationError)
            else RequestValidationError(errors=[{"type": "value_error", "msg": str(e)}])
        ) from None

    # Parse sorting
    sort_params: list[SortParam] | None = None
    if "sort_by" in query_params_dict:
        sort_by = query_params_dict["sort_by"]
        sort_order = query_params_dict.get("sort_order", "asc")
        if sort_by in allowed_sort_fields:
            sort_params = [SortParam(field=sort_by, order=SortOrder(sort_order))]

    # Parse filters
    filter_params: list[FilterParam] = []

    # Operator suffix mappings
    list_operator_suffixes = {
        "_in": FilterOperator.IN,
        "_not_in": FilterOperator.NOT_IN,
    }
    operator_suffixes = {
        "_gt": FilterOperator.GREATER_THAN,
        "_gte": FilterOperator.GREATER_THAN_OR_EQUAL,
        "_lt": FilterOperator.LESS_THAN,
        "_lte": FilterOperator.LESS_THAN_OR_EQUAL,
        "_contains": FilterOperator.CONTAINS,
    }

    for field in allowed_filter_fields:
        # Check for exact match filter (e.g., location_id=5)
        if field in query_params_dict:
            value = _parse_filter_value(query_params_dict[field])
            filter_params.append(
                FilterParam(field=field, operator=FilterOperator.EQUALS, value=value)
            )

        # Check for list operator suffix filters (e.g., role_in=admin,staff)
        for suffix, operator in list_operator_suffixes.items():
            param_name = f"{field}{suffix}"
            if param_name in query_params_dict:
                value = [_parse_filter_value(v) for v in query_params_dict[param_name].split(",")]
                filter_params.append(FilterParam(field=field, operator=operator, value=value))

        # Check for operator suffix filters (e.g., party_datetime_gte=2024-01-01)
        for suffix, operator in operator_suffixes.items():
            param_name = f"{field}{suffix}"
            if param_name in query_params_dict:
                value = _parse_filter_value(query_params_dict[param_name])
                filter_params.append(FilterParam(field=field, operator=operator, value=value))

    search = query_params_dict.get("search") or None

    return ListQueryParam(
        pagination=pagination_params,
        sort=sort_params,
        filters=filter_params if filter_params else None,
        search=search,
    )


async def get_paginated_results[ModelType](
    session: AsyncSession,
    base_query: Select,
    entity_class: type | None,
    dto_converter: Callable[[Any], ModelType],
    query_params: ListQueryParam,
    allowed_sort_fields: list[str],
    allowed_filter_fields: list[str],
    nested_field_columns: dict[str, Any] | None = None,
    search_columns: list[Any] | None = None,
    use_mappings: bool = False,
) -> PaginatedResponse[ModelType]:
    """
    Generic function to apply filters, search, sorting, pagination and return paginated results.

    Args:
        session: SQLAlchemy async session
        base_query: Base SELECT query with joins/options already applied
        entity_class: The entity class (e.g., PartyEntity)
        dto_converter: Function to convert entity to DTO (e.g., lambda e: e.to_dto())
        query_params: Query parameters (filters, sort, pagination, search)
        allowed_sort_fields: Whitelist of fields allowed for sorting
        allowed_filter_fields: Whitelist of fields allowed for filtering
        nested_field_columns: Optional mapping of field names to joined column refs
        search_columns: Optional list of columns/groups to search across.
            Each entry may be a single column or a list/tuple of columns to be
            concatenated with a space (e.g. ``[first_name, last_name]`` enables
            matching against the full name).
        use_mappings: When True, fetch rows as mapping objects instead of scalars.

    Returns:
        PaginatedResponse with items and metadata
    """
    # Apply filters and sorting (but not pagination yet - need count first)
    filtered_query = apply_query_params(
        base_query,
        entity_class,
        ListQueryParam(filters=query_params.filters, sort=query_params.sort),
        allowed_sort_fields=allowed_sort_fields,
        allowed_filter_fields=allowed_filter_fields,
        nested_field_columns=nested_field_columns,
    )

    # Apply full-table search if provided
    if query_params.search and search_columns:
        filtered_query = apply_search(filtered_query, query_params.search, search_columns)

    # Get total count after filters but before pagination
    total_records = await get_total_count(session, filtered_query)

    # Now apply pagination
    paginated_query = apply_query_params(
        filtered_query,
        entity_class,
        ListQueryParam(pagination=query_params.pagination),
    )

    # Execute query
    result = await session.execute(paginated_query)
    entities = result.mappings().all() if use_mappings else result.scalars().all()

    # Convert to DTOs
    dtos = [dto_converter(entity) for entity in entities]

    # Calculate metadata
    page_number = query_params.pagination.page_number if query_params.pagination else 1
    page_size = query_params.pagination.page_size if query_params.pagination else total_records

    if page_size is None:
        actual_page_size = total_records
        total_pages = 1 if total_records > 0 else 0
        actual_page_number = 1
    else:
        actual_page_size = page_size
        actual_page_number = page_number
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

    return PaginatedResponse(
        items=dtos,
        total_records=total_records,
        page_size=actual_page_size,
        page_number=actual_page_number,
        total_pages=total_pages,
    )
