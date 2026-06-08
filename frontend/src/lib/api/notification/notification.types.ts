export interface SubscriptionStatusDto {
  is_subscribed: boolean;
}

export const SUBSCRIPTION_STATUS_KEY = (token: string) =>
  ["notifications", "subscription-status", token] as const;
