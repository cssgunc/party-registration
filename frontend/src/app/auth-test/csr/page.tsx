"use client";

import apiClient from "@/lib/network/apiClient";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function CSRPage() {
  const { data: session } = useSession();
  const [apiResponse, setApiResponse] = useState<{
    success: boolean;
    accessToken: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch access token from the test API route to verify that the custom API client is automatically pulling the access
  // token from the session.
  const fetchTokenFromAPI = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(
        "http://localhost:3000/auth-test/api/tokens"
      );
      setApiResponse(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-start p-8 sm:p-20 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        CSR Auth Test Page
      </h1>

      <p className="mb-4 text-lg text-center">
        This client-side rendered page reads the access token from the NextAuth
        session and attempts to display it from the session and API.
      </p>

      <div className="w-full space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h2 className="font-semibold mb-2">API Token Test</h2>
          <button
            onClick={fetchTokenFromAPI}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Fetching..." : "Fetch Token from API"}
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

      <div className="w-full space-y-4">
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Access Token (Session)</h2>
          <div className="space-y-2">
            <div>
              <strong>Access Token:</strong>
              <pre className="break-words bg-gray-50 p-2 rounded mt-1">
                {session?.accessToken ?? "Not Available"}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-4">
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Full Session Data</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
