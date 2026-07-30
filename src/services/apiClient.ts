import Constants from "expo-constants";
import { Session } from "@models/models";
import { clearStoredSession, getStoredSession, setStoredSession } from "./tokenStorage";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
const API_URL = apiUrl?.replace(/\/+$/, "");

type ApiOptions = RequestInit & {
  authenticated?: boolean;
  retried?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;
let refreshPromise: Promise<Session> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
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
    throw new Error("EXPO_PUBLIC_API_URL não configurada");
  }
  return `${API_URL}${path}`;
};

export const publicApiUrl = (path: string) => endpoint(path);

type ApiErrorBody = {
  code?: string;
  detail?: string;
  title?: string;
  message?: string;
  details?: Record<string, unknown>;
};

const readError = async (response: Response): Promise<ApiErrorBody> => {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return {};
  }
};

const apiError = async (response: Response) => {
  const body = await readError(response);
  return new ApiError(
    body.detail || body.title || body.message || `Erro HTTP ${response.status}`,
    response.status,
    body.code,
    body.details,
  );
};

const fetchWithTimeout = (
  input: RequestInfo,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) => {
  if (init.signal) {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
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

    const response = await fetchWithTimeout(endpoint("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    if (!response.ok) {
      throw await apiError(response);
    }

    const renewed = (await response.json()) as Session;
    await setStoredSession(renewed);
    return renewed;
  })()
    .catch(async (error) => {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        await clearStoredSession();
        unauthorizedHandler?.();
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const {
    authenticated = true,
    retried = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...requestOptions
  } = options;
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

  const response = await fetchWithTimeout(endpoint(path), { ...requestOptions, headers }, timeoutMs);
  if (response.status === 401 && authenticated && !retried) {
    await refreshSession();
    return apiRequest<T>(path, { ...options, retried: true, timeoutMs });
  }
  if (!response.ok) {
    throw await apiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};
