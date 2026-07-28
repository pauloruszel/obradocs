import Constants from "expo-constants";
import { Session } from "@models/models";
import { clearStoredSession, getStoredSession, setStoredSession } from "./tokenStorage";

const env = process.env as Record<string, string | undefined>;
const apiUrl = env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
const API_URL = apiUrl?.replace(/\/+$/, "");

type ApiOptions = RequestInit & {
  authenticated?: boolean;
  retried?: boolean;
};

let refreshPromise: Promise<Session> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

const endpoint = (path: string) => {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL nao configurada");
  }
  return `${API_URL}${path}`;
};

const readError = async (response: Response) => {
  try {
    const body = await response.json();
    return body.detail || body.title || body.message || `Erro HTTP ${response.status}`;
  } catch {
    return `Erro HTTP ${response.status}`;
  }
};

const refreshSession = async (): Promise<Session> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const current = await getStoredSession();
    if (!current?.refresh_token) {
      throw new ApiError("Sessao expirada", 401);
    }

    const response = await fetch(endpoint("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    if (!response.ok) {
      throw new ApiError(await readError(response), response.status);
    }

    const renewed = (await response.json()) as Session;
    await setStoredSession(renewed);
    return renewed;
  })()
    .catch(async (error) => {
      await clearStoredSession();
      unauthorizedHandler?.();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const { authenticated = true, retried = false, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  const isFormData = requestOptions.body instanceof FormData;

  if (requestOptions.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    const session = await getStoredSession();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  const response = await fetch(endpoint(path), { ...requestOptions, headers });
  if (response.status === 401 && authenticated && !retried) {
    await refreshSession();
    return apiRequest<T>(path, { ...options, retried: true });
  }
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};
