import apiClient from "@/lib/network/apiClient";
import { cookies } from "next/headers";

export default async function SSRPage() {
  // Read access token from cookie
  const cookieStore = await cookies();
  const cookieAccessToken = cookieStore.get("access-token")?.value ?? null;

  // Fetch access token from the test API route to verify that the custom API client is automatically pulling the access
  // token from the cookie.
  let apiResponse = null;
  let apiError = null;
  try {
    const response = await apiClient.get("/auth-test/api/tokens");
    apiResponse = response.data;
  } catch (error) {
    apiError =
      error instanceof Error ? error.message : "Unknown error occurred";
  }

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-start p-8 sm:p-20 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        SSR Auth Test Page
      </h1>

      <p className="mb-4 text-lg text-center">
        This server-rendered page reads the access token cookie and attempts to
        display the access token from the cookie and API.
      </p>

      <div className="w-full space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h2 className="font-semibold mb-2">API Token Test (Server-Side)</h2>
          <p className="text-sm text-blue-700">
            Tokens fetched from /auth-test/api/tokens during server-side
            rendering
          </p>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <h3 className="font-semibold text-red-800 mb-2">API Error</h3>
            <p className="text-red-700">{apiError}</p>
          </div>
        )}

        {apiResponse && (
          <div className="bg-white shadow rounded p-4">
            <h2 className="font-semibold mb-2">API Response (Server-Side)</h2>
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="w-full space-y-4">
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Access Token (Cookie)</h2>
          <div className="space-y-2">
            <div>
              <strong>Access Token:</strong>
              <pre className="break-words bg-gray-50 p-2 rounded mt-1">
                {cookieAccessToken ?? "Not Available"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
