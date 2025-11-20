import getMockClient from "@/lib/network/mockClient";
import { AxiosInstance } from "axios";

/**
 * Account role types
 */
export type AccountRole = "student" | "admin" | "staff";

/**
 * Account data for creating an account
 */
export interface AccountCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  role: AccountRole;
}

/**
 * Account response from backend
 */
export interface Account {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  role: AccountRole;
}

/**
 * Service class for account-related operations
 */
export class AccountService {
  constructor(private client: AxiosInstance = getMockClient("admin")) {}

  /**
   * Creates a new account
   */
  async createAccount(payload: AccountCreatePayload): Promise<Account> {
    try {
      const response = await this.client.post<Account>("/accounts", payload);
      return response.data;
    } catch (error) {
      console.error("Failed to create account:", error);
      throw new Error("Failed to create account");
    }
  }

  /**
   * Fetches a list of accounts
   */
  async listAccounts(roles?: AccountRole[]): Promise<Account[]> {
    try {
      const params = roles ? { role: roles } : {};
      const response = await this.client.get<Account[]>("/accounts", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      throw new Error("Failed to fetch accounts");
    }
  }

  /**
   * Updates an existing account
   */
  async updateAccount(
    id: number,
    data: AccountCreatePayload
  ): Promise<Account> {
    try {
      const response = await this.client.put<Account>(`/accounts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update account ${id}:`, error);
      throw new Error("Failed to update account");
    }
  }

  /**
   * Deletes an account
   */
  async deleteAccount(id: number): Promise<Account> {
    try {
      const response = await this.client.delete<Account>(`/accounts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete account ${id}:`, error);
      throw new Error("Failed to delete account");
    }
  }
}
