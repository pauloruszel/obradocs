import { describe, expect, it } from "vitest";
import { isPlanLimitReached, usageLevel } from "./upgradeConversion";

describe("upgradeConversion", () => {
  it("identifica o erro padronizado de limite de obras", () => {
    expect(isPlanLimitReached({
      status: 409,
      message: "Você atingiu o limite de obras do seu plano.",
    })).toBe(true);
  });

  it("não converte outros conflitos em oferta de upgrade", () => {
    expect(isPlanLimitReached({ status: 409, message: "Outro conflito" })).toBe(false);
    expect(isPlanLimitReached({ status: 500, message: "Você atingiu o limite de obras do seu plano." })).toBe(false);
  });

  it("classifica corretamente a utilização do plano", () => {
    expect(usageLevel(0, 1)).toBe("available");
    expect(usageLevel(1, 1)).toBe("limit");
    expect(usageLevel(8, 10)).toBe("warning");
    expect(usageLevel(100, null)).toBe("available");
  });
});
