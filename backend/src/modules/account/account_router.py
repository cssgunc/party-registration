from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Response, status
from src.core.authentication import authenticate_by_role
from src.core.exceptions import error_response
from src.core.utils.query_utils import (
    PAGINATED_QUERY_RESPONSES,
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

# Shared OpenAPI error responses for routes that operate on a single invite token.
_INVITE_NOT_FOUND_RESPONSES: dict[int | str, dict[str, Any]] = {
    404: error_response("Invite token with the given ID was not found"),
}


@account_router.get(
    "",
    summary="List staff and admin accounts (paginated)",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def list_accounts(
    params: ListQueryParams = parse_list_query_params(),
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> PaginatedAccountsResponse:
    """List staff and admin accounts with pagination, sorting, and filtering."""
    return await account_service.get_accounts_paginated(params)


@account_router.post(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Invite a staff or admin user",
    responses={
        409: error_response("An account or pending invite already exists for this email"),
        500: error_response("Failed to send the invitation email"),
    },
)
async def create_account(
    data: CreateInviteDto,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> None:
    """Send a staff or admin invitation email and create the pending invite token.

    Returns 204 on success. If the email already belongs to a live staff/admin
    account or a non-expired invite token, returns 409. If the email service
    fails, the token is rolled back and a 500 is returned.
    """
    await account_service.create_invite(data)


@account_router.get(
    "/aggregate",
    summary="List all accounts in the aggregate view (paginated)",
    openapi_extra=_AGGREGATE_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_aggregate_accounts(
    params: ListQueryParams = parse_list_query_params(),
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> PaginatedAggregateAccountsResponse:
    """List the unified aggregate accounts view with pagination, sorting, and filtering.

    Merges UNC accounts (staff/admin), police accounts, and pending invite tokens
    into a single paginated list. Each row includes a ``status`` field
    (``active``, ``unverified``, or ``invited``) and source-type-specific fields
    may be ``null`` (e.g. police rows have no ``onyen``/``pid``).
    """
    return await account_service.get_aggregate_accounts_paginated(params)


@account_router.get(
    "/csv",
    summary="Export staff and admin accounts as an Excel file",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_accounts_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    account_service: AccountService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("admin")),
) -> Response:
    """Export staff and admin accounts as an Excel file.

    Supports the same filter/sort query params as ``GET /api/accounts``.
    Returns a ``.xlsx`` attachment with columns: Onyen, Email, First Name,
    Last Name, PID, and Role.
    """
    accounts_response = await account_service.get_accounts_paginated(params)
    excel_content = account_service.export_accounts_to_excel(accounts_response)
    filename = f"accounts_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@account_router.get(
    "/aggregate/csv",
    summary="Export the aggregate accounts view as an Excel file",
    openapi_extra=_AGGREGATE_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_aggregate_accounts_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    account_service: AccountService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("admin")),
) -> Response:
    """Export the unified aggregate accounts view as an Excel file.

    Supports the same filter/sort query params as ``GET /api/accounts/aggregate``.
    Returns a ``.xlsx`` attachment with columns: Email, First Name, Last Name,
    Onyen, PID, Role, and Status.
    """
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


@account_router.delete(
    "/invites/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a pending invite",
    responses=_INVITE_NOT_FOUND_RESPONSES,
)
async def delete_invite(
    invite_id: int,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> None:
    """Delete a pending staff or admin invite token by ID."""
    await account_service.delete_invite(invite_id)


@account_router.post(
    "/invites/{invite_id}/resend",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Resend a pending invite",
    responses={
        **_INVITE_NOT_FOUND_RESPONSES,
        500: error_response("Failed to send the invitation email"),
    },
)
async def resend_invite(
    invite_id: int,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> None:
    """Extend a pending invite's expiry and resend the invitation email.

    The token's ``expires_at`` is reset to ``now + env.INVITE_TOKEN_EXPIRY_HOURS``
    before the email is sent. If the email service fails, the extension is rolled
    back and a 500 is returned.
    """
    await account_service.resend_invite(invite_id)


@account_router.put(
    "/{account_id}",
    summary="Update an account's role",
    responses={
        403: error_response("Cannot remove the last remaining admin"),
        404: error_response("Account with the given ID was not found"),
    },
)
async def update_account(
    account_id: int,
    data: AccountUpdateData,
    account_service: AccountService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> AccountDto:
    """Update the role of a staff or admin account.

    Returns 403 if the update would leave the system with no admin accounts.
    """
    return await account_service.update_account(account_id, data)


@account_router.delete(
    "/{account_id}",
    summary="Delete an account",
    responses={
        403: error_response("Admins cannot delete their own account or the last admin"),
        404: error_response("Account with the given ID was not found"),
    },
)
async def delete_account(
    account_id: int,
    account_service: AccountService = Depends(),
    current_admin: AuthPrincipal = Depends(authenticate_by_role("admin")),
) -> AccountDto:
    """Delete an account by ID and return its final state.

    Returns 403 if the admin attempts to delete their own account, or if
    deleting would leave the system with no admin accounts.
    """
    if account_id == current_admin.id:
        raise CannotDeleteOwnAccountException()
    return await account_service.delete_account(account_id)
