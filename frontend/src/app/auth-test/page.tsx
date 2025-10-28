"use client";

import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function AuthTestWrapper() {
  return (
    <SessionProvider>
      <AuthTest />
    </SessionProvider>
  );
}

function AuthTest() {
  const { data: session } = useSession();

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Auth Test Page</h1>
      <p className="mb-4 text-lg text-center">
        This page is for testing authentication functionality.
      </p>

      <div className="mb-6 space-y-2">
        <div>
          <Link
            href="/auth-test/ssr"
            className="text-sm text-blue-600 hover:underline"
          >
            View SSR auth page
          </Link>
        </div>
        <div>
          <Link
            href="/auth-test/csr"
            className="text-sm text-blue-600 hover:underline"
          >
            View CSR auth page
          </Link>
        </div>
      </div>

      {session ? (
        <div className="text-center">
          <p className="mb-4">
            Signed in as: {session.user?.email || session.user?.name}
          </p>
          <button
            onClick={() => signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-4">Not signed in</p>
          <button
            onClick={() =>
              signIn("credentials", {
                username: "admin",
                password: "password",
              })
            } // Hard code credentials for now to make testing easier
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}
