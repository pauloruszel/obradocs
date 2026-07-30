import { describe, expect, it } from "vitest";
import { getUpgradeLimitCode, isPlanLimitReached, usageLevel } from "./upgradeConversion";

describe("upgradeConversion", () => {
  it("identifica o limite de obras pelo código", () => {
    expect(isPlanLimitReached({ status: 409, code: "PLAN_LIMIT_REACHED" })).toBe(true);
  });

  it("não converte mensagens ou outros códigos em oferta de upgrade", () => {
    expect(isPlanLimitReached({
      status: 409,
      message: "Você atingiu o limite de obras do seu plano.",
    })).toBe(false);
    expect(isPlanLimitReached({ status: 500, code: "OTHER_ERROR" })).toBe(false);
  });

  it("identifica os limites comerciais pelo código", () => {
    expect(getUpgradeLimitCode({ code: "PLAN_LIMIT_REACHED" })).toBe("PLAN_LIMIT_REACHED");
    expect(getUpgradeLimitCode({ code: "STORAGE_LIMIT_REACHED" })).toBe("STORAGE_LIMIT_REACHED");
    expect(getUpgradeLimitCode({ code: "COLLABORATOR_LIMIT_REACHED" })).toBe("COLLABORATOR_LIMIT_REACHED");
    expect(getUpgradeLimitCode({ code: "CATEGORY_LIMIT_REACHED" })).toBe("CATEGORY_LIMIT_REACHED");
    expect(getUpgradeLimitCode({ code: "CUSTOM_TEMPLATE_REQUIRES_PRO" }))
      .toBe("CUSTOM_TEMPLATE_REQUIRES_PRO");
    expect(getUpgradeLimitCode({ status: 413 })).toBeNull();
  });

  it("classifica corretamente a utilização do plano", () => {
    expect(usageLevel(0, 1)).toBe("available");
    expect(usageLevel(1, 1)).toBe("limit");
    expect(usageLevel(8, 10)).toBe("warning");
    expect(usageLevel(100, null)).toBe("available");
  });
});
