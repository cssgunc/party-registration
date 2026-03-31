import axios, { AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { getServerSession } from "next-auth";
import { getSession, signOut } from "next-auth/react";

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
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token || undefined);
  });
  failedQueue = [];
};

// This loads the access token from the session. If the access token is not available, it will trigger the NextAuth jwt
// callback to refresh the token.
async function resolveFreshAccessToken(): Promise<string | undefined> {
  if (typeof window === "undefined") {
    const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
    const session = await getServerSession(authOptions);
    return session?.accessToken as string | undefined;
  } else {
    const session = await getSession();
    return session?.accessToken as string | undefined;
  }
}

// Use an async interceptor to attach the access token to the request and forward cookies for requests made
// in the SSR context.
apiClient.interceptors.request.use(async (config) => {
  // Get access token via NextAuth session (triggers refresh in jwt callback if needed)
  const accessToken = await resolveFreshAccessToken();

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

    // If error is 401 and we haven't already tried to refresh
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
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Re-read session to trigger NextAuth jwt callback refresh
      const newAccessToken = await resolveFreshAccessToken();

      if (newAccessToken) {
        processQueue(null, newAccessToken);

        // Retry the original request with new token
        if (originalRequest.headers) {
          (originalRequest.headers as AxiosRequestHeaders)["Authorization"] =
            `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } else {
        // Refresh failed, sign out user
        processQueue(new Error("Token refresh failed"), null);
        if (typeof window !== "undefined") {
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
        signOut();
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
