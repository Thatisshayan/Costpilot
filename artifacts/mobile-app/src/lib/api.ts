export type ApiAuthTokenGetter = () => Promise<string | null> | string | null;

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_ORIGIN || "https://costpilot-production.up.railway.app")
  .replace(/\/+$/, "");
let authTokenGetter: ApiAuthTokenGetter | null = null;

export function setApiAuthTokenGetter(getter: ApiAuthTokenGetter | null) {
  authTokenGetter = getter;
}

export function getApiOrigin() {
  return API_ORIGIN;
}

export async function apiResponse(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<Response> {
  const { params, headers: headersInit, ...init } = options ?? {};
  const path = /^https?:\/\//i.test(endpoint)
    ? endpoint
    : endpoint.startsWith("/api/")
      ? endpoint
      : `/api/${endpoint.replace(/^\/+/, "")}`;
  const url = new URL(path, `${API_ORIGIN}/`);
  if (url.origin !== new URL(API_ORIGIN).origin) throw new Error("API requests must use the configured origin");
  if (params) {
    url.search = new URLSearchParams(params).toString();
  }

  const headers = new Headers(headersInit);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authTokenGetter && !headers.has("Authorization")) {
    const token = await authTokenGetter();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  return response;
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const response = await apiResponse(endpoint, options);
  if (!response.ok) throw new Error(`API error ${response.status}: ${await response.text()}`);

  if (response.status === 204) return undefined as T;
  return response.json();
}
