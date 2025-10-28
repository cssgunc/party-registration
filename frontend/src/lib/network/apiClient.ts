import axios, { AxiosRequestHeaders } from "axios";

const apiClient = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Resolve access token from cookies in both SSR and CSR
async function resolveAccessTokenFromCookies(): Promise<string | undefined> {
  // Server-side: use next/headers cookies() within the current request context
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      return cookieStore.get("access-token")?.value;
    } catch {
      return undefined;
    }
  }

  // Client-side: parse document.cookie
  const cookieString = typeof document !== "undefined" ? document.cookie : "";
  if (!cookieString) return undefined;
  const parts = cookieString.split(";").map((c) => c.trim());
  const prefix = "access-token=";
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.substring(prefix.length));
    }
  }
  return undefined;
}

// Use an async interceptor to handle token attachment and cookie forwarding
apiClient.interceptors.request.use(async (config) => {
  const accessToken = await resolveAccessTokenFromCookies();
  if (accessToken) {
    const headers = (config.headers ?? {}) as AxiosRequestHeaders;
    headers["Authorization"] = `Bearer ${accessToken}`;
    config.headers = headers;
  }

  // Forward refresh token for server-side requests since it is not included by default
  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieString = allCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    if (cookieString) {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders;
      headers["Cookie"] = cookieString;
      config.headers = headers;
    }
  }

  return config;
});

// The response interceptor handles final auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If a request fails with 401, it means the refresh token is also invalid
    // or the session has expired. In either case, sign the user out.
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const { signOut } = await import("next-auth/react");
      signOut();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
