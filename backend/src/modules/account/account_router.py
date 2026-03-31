from fastapi import APIRouter, Depends, Request, Response
from src.core.authentication import authenticate_admin
from src.core.utils.query_utils import PAGINATED_OPENAPI_PARAMS
from src.modules.account.account_model import (
    AccountData,
    AccountDto,
    PaginatedAccountsResponse,
)
from src.modules.account.account_service import AccountService
from src.modules.police.police_model import PoliceAccountDto, PoliceAccountUpdate
from src.modules.police.police_service import PoliceService

account_router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@account_router.get("/police")
async def get_police_credentials(
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccountDto:
    police_entity = await police_service.get_police()
    return police_entity.to_dto()


@account_router.put("/police")
async def update_police_credentials(
    data: PoliceAccountUpdate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccountDto:
    police_entity = await police_service.update_police(data.email, data.password)
    return police_entity.to_dto()


@account_router.get("", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def list_accounts(
    request: Request,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> PaginatedAccountsResponse:
    return await account_service.get_accounts_paginated(request)


@account_router.post("")
async def create_account(
    data: AccountData,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> AccountDto:
    return await account_service.create_account(data)


@account_router.get("/csv")
async def get_accounts_csv(
    request: Request,
    account_service: AccountService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> Response:
    accounts = await account_service.get_accounts_for_export(request)
    excel_content = account_service.export_accounts_to_excel(accounts)
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=accounts.xlsx"},
    )


@account_router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: AccountData,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> AccountDto:
    return await account_service.update_account(account_id, data)


@account_router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> AccountDto:
    return await account_service.delete_account(account_id)
