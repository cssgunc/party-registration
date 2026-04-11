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
    const response = await this.client.get<PaginatedResponse<AccountDto>>(
      "/accounts",
      { params: params ? toAxiosParams(params) : undefined }
    );
    return response.data;
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
   * List police accounts (GET /api/accounts/police)
   */
  async listPoliceAccounts(): Promise<PoliceAccountDto[]> {
    const response =
      await this.client.get<PaginatedResponse<PoliceAccountDto>>(
        "/accounts/police"
      );
    return response.data.items;
  }

  /**
   * Update police account (PUT /api/accounts/police/{police_id})
   */
  async updatePoliceAccount(
    policeId: number,
    data: PoliceAccountUpdate
  ): Promise<PoliceAccountDto> {
    const response = await this.client.put<PoliceAccountDto>(
      `/accounts/police/${policeId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete police account (DELETE /api/accounts/police/{police_id})
   */
  async deletePoliceAccount(policeId: number): Promise<PoliceAccountDto> {
    const response = await this.client.delete<PoliceAccountDto>(
      `/accounts/police/${policeId}`
    );
    return response.data;
  }
}
