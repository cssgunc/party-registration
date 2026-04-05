import type { RefreshTokenResponse } from "@/lib/api/auth/auth.types";
import { signOut } from "@/lib/auth/signout";
import axios, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { getServerSession } from "next-auth";
import { getSession } from "next-auth/react";
import { redirect } from "next/navigation";

const apiClient = axios.create({
  withCredentials: true,
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: string) => void;
  reject: (reason?: Error) => void;
}> = [];

// Process the queue of failed requests for token refresh
// This is used to ensure that all requests in the queue are retried with the new token
function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token || undefined);
  });
  failedQueue = [];
}

/**
 * Calls the NextAuth-powered token refresh route. Only works in CSR contexts
 * because the refresh_token cookie must be sent by the browser.
 * @returns The new access token, or null if the refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const resp = await axios.post<RefreshTokenResponse>(
      "/api/auth/token/refresh",
      {},
      { baseURL: window.location.origin }
    );
    return resp.data.access_token;
  } catch {
    return null;
  }
}

/**
 * Gets the access token from the NextAuth session. Can be used in both CSR and SSR contexts.
 * @returns The access token, or undefined if not available
 */
async function getAccessToken(): Promise<string | undefined> {
  // SSR context
  if (typeof window === "undefined") {
    const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
    const session = await getServerSession(authOptions);
    return session?.accessToken;
  }

  // CSR context
  const session = await getSession();
  return session?.accessToken;
}

// Use an async interceptor to attach the access token to the request and forward cookies for requests made
// in the SSR context.
apiClient.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();
  if (accessToken) config.headers["Authorization"] = `Bearer ${accessToken}`;
  return config;
});

// Response interceptor handles token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is not 401 or we have already tried to refresh, reject the error
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Token refresh is unavailable in SSR contexts due to us not having access to the refresh_token cookie
    if (typeof window === "undefined") {
      console.error(
        "[API Client] Received 401 response. Token refresh is not available in SSR contexts — the user will be logged out."
      );
      return redirect("/logout");
    }

    if (isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token && originalRequest.headers) {
            (originalRequest.headers as AxiosRequestHeaders)["Authorization"] =
              `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        processQueue(null, newAccessToken);

        // Retry the original request with new token
        if (originalRequest.headers) {
          (originalRequest.headers as AxiosRequestHeaders)["Authorization"] =
            `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      }

      processQueue(new Error("Token refresh failed"), null);
      signOut();
      return Promise.reject(error);
    } catch (refreshError) {
      const err =
        refreshError instanceof Error
          ? refreshError
          : new Error("Token refresh failed");
      processQueue(err, null);
      signOut();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;

// Setup error interceptor with custom error handler
export const setupErrorInterceptor = (showError: (message: string) => void) => {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // Skip 401 errors (handled by token refresh interceptor)
      if (error.response?.status === 401) {
        return Promise.reject(error);
      }

      // Get error message
      const message =
        error.response?.data?.message || error.message || "An error occurred";

      showError(message);
      return Promise.reject(error);
    }
  );
};
