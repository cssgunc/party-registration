import getMockClient from "@/lib/network/mockClient";
import { AxiosInstance } from "axios";

/**
 * Account role types
 */
export type AccountRole = "student" | "admin" | "staff";

/**
 * Backend account response format
 */
export interface BackendAccount {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  role: AccountRole;
}

/**
 * Backend account creation payload format
 */
export interface BackendAccountPayload {
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  role: AccountRole;
}

/**
 * Frontend account format
 */
export interface Account {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  pid: string;
  role: AccountRole;
}

/**
 * Frontend account creation payload
 */
export interface AccountCreatePayload {
  email: string;
  firstName: string;
  lastName: string;
  pid: string;
  role: AccountRole;
}

/**
 * Transform backend Account to frontend format
 */
export function toFrontendAccount(data: BackendAccount): Account {
  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    pid: data.pid,
    role: data.role,
  };
}

/**
 * Transform frontend Account payload to backend format
 */
export function toBackendAccountPayload(
  data: AccountCreatePayload
): BackendAccountPayload {
  return {
    email: data.email,
    first_name: data.firstName,
    last_name: data.lastName,
    pid: data.pid,
    role: data.role,
  };
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
      const response = await this.client.post<BackendAccount>(
        "/accounts",
        toBackendAccountPayload(payload)
      );
      return toFrontendAccount(response.data);
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
      const response = await this.client.get<BackendAccount[]>("/accounts", {
        params,
      });
      return response.data.map(toFrontendAccount);
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
      const response = await this.client.put<BackendAccount>(
        `/accounts/${id}`,
        toBackendAccountPayload(data)
      );
      return toFrontendAccount(response.data);
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
      const response = await this.client.delete<BackendAccount>(
        `/accounts/${id}`
      );
      return toFrontendAccount(response.data);
    } catch (error) {
      console.error(`Failed to delete account ${id}:`, error);
      throw new Error("Failed to delete account");
    }
  }
}
