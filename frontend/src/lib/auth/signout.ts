import {
  type SignOutParams,
  signOut as nextAuthSignOut,
} from "next-auth/react";

/**
 * Drop-in replacement for NextAuth's signOut() that also revokes the refresh
 * token on the backend and clears the refresh_token cookie before ending the
 * session.
 */
export async function signOut(options?: SignOutParams) {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort: proceed with NextAuth sign-out even if the call fails
  }

  return nextAuthSignOut(options);
}
