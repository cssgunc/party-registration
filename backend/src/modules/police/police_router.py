from fastapi import APIRouter, Depends, Request, status
from src.core.authentication import authenticate_admin
from src.core.query_utils import PAGINATED_OPENAPI_PARAMS
from src.modules.police.police_model import (
    PaginatedPoliceResponse,
    PoliceAccountDto,
    PoliceAccountUpdate,
)
from src.modules.police.police_service import PoliceService

police_router = APIRouter(prefix="/api/accounts/police", tags=["police"])


@police_router.get("", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def list_police(
    request: Request,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PaginatedPoliceResponse:
    return await police_service.get_police_paginated(request)


@police_router.post("", status_code=status.HTTP_201_CREATED)
async def create_police(
    data: PoliceAccountUpdate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccountDto:
    return await police_service.create_police(data.email, data.password)


@police_router.get("/{police_id}")
async def get_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccountDto:
    return await police_service.get_police_by_id(police_id)


@police_router.put("/{police_id}")
async def update_police(
    police_id: int,
    data: PoliceAccountUpdate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccountDto:
    return await police_service.update_police(police_id, data.email, data.password)


@police_router.delete("/{police_id}")
async def delete_police(
    police_id: int,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccountDto:
    return await police_service.delete_police(police_id)
