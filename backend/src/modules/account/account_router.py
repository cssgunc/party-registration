from fastapi import APIRouter, Depends, Query
from src.core.authentication import authenticate_admin
from src.modules.account.account_model import Account, AccountData, AccountRole
from src.modules.account.account_service import AccountService
from src.modules.police.police_model import PoliceAccount, PoliceAccountUpdate
from src.modules.police.police_service import PoliceService

account_router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@account_router.get("/police")
async def get_police_credentials(
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccount:
    police_entity = await police_service.get_police()
    return PoliceAccount(email=police_entity.email)


@account_router.put("/police")
async def update_police_credentials(
    data: PoliceAccountUpdate,
    police_service: PoliceService = Depends(),
    _=Depends(authenticate_admin),
) -> PoliceAccount:
    police_entity = await police_service.update_police(data.email, data.password)
    return PoliceAccount(email=police_entity.email)


@account_router.get("")
async def list_accounts(
    role: list[AccountRole] | None = Query(
        None, description="Filter by role(s): admin, staff, student"
    ),
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> list[Account]:
    return await account_service.get_accounts_by_roles(role)


@account_router.post("")
async def create_account(
    data: AccountData,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> Account:
    return await account_service.create_account(data)


@account_router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: AccountData,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> Account:
    return await account_service.update_account(account_id, data)


@account_router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_admin),
) -> Account:
    return await account_service.delete_account(account_id)
