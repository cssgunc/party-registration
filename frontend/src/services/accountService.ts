import { Account, AccountData } from "@/types/api/account";
import { Axios } from "axios";

class AccountService {
  constructor(private apiClient: Axios = apiClient) {}

  async getAllAccounts(): Promise<Account[]> {
    const response = await this.apiClient.get<Account[]>("/accounts");
    return response.data;
  }

  async getAccountByEmail(email: string): Promise<Account> {
    const response = await this.apiClient.get<Account>(`/accounts/${email}`);
    return response.data;
  }

  async createAccount(data: AccountData): Promise<Account> {
    const response = await this.apiClient.post<Account>("/accounts", data);
    return response.data;
  }

  async updateAccount(
    email: string,
    data: Partial<AccountData>
  ): Promise<Account> {
    const response = await this.apiClient.put<Account>(
      `/accounts/${email}`,
      data
    );
    return response.data;
  }

  async deleteAccount(email: string): Promise<Account> {
    const response = await this.apiClient.delete<Account>(`/accounts/${email}`);
    return response.data;
  }
}

export default AccountService;
