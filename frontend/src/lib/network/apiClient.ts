import axios, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import Cookies from "js-cookie";

const apiClient = axios.create({
  withCredentials: true,
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
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
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token || undefined);
  });
  failedQueue = [];
};

// Refresh access token using the refresh token (sent automatically via HTTP-only cookie)
async function refreshAccessToken(): Promise<string | null> {
  // The refresh token is automatically sent via HTTP-only cookie (withCredentials: true)
  // Make a request to the backend refresh endpoint
  const response = await axios.post(
    "http://localhost:3000/api/auth/refresh", // TODO: Replace with the actual refresh endpoint
    {},
    {
      withCredentials: true,
    }
  );

  const newAccessToken = response.data?.accessToken;
  if (!newAccessToken) return null;

  // Update the access token cookie
  if (typeof window === "undefined") {
    // Server-side: set cookie using next/headers
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("access-token", newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });
  } else {
    // Client-side: set cookie using js-cookie
    Cookies.set("access-token", newAccessToken, {
      expires: 1 / 24, // 1 hour in days
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return newAccessToken;
}

// Use an async interceptor to attach the access token to the request and forward cookies for requests made
// in the SSR context.
apiClient.interceptors.request.use(async (config) => {
  // Get access token from cookie
  let accessToken: string | undefined;
  if (typeof window === "undefined") {
    // Server-side: read from next/headers cookies
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    accessToken = cookieStore.get("access-token")?.value;
  } else {
    // Client-side: read from cookie using js-cookie
    accessToken = Cookies.get("access-token") ?? undefined;
  }

  if (accessToken) config.headers["Authorization"] = `Bearer ${accessToken}`;

  // Forward cookies for server-side requests (SSR context)
  // Client-side: browser automatically attaches cookies (including HTTP-only) via withCredentials: true
  // SSR: When apiClient is used in SSR page components, axios doesn't have access to browser cookie jar.
  if (typeof window === "undefined") {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const cookieHeader = headerList.get("cookie");
    if (cookieHeader) {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders;
      headers["Cookie"] = cookieHeader;
      config.headers = headers;
    }
  }

  return config;
});

// Response interceptor handles token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              (originalRequest.headers as AxiosRequestHeaders)[
                "Authorization"
              ] = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();

        if (newAccessToken) {
          processQueue(null, newAccessToken);

          // Retry the original request with new token
          if (originalRequest.headers) {
            (originalRequest.headers as AxiosRequestHeaders)[
              "Authorization"
            ] = `Bearer ${newAccessToken}`;
          }

          return apiClient(originalRequest);
        } else {
          // Refresh failed, sign out user
          processQueue(new Error("Token refresh failed"), null);
          if (typeof window !== "undefined") {
            const { signOut } = await import("next-auth/react");
            signOut();
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        const error =
          refreshError instanceof Error
            ? refreshError
            : new Error("Token refresh failed");
        processQueue(error, null);
        if (typeof window !== "undefined") {
          const { signOut } = await import("next-auth/react");
          signOut();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
