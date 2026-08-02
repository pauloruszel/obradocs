import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { apiUrl: "https://api.test" } } },
}));

vi.mock("./tokenStorage", () => ({
  clearStoredSession: vi.fn(),
  getStoredSession: vi.fn(),
  setStoredSession: vi.fn(),
}));

describe("apiRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("aceita resposta 200 sem corpo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    await expect(apiRequest<void>("/v1/test", { authenticated: false })).resolves.toBeUndefined();
  });
});
