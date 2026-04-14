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
import { AccountData, AccountDto } from "./account.types";

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
    try {
      const response = await this.client.get("/accounts/csv", {
        params: params ? toAxiosParams(params) : undefined,
        responseType: "blob",
      });
      downloadExcelFile(response, "accounts.xlsx");
    } catch (error) {
      console.error("Failed to download accounts Excel:", error);
      throw new Error("Failed to download accounts export");
    }
  }

  /**
   * Create account (POST /api/accounts)
   */
  async createAccount(data: AccountData): Promise<AccountDto> {
    const response = await this.client.post<AccountDto>("/accounts", data);
    return response.data;
  }

  /**
   * Update account (PUT /api/accounts/{account_id})
   */
  async updateAccount(
    accountId: number,
    data: AccountData
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
