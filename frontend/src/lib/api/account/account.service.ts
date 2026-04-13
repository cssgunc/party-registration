import {
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
    params?: ServerTableParams
  ): Promise<PaginatedResponse<AccountDto>> {
    try {
      const response = await this.client.get<PaginatedResponse<AccountDto>>(
        "/accounts",
        { params: params ? toAxiosParams(params) : undefined }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      throw new Error("Failed to fetch accounts");
    }
  }

  /**
   * Create account (POST /api/accounts)
   */
  async createAccount(data: AccountData): Promise<AccountDto> {
    try {
      const response = await this.client.post<AccountDto>("/accounts", data);
      return response.data;
    } catch (error) {
      console.error("Failed to create account:", error);
      throw new Error("Failed to create account");
    }
  }

  /**
   * Update account (PUT /api/accounts/{account_id})
   */
  async updateAccount(
    accountId: number,
    data: AccountData
  ): Promise<AccountDto> {
    try {
      const response = await this.client.put<AccountDto>(
        `/accounts/${accountId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update account ${accountId}:`, error);
      throw new Error("Failed to update account");
    }
  }

  /**
   * Delete account (DELETE /api/accounts/{account_id})
   */
  async deleteAccount(accountId: number): Promise<AccountDto> {
    try {
      const response = await this.client.delete<AccountDto>(
        `/accounts/${accountId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to delete account ${accountId}:`, error);
      throw new Error("Failed to delete account");
    }
  }

  /**
   * List police accounts (GET /api/police)
   */
  async listPoliceAccounts(
    params?: ServerTableParams
  ): Promise<PaginatedResponse<PoliceAccountDto>> {
    try {
      const response = await this.client.get<
        PaginatedResponse<PoliceAccountDto>
      >("/police", { params: params ? toAxiosParams(params) : undefined });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch police accounts:", error);
      throw new Error("Failed to fetch police accounts");
    }
  }

  /**
   * Download police accounts as Excel (GET /api/police/csv)
   */
  async downloadPoliceAccountsCsv(params?: ServerTableParams): Promise<void> {
    try {
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
    } catch (error) {
      console.error("Failed to download police accounts Excel:", error);
      throw new Error("Failed to download police accounts export");
    }
  }

  /**
   * Update police account (PUT /api/police/{police_id})
   */
  async updatePoliceAccount(
    policeId: number,
    data: PoliceAccountUpdate
  ): Promise<PoliceAccountDto> {
    try {
      const response = await this.client.put<PoliceAccountDto>(
        `/police/${policeId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update police account ${policeId}:`, error);
      throw new Error("Failed to update police account");
    }
  }

  /**
   * Delete police account (DELETE /api/police/{police_id})
   */
  async deletePoliceAccount(policeId: number): Promise<PoliceAccountDto> {
    try {
      const response = await this.client.delete<PoliceAccountDto>(
        `/police/${policeId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to delete police account ${policeId}:`, error);
      throw new Error("Failed to delete police account");
    }
  }
}
