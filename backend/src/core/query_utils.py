"""
Core utilities for server-side pagination, sorting, and filtering.

This module provides reusable functions to apply pagination, sorting, and filtering
to SQLAlchemy queries in a type-safe and flexible manner.
"""

from collections.abc import Callable
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Select, asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeMeta
from src.core.models import PaginatedResponse

__all__ = [
    "FilterOperator",
    "FilterParam",
    "PaginatedResponse",
    "PaginationParams",
    "QueryParams",
    "SortOrder",
    "SortParam",
    "apply_query_params",
    "get_paginated_results",
    "get_total_count",
]


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


class QueryParams(BaseModel):
    """Combined parameters for pagination, sorting, and filtering."""

    pagination: PaginationParams | None = Field(default=None)
    sort: list[SortParam] | None = Field(default=None)
    filters: list[FilterParam] | None = Field(default=None)


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

    query = query.offset(params.skip)
    if params.limit is not None:
        query = query.limit(params.limit)

    return query


def apply_sorting[ModelType: DeclarativeMeta](
    query: Select,
    model: type[ModelType],
    sort_params: list[SortParam] | None = None,
    allowed_fields: list[str] | None = None,
) -> Select:
    """
    Apply sorting to a SQLAlchemy query.

    Args:
        query: The base SQLAlchemy query
        model: The SQLAlchemy model class
        sort_params: List of sorting parameters
        allowed_fields: Optional list of fields that can be sorted on

    Returns:
        Modified query with ORDER BY applied

    Raises:
        ValueError: If attempting to sort on a disallowed or non-existent field
    """
    if not sort_params:
        return query

    for sort_param in sort_params:
        # Validate field exists and is allowed
        if not hasattr(model, sort_param.field):
            raise ValueError(f"Field '{sort_param.field}' does not exist on model")

        if allowed_fields and sort_param.field not in allowed_fields:
            raise ValueError(f"Sorting on field '{sort_param.field}' is not allowed")

        # Get the model attribute
        field = getattr(model, sort_param.field)

        # Apply sort order
        if sort_param.order == SortOrder.DESC:
            query = query.order_by(desc(field))
        else:
            query = query.order_by(asc(field))

    return query


def apply_filters[ModelType: DeclarativeMeta](
    query: Select,
    model: type[ModelType],
    filter_params: list[FilterParam] | None = None,
    allowed_fields: list[str] | None = None,
) -> Select:
    """
    Apply filters to a SQLAlchemy query.

    Args:
        query: The base SQLAlchemy query
        model: The SQLAlchemy model class
        filter_params: List of filter parameters
        allowed_fields: Optional list of fields that can be filtered on

    Returns:
        Modified query with WHERE clauses applied

    Raises:
        ValueError: If attempting to filter on a disallowed or non-existent field
    """
    if not filter_params:
        return query

    for filter_param in filter_params:
        # Validate field exists and is allowed
        if not hasattr(model, filter_param.field):
            raise ValueError(f"Field '{filter_param.field}' does not exist on model")

        if allowed_fields and filter_param.field not in allowed_fields:
            raise ValueError(f"Filtering on field '{filter_param.field}' is not allowed")

        # Get the model attribute
        field = getattr(model, filter_param.field)

        # Apply the appropriate filter based on operator
        if filter_param.operator == FilterOperator.EQUALS:
            query = query.where(field == filter_param.value)
        elif filter_param.operator == FilterOperator.NOT_EQUALS:
            query = query.where(field != filter_param.value)
        elif filter_param.operator == FilterOperator.GREATER_THAN:
            query = query.where(field > filter_param.value)
        elif filter_param.operator == FilterOperator.GREATER_THAN_OR_EQUAL:
            query = query.where(field >= filter_param.value)
        elif filter_param.operator == FilterOperator.LESS_THAN:
            query = query.where(field < filter_param.value)
        elif filter_param.operator == FilterOperator.LESS_THAN_OR_EQUAL:
            query = query.where(field <= filter_param.value)
        elif filter_param.operator == FilterOperator.CONTAINS:
            # Case-insensitive LIKE for string fields
            query = query.where(field.ilike(f"%{filter_param.value}%"))
        elif filter_param.operator == FilterOperator.IN:
            query = query.where(field.in_(filter_param.value))
        elif filter_param.operator == FilterOperator.NOT_IN:
            query = query.where(~field.in_(filter_param.value))
        elif filter_param.operator == FilterOperator.IS_NULL:
            query = query.where(field.is_(None))
        elif filter_param.operator == FilterOperator.IS_NOT_NULL:
            query = query.where(field.is_not(None))

    return query


def apply_query_params[ModelType: DeclarativeMeta](
    query: Select,
    model: type[ModelType],
    params: QueryParams | None = None,
    allowed_sort_fields: list[str] | None = None,
    allowed_filter_fields: list[str] | None = None,
) -> tuple[Select, PaginationParams | None]:
    """
    Apply all query parameters (filtering, sorting, pagination) to a query.

    This is the main utility function that combines all operations.

    Args:
        query: The base SQLAlchemy query
        model: The SQLAlchemy model class
        params: Combined query parameters
        allowed_sort_fields: Optional list of fields that can be sorted on
        allowed_filter_fields: Optional list of fields that can be filtered on

    Returns:
        Tuple of (modified query, pagination params used)
    """
    if params is None:
        return query, None

    # Apply filters first (narrows down the dataset)
    if params.filters:
        query = apply_filters(query, model, params.filters, allowed_filter_fields)

    # Apply sorting (before pagination to ensure consistent ordering)
    if params.sort:
        query = apply_sorting(query, model, params.sort, allowed_sort_fields)

    # Apply pagination last
    pagination_params = params.pagination
    if pagination_params:
        query = apply_pagination(query, pagination_params)

    return query, pagination_params


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


async def get_paginated_results[ModelType](
    session: AsyncSession,
    base_query: Select,
    entity_class: type,
    dto_converter: Callable[[Any], ModelType],
    query_params: QueryParams,
    allowed_sort_fields: list[str],
    allowed_filter_fields: list[str],
) -> tuple[list[ModelType], int]:
    """
    Generic function to apply filters, sorting, pagination and return results.

    Args:
        session: SQLAlchemy async session
        base_query: Base SELECT query with joins/options already applied
        entity_class: The entity class (e.g., PartyEntity)
        dto_converter: Function to convert entity to DTO (e.g., lambda e: e.to_dto())
        query_params: Query parameters (filters, sort, pagination)
        allowed_sort_fields: Whitelist of fields allowed for sorting
        allowed_filter_fields: Whitelist of fields allowed for filtering

    Returns:
        Tuple of (list of DTOs, total_records)
    """
    # Apply filters and sorting (but not pagination yet - need count first)
    filtered_query, _ = apply_query_params(
        base_query,
        entity_class,
        QueryParams(filters=query_params.filters, sort=query_params.sort),
        allowed_sort_fields=allowed_sort_fields,
        allowed_filter_fields=allowed_filter_fields,
    )

    # Get total count after filters but before pagination
    total_records = await get_total_count(session, filtered_query)

    # Now apply pagination
    paginated_query, _ = apply_query_params(
        filtered_query,
        entity_class,
        QueryParams(pagination=query_params.pagination),
    )

    # Execute query
    result = await session.execute(paginated_query)
    entities = result.scalars().all()

    # Convert to DTOs
    dtos = [dto_converter(entity) for entity in entities]

    return dtos, total_records
