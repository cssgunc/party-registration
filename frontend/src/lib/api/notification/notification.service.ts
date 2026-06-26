import apiClient from "@/lib/api/apiClient";
import { AxiosInstance } from "axios";
import { SubscriptionStatusDto } from "./notification.types";

/**
 * Typed client for the `/api/notifications` endpoints.
 *
 * All methods are token-scoped — the token identifies the subscriber without
 * requiring authentication. Inject a custom Axios instance for testing; defaults
 * to the shared `apiClient`.
 */
export class NotificationService {
  constructor(private client: AxiosInstance = apiClient) {}

  /** Fetch the current subscription status for a given unsubscribe token (`GET /api/notifications/subscription-status`). */
  async getSubscriptionStatus(token: string): Promise<SubscriptionStatusDto> {
    const response = await this.client.get<SubscriptionStatusDto>(
      "/notifications/subscription-status",
      { params: { token } }
    );
    return response.data;
  }

  /** Unsubscribes the token holder from email notifications (`POST /api/notifications/unsubscribe`). */
  async unsubscribe(token: string): Promise<void> {
    await this.client.post("/notifications/unsubscribe", { token });
  }

  /** Re-subscribes the token holder to email notifications (`POST /api/notifications/resubscribe`). */
  async resubscribe(token: string): Promise<void> {
    await this.client.post("/notifications/resubscribe", { token });
  }
}

export default NotificationService;
