import { Account, AccountData } from "@/types/api/account";
import { Axios } from "axios";

class AccountService {
  constructor(private apiClient: Axios = apiClient) {}

  async getAllAccounts(): Promise<Account[]> {
    const response = await this.apiClient.get<Account[]>("/accounts");
    return response.data;
  }

  async getAccountByID(id: number): Promise<Account> {
    const response = await this.apiClient.get<Account>(`/accounts/${id}`);
    return response.data;
  }

  async createAccount(data: AccountData): Promise<Account> {
    const response = await this.apiClient.post<Account>("/accounts", data);
    return response.data;
  }

  async updateAccount(id: number, data: AccountData): Promise<Account> {
    const response = await this.apiClient.put<Account>(`/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: number): Promise<Account> {
    const response = await this.apiClient.delete<Account>(`/accounts/${id}`);
    return response.data;
  }
}

export default AccountService;
