import { downloadExcelFile } from "@/lib/api/shared/download-file";
import {
  ListQueryParams,
  ServerTableParams,
  toAxiosParams,
} from "@/lib/api/shared/query-params";
import apiClient from "@/lib/network/apiClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import type {
  PoliceAccountDto,
  PoliceAccountUpdate,
} from "../police/police.types";
import {
  AccountDto,
  AccountUpdateData,
  AggregateAccountDto,
  CreateInviteDto,
} from "./account.types";

/**
 * Service class for account-related operations
 */
export class AccountService {
  constructor(private client: AxiosInstance = apiClient) {}

  /**
   * List accounts (GET /api/accounts)
   */
  async listAccounts(
    params?: ListQueryParams
  ): Promise<PaginatedResponse<AccountDto>> {
    const response = await this.client.get<PaginatedResponse<AccountDto>>(
      "/accounts",
      { params: params ? toAxiosParams(params) : undefined }
    );
    return response.data;
  }

  /**
   * Download accounts as Excel (GET /api/accounts/csv)
   */
  async downloadAccountsCsv(params?: ListQueryParams): Promise<void> {
    const { sort_by, sort_order, search, filters } = params ?? { filters: {} };
    const exportFilters = { ...filters, role_not_in: "student" };
    const response = await this.client.get("/accounts/csv", {
      params: toAxiosParams({
        page_number: 1,
        sort_by,
        sort_order,
        search,
        filters: exportFilters,
      }),
      responseType: "blob",
    });
    downloadExcelFile(response, "accounts.xlsx");
  }

  /**
   * Send a staff/admin invite (POST /api/accounts) — returns 204 no content.
   */
  async createAccount(data: CreateInviteDto): Promise<void> {
    await this.client.post("/accounts", data);
  }

  /**
   * Delete an invite token (DELETE /api/accounts/invites/{invite_id}).
   */
  async deleteInvite(inviteId: number): Promise<void> {
    await this.client.delete(`/accounts/invites/${inviteId}`);
  }

  /**
   * Rotate an invite token and resend the invitation email
   * (POST /api/accounts/invites/{invite_id}/resend).
   */
  async resendInvite(inviteId: number): Promise<void> {
    await this.client.post(`/accounts/invites/${inviteId}/resend`);
  }

  /**
   * Aggregate accounts view (GET /api/accounts/aggregate).
   * Returns staff/admin accounts, police accounts, and pending invite tokens.
   */
  async getAccountsAggregate(
    params?: ServerTableParams
  ): Promise<PaginatedResponse<AggregateAccountDto>> {
    const response = await this.client.get<
      PaginatedResponse<AggregateAccountDto>
    >("/accounts/aggregate", {
      params: params ? toAxiosParams(params) : undefined,
    });
    return response.data;
  }

  /**
   * Download aggregate accounts as Excel (GET /api/accounts/aggregate/csv)
   */
  async downloadAggregateAccountsCsv(
    params?: ServerTableParams
  ): Promise<void> {
    const response = await this.client.get("/accounts/aggregate/csv", {
      params: params ? toAxiosParams(params) : undefined,
      responseType: "blob",
    });
    downloadExcelFile(response);
  }

  /**
   * Update account role (PUT /api/accounts/{account_id})
   */
  async updateAccount(
    accountId: number,
    data: AccountUpdateData
  ): Promise<AccountDto> {
    const response = await this.client.put<AccountDto>(
      `/accounts/${accountId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete account (DELETE /api/accounts/{account_id})
   */
  async deleteAccount(accountId: number): Promise<AccountDto> {
    const response = await this.client.delete<AccountDto>(
      `/accounts/${accountId}`
    );
    return response.data;
  }

  /**
   * List police accounts (GET /api/police)
   */
  async listPoliceAccounts(
    params?: ServerTableParams
  ): Promise<PaginatedResponse<PoliceAccountDto>> {
    const response = await this.client.get<PaginatedResponse<PoliceAccountDto>>(
      "/police",
      { params: params ? toAxiosParams(params) : undefined }
    );
    return response.data;
  }

  /**
   * Download police accounts as Excel (GET /api/police/csv)
   */
  async downloadPoliceAccountsCsv(params?: ServerTableParams): Promise<void> {
    const response = await this.client.get("/police/csv", {
      params: params ? toAxiosParams(params) : undefined,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "police_accounts.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Update police account (PUT /api/police/{police_id})
   */
  async updatePoliceAccount(
    policeId: number,
    data: PoliceAccountUpdate
  ): Promise<PoliceAccountDto> {
    const response = await this.client.put<PoliceAccountDto>(
      `/police/${policeId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete police account (DELETE /api/police/{police_id})
   */
  async deletePoliceAccount(policeId: number): Promise<PoliceAccountDto> {
    const response = await this.client.delete<PoliceAccountDto>(
      `/police/${policeId}`
    );
    return response.data;
  }
}
