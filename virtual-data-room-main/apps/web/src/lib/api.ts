import axios from "axios";

const TOKEN_KEY = "dataroom_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login/register are expected to 401/409 on bad credentials - those aren't
// session expirations, so they must not trigger the global logout redirect.
const PUBLIC_AUTH_PATHS = ["/auth/login", "/auth/register"];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? "";
    const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

    if (status === 401 && !isPublicAuthCall) {
      clearToken();
      // A stale token still triggers the background /auth/me call on every
      // page, including public share links a visitor never tried to log
      // into - don't hijack their read-only view with a login redirect.
      if (window.location.pathname !== "/login" && !window.location.pathname.startsWith("/share/")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export function isNotFoundError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  // A malformed id fails UUID validation (400) before the ownership check
  // ever runs (404) - both mean "there's nothing here for you", so a deep
  // link treats them the same way.
  return error.response?.status === 404 || error.response?.status === 400;
}

// A revoked public share link is distinct from a nonexistent one: the token
// still resolves, so the owner-facing "ask for a new link" message applies
// instead of a generic not-found page.
export function isGoneError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return error.response?.status === 410;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      return message.join(". ");
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
