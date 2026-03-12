"use client";

import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

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
  const [showPoliceForm, setShowPoliceForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [policeError, setPoliceError] = useState("");

  async function handlePoliceSignIn(e: React.FormEvent) {
    e.preventDefault();
    setPoliceError("");
    const result = await signIn("police-credentials", {
      username,
      password,
      redirect: false,
    });
    if (result?.error) {
      setPoliceError("Invalid username or password.");
    } else {
      window.location.reload();
    }
  }

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
          <p className="mb-1">
            Signed in as: {session.user?.email || session.user?.name}
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Role: {session.role ?? "none"}
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
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/api/auth/login/saml?callbackUrl=/auth-test&role=student"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded inline-block"
            >
              Student
            </Link>
            <Link
              href="/api/auth/login/saml?callbackUrl=/auth-test&role=staff"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded inline-block"
            >
              Staff
            </Link>
            <Link
              href="/api/auth/login/saml?callbackUrl=/auth-test&role=admin"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded inline-block"
            >
              Admin
            </Link>
            <button
              onClick={() => setShowPoliceForm((v) => !v)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Police
            </button>
          </div>

          {showPoliceForm && (
            <form
              onSubmit={handlePoliceSignIn}
              className="mt-4 flex flex-col items-center gap-2"
            >
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-48"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-48"
              />
              {policeError && (
                <p className="text-red-500 text-sm">{policeError}</p>
              )}
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm"
              >
                Sign In
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
