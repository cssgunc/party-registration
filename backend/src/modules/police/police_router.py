from typing import Any

from fastapi import APIRouter, Depends, Response
from src.core.authentication import authenticate_by_role
from src.core.exceptions import ForbiddenException, error_response
from src.core.utils.query_utils import (
    PAGINATED_QUERY_RESPONSES,
    ListQueryParams,
    get_paginated_openapi_params,
    parse_export_list_query_params,
    parse_list_query_params,
)
from src.modules.auth.auth_model import AuthPrincipal
from src.modules.police.police_model import (
    PaginatedPoliceResponse,
    PoliceAccountDto,
    PoliceAccountUpdate,
)
from src.modules.police.police_service import PoliceService

police_router = APIRouter(prefix="/api/police", tags=["police"])
_OPENAPI_PARAMS = get_paginated_openapi_params(PoliceService.QUERY_FIELDS)

# Shared error responses for routes that look up a specific police account.
_POLICE_NOT_FOUND_RESPONSES: dict[int | str, dict[str, Any]] = {
    404: error_response("Police account with the given ID was not found"),
}

# Shared error responses for routes that can both fail to find and conflict on email.
_POLICE_WRITE_RESPONSES: dict[int | str, dict[str, Any]] = {
    **_POLICE_NOT_FOUND_RESPONSES,
    409: error_response("The new email address is already in use by another police account"),
}


@police_router.get(
    "",
    summary="List police accounts (paginated)",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def list_police(
    params: ListQueryParams = parse_list_query_params(),
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("police_admin", "admin")),
) -> PaginatedPoliceResponse:
    """List police accounts with pagination, sorting, and filtering."""
    return await police_service.get_police_paginated(params)


@police_router.get(
    "/csv",
    summary="Export police accounts as an Excel file",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_police_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("police_admin", "admin")),
) -> Response:
    """Export police accounts as an Excel file.

    Supports the same filter/sort query params as ``GET /api/police``.
    Returns a ``.xlsx`` attachment with columns: Email and Role.
    """
    police_response = await police_service.get_police_paginated(params)
    excel_content = police_service.export_police_to_excel(police_response)
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=police_accounts.xlsx"},
    )


@police_router.get(
    "/{police_id}",
    summary="Get a police account by ID",
    responses=_POLICE_NOT_FOUND_RESPONSES,
)
async def get_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("police_admin", "admin")),
) -> PoliceAccountDto:
    """Get a single police account by ID."""
    return await police_service.get_police_by_id(police_id)


@police_router.put(
    "/{police_id}",
    summary="Update a police account",
    responses=_POLICE_WRITE_RESPONSES,
)
async def update_police(
    police_id: int,
    data: PoliceAccountUpdate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("police_admin", "admin")),
) -> PoliceAccountDto:
    """Update a police account's email, role, and verified status."""
    return await police_service.update_police(police_id, data.email, data.role, data.is_verified)


@police_router.delete(
    "/{police_id}",
    summary="Delete a police account",
    responses={
        403: error_response("Police admins cannot delete their own account"),
        **_POLICE_NOT_FOUND_RESPONSES,
    },
)
async def delete_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    principal: AuthPrincipal = Depends(authenticate_by_role("police_admin", "admin")),
) -> PoliceAccountDto:
    """Delete a police account and return its final state.

    Police admins may not delete their own account; platform admins have no
    such restriction.

    Raises:
        ForbiddenException: If the authenticated police admin targets their own account.
    """
    if principal.principal_type == "police" and principal.id == police_id:
        raise ForbiddenException("Police admins cannot delete their own account")
    return await police_service.delete_police(police_id)
