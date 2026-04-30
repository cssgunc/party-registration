"""
Core utilities for server-side pagination, sorting, and filtering.

This module provides reusable functions to apply pagination, sorting, and filtering
to SQLAlchemy queries in a type-safe and flexible manner.
"""

from collections.abc import Callable
from contextlib import suppress
from datetime import datetime
from enum import Enum, StrEnum
from typing import Any, Self

from fastapi import Depends, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy import String as SAString
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import SQLColumnExpression
from src.core.database import get_session
from src.core.exceptions import BadRequestException

__all__ = [
    "PAGINATED_OPENAPI_PARAMS",
    "FilterOperator",
    "FilterParam",
    "ListQueryParams",
    "PaginatedResponse",
    "PaginationParams",
    "QueryFieldSet",
    "QueryService",
    "SortOrder",
    "SortParam",
    "make_query_service",
    "parse_export_list_query_params",
    "parse_list_query_params",
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


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total_records: int
    page_size: int
    page_number: int
    total_pages: int

    @classmethod
    def from_pagination(
        cls,
        *,
        items: list,
        total_records: int,
        pagination: "PaginationParams",
    ) -> "PaginatedResponse":
        if pagination.page_size is None:
            return cls(
                items=items,
                total_records=total_records,
                page_size=total_records,
                page_number=1,
                total_pages=1 if total_records > 0 else 0,
            )

        total_pages = (
            (total_records + pagination.page_size - 1) // pagination.page_size
            if total_records > 0
            else 0
        )
        return cls(
            items=items,
            total_records=total_records,
            page_size=pagination.page_size,
            page_number=pagination.page_number,
            total_pages=total_pages,
        )


type QueryField = SQLColumnExpression[Any]


class QueryFieldSet(BaseModel):
    model_config = ConfigDict(frozen=True, arbitrary_types_allowed=True)

    fields: dict[str, QueryField]
    sortable: tuple[str, ...] | None = None
    filterable: tuple[str, ...] | None = None
    searchable: tuple[str | tuple[str, ...], ...] = ()
    default_sort: "SortParam"

    @model_validator(mode="after")
    def validate_field_references(self) -> Self:
        field_keys = set(self.fields)

        self._validate_fields(self.sortable, "Sortable fields must exist in fields", field_keys)
        self._validate_fields(self.filterable, "Filterable fields must exist in fields", field_keys)

        self._validate_fields(
            tuple(
                name
                for entry in self.searchable
                for name in ([entry] if isinstance(entry, str) else entry)
            ),
            "Searchable fields must exist in fields",
            field_keys,
        )

        if self.default_sort is not None:
            default_field = (self.default_sort.field,)
            self._validate_fields(
                default_field, "Default sort field must exist in fields", field_keys
            )
            self._validate_fields(
                default_field, "Default sort field must be sortable", self.sortable_set
            )

        return self

    def _validate_fields(
        self, keys: tuple[str, ...] | None, message: str, against: set[str]
    ) -> None:
        if not keys:
            return
        missing = set(keys) - against
        if missing:
            raise ValueError(f"{message}: {', '.join(sorted(missing))}")

    @property
    def sortable_set(self) -> set[str]:
        return set(self.sortable) if self.sortable is not None else set(self.fields)

    @property
    def filterable_set(self) -> set[str]:
        return set(self.filterable) if self.filterable is not None else set(self.fields)


class PaginationParams(BaseModel):
    """Parameters for pagination."""

    page_number: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int | None = Field(
        default=None, ge=1, le=100, description="Items per page (None = all items)"
    )

    @classmethod
    def from_dict(cls, params: dict[str, str]) -> Self:
        page_number = int(params.get("page_number", 1))
        page_size = int(params["page_size"]) if "page_size" in params else None
        return cls(page_number=page_number, page_size=page_size)

    @property
    def skip(self) -> int:
        """Calculate offset from page_number and page_size."""
        if self.page_size is None:
            return 0
        return (self.page_number - 1) * self.page_size


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class SortParam(BaseModel):
    """Single sorting parameter."""

    field: str = Field(..., description="Field name to sort by")
    order: SortOrder = Field(default=SortOrder.ASC, description="Sort order")

    @classmethod
    def from_dict(cls, params: dict[str, str]) -> Self | None:
        sort_by = params.get("sort_by")
        if sort_by is None:
            return None
        sort_order = SortOrder(params.get("sort_order", "asc"))
        return cls(field=sort_by, order=sort_order)


def _parse_filter_value(value: str) -> int | datetime | str:
    with suppress(ValueError):
        return int(value)
    with suppress(ValueError):
        return datetime.fromisoformat(value)
    with suppress(ValueError):
        return datetime.strptime(value, "%Y-%m-%d")
    return value


def _escape_like_wildcards(value: str, escape_char: str = "\\") -> str:
    escaped = value.replace(escape_char, escape_char * 2)
    escaped = escaped.replace("%", f"{escape_char}%")
    escaped = escaped.replace("_", f"{escape_char}_")
    return escaped


FilterApplyFn = Callable[[QueryField, Any], Any]
FilterValidateFn = Callable[[QueryField], None]


def _validate_comparison(field: QueryField) -> None:
    field_type = getattr(field, "type", None)
    if isinstance(field_type, (SAString, SAEnum)):
        raise BadRequestException("Comparison operators are not supported for string/enum fields")


def _validate_contains(field: QueryField) -> None:
    field_type = getattr(field, "type", None)
    if field_type is not None and not isinstance(field_type, SAString):
        raise BadRequestException("Operator 'contains' is only supported for string fields")


def _op(
    value: str,
    *,
    apply: FilterApplyFn,
    validate: FilterValidateFn | None = None,
) -> tuple[str, FilterApplyFn, FilterValidateFn]:
    return value, apply, validate or (lambda _: None)


class FilterOperator(StrEnum):
    _apply_fn: FilterApplyFn
    _validate_fn: FilterValidateFn

    def __new__(
        cls, value: str, apply_fn: FilterApplyFn, validate_fn: FilterValidateFn | None = None
    ):
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj._apply_fn = apply_fn
        obj._validate_fn = validate_fn or (lambda _: None)
        return obj

    def apply(self, field: QueryField, value: Any) -> Any:
        self._validate_fn(field)
        return self._apply_fn(field, value)

    @property
    def is_list(self) -> bool:
        return self in (FilterOperator.IN, FilterOperator.NOT_IN)

    EQUALS = _op("eq", apply=lambda f, v: f == v)
    NOT_EQUALS = _op("ne", apply=lambda f, v: f != v)
    GREATER_THAN = _op("gt", apply=lambda f, v: f > v, validate=_validate_comparison)
    GREATER_THAN_OR_EQUAL = _op("gte", apply=lambda f, v: f >= v, validate=_validate_comparison)
    LESS_THAN = _op("lt", apply=lambda f, v: f < v, validate=_validate_comparison)
    LESS_THAN_OR_EQUAL = _op("lte", apply=lambda f, v: f <= v, validate=_validate_comparison)
    CONTAINS = _op(
        "contains",
        apply=lambda f, v: f.ilike(f"%{_escape_like_wildcards(str(v))}%", escape="\\"),
        validate=_validate_contains,
    )
    IN = _op("in", apply=lambda f, v: f.in_(v))
    NOT_IN = _op("nin", apply=lambda f, v: ~f.in_(v))
    IS_NULL = _op("null", apply=lambda f, _: f.is_(None))
    NOT_NULL = _op("notnull", apply=lambda f, _: f.is_not(None))


class FilterParam(BaseModel):
    """Single filter parameter."""

    field: str = Field(..., description="Field name to filter on")
    operator: FilterOperator = Field(..., description="Comparison operator")
    value: Any | None = Field(default=None, description="Value to compare against")

    @field_validator("value")
    @classmethod
    def validate_value_for_operator(cls, v: Any, info: Any) -> Any:
        operator = info.data.get("operator")

        if operator in (FilterOperator.IS_NULL, FilterOperator.NOT_NULL):
            return None

        if operator in (FilterOperator.IN, FilterOperator.NOT_IN) and not isinstance(v, list):
            raise ValueError(f"Operator {operator} requires a list value")

        return v

    @classmethod
    def from_param(cls, key: str, raw: str) -> Self | None:
        if "_" not in key:
            return None
        field, operator_str = key.rsplit("_", 1)
        try:
            operator = FilterOperator(operator_str)
        except ValueError:
            return None
        value = (
            [_parse_filter_value(v) for v in raw.split(",")]
            if operator.is_list
            else _parse_filter_value(raw)
        )
        return cls(field=field, operator=operator, value=value)

    def apply(self, field: QueryField) -> Any:
        return self.operator.apply(field, self.value)


class ListQueryParams(BaseModel):
    """Combined parameters for pagination, sorting, filtering, and search."""

    pagination: PaginationParams = Field(default_factory=PaginationParams)
    sort: SortParam | None = Field(default=None)
    filters: list[FilterParam] = Field(default_factory=list)
    search: str | None = Field(default=None)

    @classmethod
    def from_dict(
        cls, query_params: dict[str, str], *, default_sort: SortParam | None = None
    ) -> Self:
        filter_params = [
            p
            for key, raw in query_params.items()
            if (p := FilterParam.from_param(key, raw)) is not None
        ]
        sort = SortParam.from_dict(query_params) or default_sort
        return cls(
            pagination=PaginationParams.from_dict(query_params),
            sort=sort,
            filters=filter_params,
            search=query_params.get("search"),
        )


class QueryService:
    def __init__(
        self,
        session: AsyncSession,
        field_set: QueryFieldSet,
    ):
        self.session = session
        self.field_set = field_set

    async def get_paginated[ModelType](
        self,
        params: ListQueryParams,
        base_query: Select,
        dto_converter: Callable[[Any], ModelType],
        *,
        use_mappings: bool = False,
    ) -> PaginatedResponse[ModelType]:
        query = self._apply_filters(base_query, params.filters)
        query = self._apply_sorting(query, params.sort)
        query = self._apply_search(query, params.search)

        total_records = await self._get_total_count(query)
        query = self._apply_pagination(query, params.pagination)

        result = await self.session.execute(query)

        entities = result.mappings().all() if use_mappings else result.scalars().all()
        dtos = [dto_converter(entity) for entity in entities]

        return PaginatedResponse.from_pagination(
            items=dtos,
            total_records=total_records,
            pagination=params.pagination,
        )

    def _apply_filters(self, query: Select, filters: list[FilterParam]) -> Select:
        for filter_param in filters:
            if filter_param.field not in self.field_set.filterable_set:
                raise BadRequestException(
                    f"Filtering on field '{filter_param.field}' is not allowed"
                )
            field = self.field_set.fields[filter_param.field]
            query = query.where(filter_param.apply(field))

        return query

    def _apply_sorting(self, query: Select, sort: SortParam | None) -> Select:
        if not sort:
            return query

        if sort.field not in self.field_set.sortable_set:
            raise BadRequestException(f"Sorting on field '{sort.field}' is not allowed")
        field = self.field_set.fields[sort.field]
        order_fn = desc if sort.order == SortOrder.DESC else asc
        return query.order_by(order_fn(field))

    def _apply_pagination(self, query: Select, pagination: PaginationParams) -> Select:
        if pagination.skip > 0:
            query = query.offset(pagination.skip)
        if pagination.page_size is not None:
            query = query.limit(pagination.page_size)
        return query

    def _apply_search(self, query: Select, search: str | None) -> Select:
        if not search or not self.field_set.searchable:
            return query
        pattern = f"%{search}%"
        conditions = []
        for entry in self.field_set.searchable:
            if isinstance(entry, tuple):
                if not entry:
                    continue
                concat_args: list[Any] = []
                for index, name in enumerate(entry):
                    if index > 0:
                        concat_args.append(" ")
                    concat_args.append(self.field_set.fields[name])
                conditions.append(func.concat(*concat_args).ilike(pattern))
            else:
                conditions.append(self.field_set.fields[entry].ilike(pattern))
        if not conditions:
            return query
        return query.where(or_(*conditions))

    async def _get_total_count(self, base_query: Select) -> int:
        count_query = select(func.count()).select_from(base_query.subquery())
        result = await self.session.execute(count_query)
        return result.scalar() or 0


def parse_list_query_params(field_set: QueryFieldSet):
    def dependency(request: Request) -> ListQueryParams:
        try:
            return ListQueryParams.from_dict(
                dict(request.query_params),
                default_sort=field_set.default_sort,
            )
        except ValidationError as exc:
            raise RequestValidationError(exc.errors()) from exc

    return Depends(dependency)


def parse_export_list_query_params(field_set: QueryFieldSet):
    def dependency(
        params: ListQueryParams = parse_list_query_params(field_set),
    ) -> ListQueryParams:
        return params.model_copy(update={"pagination": PaginationParams()})

    return Depends(dependency)


def make_query_service(field_set: QueryFieldSet):
    def dependency(
        session: AsyncSession = Depends(get_session),
    ) -> QueryService:
        return QueryService(session, field_set)

    return Depends(dependency)
