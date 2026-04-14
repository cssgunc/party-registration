from fastapi import APIRouter, Depends, Request, Response, status
from src.core.authentication import authenticate_police_admin_or_admin
from src.core.exceptions import ForbiddenException
from src.core.utils.query_utils import PAGINATED_OPENAPI_PARAMS
from src.modules.account.account_model import AccountDto
from src.modules.police.police_model import (
    PaginatedPoliceResponse,
    PoliceAccountCreate,
    PoliceAccountDto,
    PoliceAccountUpdate,
)
from src.modules.police.police_service import PoliceService

police_router = APIRouter(prefix="/api/police", tags=["police"])


@police_router.get("", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def list_police(
    request: Request,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_police_admin_or_admin),
) -> PaginatedPoliceResponse:
    return await police_service.get_police_paginated(request)


@police_router.post("", status_code=status.HTTP_201_CREATED)
async def create_police(
    data: PoliceAccountCreate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_police_admin_or_admin),
) -> PoliceAccountDto:
    return await police_service.create_police(data.email, data.password, data.role)


@police_router.get("/csv", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def get_police_csv(
    request: Request,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_police_admin_or_admin),
) -> Response:
    police_accounts = await police_service.get_police_for_export(request)
    excel_content = police_service.export_police_to_excel(police_accounts)
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=police_accounts.xlsx"},
    )


@police_router.get("/{police_id}")
async def get_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_police_admin_or_admin),
) -> PoliceAccountDto:
    return await police_service.get_police_by_id(police_id)


@police_router.put("/{police_id}")
async def update_police(
    police_id: int,
    data: PoliceAccountUpdate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_police_admin_or_admin),
) -> PoliceAccountDto:
    return await police_service.update_police(police_id, data.email, data.role)


@police_router.delete("/{police_id}")
async def delete_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    principal: AccountDto | PoliceAccountDto = Depends(authenticate_police_admin_or_admin),
) -> PoliceAccountDto:
    if isinstance(principal, PoliceAccountDto) and principal.id == police_id:
        raise ForbiddenException("Police admins cannot delete their own account")
    return await police_service.delete_police(police_id)
