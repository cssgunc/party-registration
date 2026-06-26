/** Notification subscription status for a given unsubscribe token. */
export interface SubscriptionStatusDto {
  is_subscribed: boolean;
}

/** Factory for the React Query cache key for a token-scoped subscription status query. */
export const SUBSCRIPTION_STATUS_KEY = (token: string) =>
  ["notifications", "subscription-status", token] as const;
