import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";

const abortError = () => Object.assign(new Error("Aborted"), { name: "AbortError" });

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { apiUrl: "https://api.test" } } },
}));

vi.mock("./tokenStorage", () => ({
  clearStoredSession: vi.fn(),
  getStoredSession: vi.fn(),
  setStoredSession: vi.fn(),
}));

describe("apiRequest", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aceita resposta 200 sem corpo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    await expect(apiRequest<void>("/v1/test", { authenticated: false })).resolves.toBeUndefined();
  });

  it("cancela uma requisicao que ultrapassa o tempo limite", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(abortError()));
      })));

    const request = apiRequest<void>("/v1/lento", {
      authenticated: false,
      timeoutMs: 100,
    });
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(100);

    await rejection;
  });

  it("respeita o cancelamento solicitado pelo cliente", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(abortError()));
      })));

    const request = apiRequest<void>("/v1/cancelado", {
      authenticated: false,
      signal: controller.signal,
    });
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();

    await rejection;
  });
});
