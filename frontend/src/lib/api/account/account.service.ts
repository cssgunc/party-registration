import getMockClient from "@/lib/network/mockClient";
import { PaginatedResponse } from "@/lib/shared";
import { AxiosInstance } from "axios";
import { AccountData, AccountDto, AccountRole } from "./account.types";

/**
 * Service class for account-related operations
 */
export class AccountService {
  constructor(private client: AxiosInstance = getMockClient("admin")) {}

  /**
   * List accounts (GET /api/accounts)
   */
  async listAccounts(roles?: AccountRole[]): Promise<AccountDto[]> {
    try {
      const params = roles ? { role_in: roles } : {};
      const response = await this.client.get<PaginatedResponse<AccountDto>>(
        "/accounts",
        {
          params,
        }
      );
      return response.data.items;
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
}
