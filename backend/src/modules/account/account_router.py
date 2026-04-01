from fastapi import APIRouter, Depends, Request
from src.core.authentication import authenticate_admin
from src.core.query_utils import PAGINATED_OPENAPI_PARAMS
from src.modules.account.account_model import (
    AccountData,
    AccountDto,
    AccountUpdateData,
    PaginatedAccountsResponse,
)
from src.modules.account.account_service import AccountService

account_router = APIRouter(prefix="/api/accounts", tags=["accounts"])


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
    _=Depends(authenticate_admin),
) -> AccountDto:
    return await account_service.delete_account(account_id)
