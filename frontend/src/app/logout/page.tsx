"use client";

import { signOut } from "@/lib/auth/signout";
import { useEffect } from "react";

/**
 * Client-side logout page that the server can redirect to (e.g. on SSR 401s)
 * in order to invoke the custom signOut() helper, which revokes the refresh
 * token and clears all auth cookies. In CSR contexts, signOut() can be called
 * directly without navigating here.
 */
export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return null;
}
