import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/constants";
import { navigateTo } from "../utils/navigate";
import { rememberErrorReturnPath } from "../utils/errorRedirect";

/**
 * ✅ In-memory access token (NOT localStorage)
 * - On page refresh, call /auth/refresh once to re-hydrate.
 */
let accessToken = "";

export const tokenManager = {
  get: () => {
    if (accessToken) return accessToken;
    const match = document.cookie.match(new RegExp('(^| )accessToken=([^;]+)'));
    if (match) {
      accessToken = match[2];
      return accessToken;
    }
    return "";
  },
  set: (t: string) => {
    accessToken = (t || "").trim();
    if (accessToken) {
      document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
    }
  },
  clear: () => {
    accessToken = "";
    document.cookie = "accessToken=; path=/; max-age=0";
  },
};

/**
 * ✅ Main API instance (uses interceptors)
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true, // ✅ send cookies (refresh cookie)
});

/**
 * ✅ Clean auth instance (NO interceptors)
 * Use ONLY for refresh/login/logout if you want zero header pollution.
 */
const authApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
});

/**
 * ✅ Attach access token to normal requests
 * Important: Do NOT attach Authorization to /auth/refresh
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenManager.get();
  const url = config.url ?? "";

  // ✅ skip refresh endpoint
  const isRefreshCall = url.includes("/auth/refresh/");

  if (token && !isRefreshCall) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;

    const csrfToken = document.cookie.match(new RegExp('(^| )csrftoken=([^;]+)'));
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken[2];
    }
  }

  // ✅ When sending FormData, delete Content-Type so the browser sets it
  // automatically with the correct multipart boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

/**
 * ✅ Single refresh for parallel 401s
 */
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  // ✅ Refresh token is in httpOnly cookie -> browser sends it automatically
  const res = await authApi.post("/auth/refresh/", {}); // ✅ clean instance

  const newAccessToken = (res.data as any)?.accessToken as string | undefined;
  if (!newAccessToken) throw new Error("Refresh did not return accessToken");

  tokenManager.set(newAccessToken);
  return newAccessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    // If axios doesn't have config, nothing to retry
    if (!err.config) return Promise.reject(err);

    const original = err.config as any;
    const status = err.response?.status;

    // Global network error (no response from server, likely offline)
    if (!err.response) {
      try {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/network-error")) {
          rememberErrorReturnPath();
          navigateTo("/network-error", { replace: true });
        }
      } catch {}
      return Promise.reject(err);
    }

    // Global 5xx -> maintenance page
    if (status && status >= 500) {
      const cfg: any = err.config || {};
      if (!cfg?.suppressGlobal5xx) {
        try {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/500")) {
            rememberErrorReturnPath();
            navigateTo("/500", { replace: true });
          }
        } catch {}
      }
      return Promise.reject(err);
    }

    // 400 Bad Request — let individual callers handle it (no global popup)
    if (status === 400) {
      return Promise.reject(err);
    }

    // ✅ Not 401 OR already retried -> reject
    if (status !== 401 || original?._retry) {
      return Promise.reject(err);
    }

    // ✅ Prevent infinite loop if refresh itself fails (401/500/etc.)
    const originalUrl = original?.url ?? "";
    if (originalUrl.includes("/auth/refresh/")) {
      tokenManager.clear();
      return Promise.reject(err);
    }

    original._retry = true;

    try {
      // ✅ start one refresh for all parallel 401s
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newAccess = await refreshPromise;

      // ✅ retry original request with new token
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newAccess}`;

      return api.request(original);
    } catch (e) {
      tokenManager.clear();
      return Promise.reject(e);
    }
  }
);

export default api;
