from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Request, Response, status
from src.core.authentication import authenticate_admin
from src.core.utils.query_utils import PAGINATED_OPENAPI_PARAMS
from src.modules.account.account_model import (
    AccountDto,
    AccountUpdateData,
    CreateInviteDto,
    PaginatedAccountsResponse,
    PaginatedAggregateAccountsResponse,
)
from src.modules.account.account_service import AccountService, CannotDeleteOwnAccountException

account_router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@account_router.get("", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def list_accounts(
    request: Request,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> PaginatedAccountsResponse:
    return await account_service.get_accounts_paginated(request)


@account_router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def create_account(
    data: CreateInviteDto,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> None:
    await account_service.create_invite(data)


@account_router.get("/aggregate", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def get_aggregate_accounts(
    request: Request,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> PaginatedAggregateAccountsResponse:
    return await account_service.get_aggregate_accounts_paginated(request)


@account_router.get("/csv", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def get_accounts_csv(
    request: Request,
    account_service: AccountService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> Response:
    accounts = await account_service.get_accounts_for_export(request)
    excel_content = account_service.export_accounts_to_excel(accounts)
    filename = f"accounts_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@account_router.get("/aggregate/csv", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def get_aggregate_accounts_csv(
    request: Request,
    account_service: AccountService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> Response:
    accounts_response = await account_service.get_aggregate_accounts_paginated(request)
    excel_content = account_service.export_aggregate_accounts_to_excel(accounts_response.items)
    filename = (
        f"aggregate_accounts_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    )
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@account_router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invite(
    invite_id: int,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> None:
    await account_service.delete_invite(invite_id)


@account_router.post("/invites/{invite_id}/resend", status_code=status.HTTP_204_NO_CONTENT)
async def resend_invite(
    invite_id: int,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> None:
    await account_service.resend_invite(invite_id)


@account_router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: AccountUpdateData,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> AccountDto:
    return await account_service.update_account(account_id, data)


@account_router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    account_service: AccountService = Depends(),
    current_admin: AccountDto = Depends(authenticate_admin),
) -> AccountDto:
    if account_id == current_admin.id:
        raise CannotDeleteOwnAccountException()
    return await account_service.delete_account(account_id)
