"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";

// Wrap the AuthTest component in a SessionProvider since this is a client-side rendered page
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
          <Link
            href="/api/auth/login/saml"
            className="bg-blue-500 text-white px-4 py-2 rounded inline-block"
          >
            Sign In with SAML
          </Link>
        </div>
      )}
    </div>
  );
}
