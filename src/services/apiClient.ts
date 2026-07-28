import Constants from "expo-constants";
import { tokenStorage } from "./tokenStorage";

const env = (globalThis as any)?.process?.env ?? {};
const API_URL = (env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  if (!API_URL) {
    throw new Error("Configure EXPO_PUBLIC_API_URL para acessar a API do Obradocs.");
  }

  const { authenticated = true, headers, ...requestOptions } = options;
  const accessToken = authenticated ? await tokenStorage.getAccessToken() : null;
  const isFormData = typeof FormData !== "undefined" && requestOptions.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Falha na requisicao (${response.status}).`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
};
