import apiClient from "@/lib/api/apiClient";
import { AxiosInstance } from "axios";
import { SubscriptionStatusDto } from "./notification.types";

export class NotificationService {
  constructor(private client: AxiosInstance = apiClient) {}

  async getSubscriptionStatus(token: string): Promise<SubscriptionStatusDto> {
    const response = await this.client.get<SubscriptionStatusDto>(
      "/notifications/subscription-status",
      { params: { token } }
    );
    return response.data;
  }

  async unsubscribe(token: string): Promise<void> {
    await this.client.post("/notifications/unsubscribe", { token });
  }

  async resubscribe(token: string): Promise<void> {
    await this.client.post("/notifications/resubscribe", { token });
  }
}

export default NotificationService;
