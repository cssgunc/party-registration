from core.authentication import authenticate_by_role
from fastapi import APIRouter, Depends, Response
from src.core.exceptions import ForbiddenException
from src.core.utils.query_utils import (
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


@police_router.get("", openapi_extra=_OPENAPI_PARAMS)
async def list_police(
    params: ListQueryParams = parse_list_query_params(),
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("police_admin", "admin")),
) -> PaginatedPoliceResponse:
    return await police_service.get_police_paginated(params)


@police_router.get("/csv", openapi_extra=_OPENAPI_PARAMS)
async def get_police_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("police_admin", "admin")),
) -> Response:
    police_response = await police_service.get_police_paginated(params)
    excel_content = police_service.export_police_to_excel(police_response)
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=police_accounts.xlsx"},
    )


@police_router.get("/{police_id}")
async def get_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("police_admin", "admin")),
) -> PoliceAccountDto:
    return await police_service.get_police_by_id(police_id)


@police_router.put("/{police_id}")
async def update_police(
    police_id: int,
    data: PoliceAccountUpdate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> PoliceAccountDto:
    return await police_service.update_police(police_id, data.email, data.role, data.is_verified)


@police_router.delete("/{police_id}")
async def delete_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    principal: AuthPrincipal = Depends(authenticate_by_role("police_admin", "admin")),
) -> PoliceAccountDto:
    if principal.principal_type == "police" and principal.id == police_id:
        raise ForbiddenException("Police admins cannot delete their own account")
    return await police_service.delete_police(police_id)
