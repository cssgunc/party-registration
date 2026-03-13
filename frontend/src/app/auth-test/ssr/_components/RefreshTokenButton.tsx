"use client";

import { useState } from "react";

export default function RefreshTokenButton() {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAccessToken = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/token/refresh", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to refresh token");
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <button
        onClick={refreshAccessToken}
        disabled={refreshing}
        className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 disabled:opacity-50"
      >
        {refreshing ? "Refreshing..." : "Refresh Access Token"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
