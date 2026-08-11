import { describe, expect, it } from "vitest";
import { shouldAnimateBell } from "./motion";

describe("shouldAnimateBell", () => {
  it("anima apenas quando chegam novas notificacoes", () => {
    expect(shouldAnimateBell(0, 1)).toBe(true);
    expect(shouldAnimateBell(2, 3)).toBe(true);
    expect(shouldAnimateBell(3, 3)).toBe(false);
    expect(shouldAnimateBell(3, 2)).toBe(false);
  });
});
