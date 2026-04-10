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
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  /**
   * List police accounts (GET /api/accounts/police)
   */
  async listPoliceAccounts(): Promise<PoliceAccountDto[]> {
    try {
      const response =
        await this.client.get<PaginatedResponse<PoliceAccountDto>>(
          "/accounts/police"
        );
      return response.data.items;
    } catch (error) {
      console.error("Failed to fetch police accounts:", error);
      throw new Error("Failed to fetch police accounts");
    }
  }

  /**
   * Update police account (PUT /api/accounts/police/{police_id})
   */
  async updatePoliceAccount(
    policeId: number,
    data: PoliceAccountUpdate
  ): Promise<PoliceAccountDto> {
    try {
      const response = await this.client.put<PoliceAccountDto>(
        `/accounts/police/${policeId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update police account ${policeId}:`, error);
      throw new Error("Failed to update police account");
    }
  }

  /**
   * Delete police account (DELETE /api/accounts/police/{police_id})
   */
  async deletePoliceAccount(policeId: number): Promise<PoliceAccountDto> {
    try {
      const response = await this.client.delete<PoliceAccountDto>(
        `/accounts/police/${policeId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to delete police account ${policeId}:`, error);
      throw new Error("Failed to delete police account");
    }
  }
}
