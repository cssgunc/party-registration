from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Response, status
from src.core.authentication import authenticate_by_role
from src.core.utils.query_utils import (
    ListQueryParams,
    get_paginated_openapi_params,
    parse_export_list_query_params,
    parse_list_query_params,
)
from src.modules.account.account_model import (
    AccountDto,
    AccountUpdateData,
    CreateInviteDto,
    PaginatedAccountsResponse,
    PaginatedAggregateAccountsResponse,
)
from src.modules.account.account_service import AccountService, CannotDeleteOwnAccountException
from src.modules.auth.auth_model import AuthPrincipal

account_router = APIRouter(prefix="/api/accounts", tags=["accounts"])
_OPENAPI_PARAMS = get_paginated_openapi_params(AccountService.QUERY_FIELDS)
_AGGREGATE_OPENAPI_PARAMS = get_paginated_openapi_params(AccountService.AGGREGATE_QUERY_FIELDS)


@account_router.get("", openapi_extra=_OPENAPI_PARAMS)
async def list_accounts(
    params: ListQueryParams = parse_list_query_params(),
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> PaginatedAccountsResponse:
    return await account_service.get_accounts_paginated(params)


@account_router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def create_account(
    data: CreateInviteDto,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> None:
    await account_service.create_invite(data)


@account_router.get("/aggregate", openapi_extra=_AGGREGATE_OPENAPI_PARAMS)
async def get_aggregate_accounts(
    params: ListQueryParams = parse_list_query_params(),
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> PaginatedAggregateAccountsResponse:
    return await account_service.get_aggregate_accounts_paginated(params)


@account_router.get("/csv", openapi_extra=_OPENAPI_PARAMS)
async def get_accounts_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    account_service: AccountService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("admin")),
) -> Response:
    accounts_response = await account_service.get_accounts_paginated(params)
    excel_content = account_service.export_accounts_to_excel(accounts_response)
    filename = f"accounts_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@account_router.get("/aggregate/csv", openapi_extra=_AGGREGATE_OPENAPI_PARAMS)
async def get_aggregate_accounts_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    account_service: AccountService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("admin")),
) -> Response:
    accounts_response = await account_service.get_aggregate_accounts_paginated(params)
    excel_content = account_service.export_aggregate_accounts_to_excel(accounts_response)
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
    _=Depends(authenticate_by_role("admin")),
) -> None:
    await account_service.delete_invite(invite_id)


@account_router.post("/invites/{invite_id}/resend", status_code=status.HTTP_204_NO_CONTENT)
async def resend_invite(
    invite_id: int,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> None:
    await account_service.resend_invite(invite_id)


@account_router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: AccountUpdateData,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> AccountDto:
    return await account_service.update_account(account_id, data)


@account_router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    account_service: AccountService = Depends(),
    current_admin: AuthPrincipal = Depends(authenticate_by_role("admin")),
) -> AccountDto:
    if account_id == current_admin.id:
        raise CannotDeleteOwnAccountException()
    return await account_service.delete_account(account_id)
