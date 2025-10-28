"use client";

import apiClient from "@/lib/network/apiClient";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function CSRPage() {
  return (
    <SessionProvider>
      <CSRPageContent />
    </SessionProvider>
  );
}

function CSRPageContent() {
  const { data: session } = useSession();
  const [cookieAccessToken, setCookieAccessToken] = useState<string | null>(
    null
  );
  const [cookieRefreshToken, setCookieRefreshToken] = useState<string | null>(
    null
  );
  const [apiResponse, setApiResponse] = useState<{
    success: boolean;
    accessToken: string | null;
    refreshToken: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get("/auth-test/api/tokens");
      setApiResponse(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getCookie = (name: string): string | null => {
      if (typeof document === "undefined") return null;
      const nameEQ = name + "=";
      const ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
      return null;
    };

    setCookieAccessToken(getCookie("access-token"));
    setCookieRefreshToken(getCookie("refresh-token"));
  }, []);

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-start p-8 sm:p-20 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        CSR Auth Test Page
      </h1>

      <p className="mb-4 text-lg text-center">
        This client-side rendered page reads the session using useSession hook
        and attempts to display access/refresh tokens.
      </p>

      <div className="w-full space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h2 className="font-semibold mb-2">API Token Test</h2>
          <button
            onClick={fetchTokens}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Fetching..." : "Fetch Tokens from API"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <h3 className="font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {apiResponse && (
          <div className="bg-white shadow rounded p-4">
            <h2 className="font-semibold mb-2">API Response</h2>
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {!session ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="text-yellow-800">
            No session found on the client. Ensure you are signed in and that
            useSession + authOptions are configured correctly.
          </p>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="bg-white shadow rounded p-4">
            <h2 className="font-semibold mb-2">
              Extracted Tokens (from cookies)
            </h2>
            <div className="space-y-2">
              <div>
                <strong>Access Token:</strong>
                <pre className="break-words bg-gray-50 p-2 rounded mt-1">
                  {cookieAccessToken ?? "Not found"}
                </pre>
              </div>
              <div>
                <strong>Refresh Token:</strong>
                <pre className="break-words bg-gray-50 p-2 rounded mt-1">
                  {cookieRefreshToken ?? "Not accessible (httpOnly) or not set"}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded p-4">
            <h2 className="font-semibold mb-2">Full Session (debug)</h2>
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
