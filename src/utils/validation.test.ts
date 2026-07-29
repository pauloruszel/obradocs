import { describe, expect, it } from "vitest";
import { validateEmail, validateNewPassword } from "./validation";

describe("validação de credenciais", () => {
  it("aceita e-mail normalizado e rejeita formato inválido", () => {
    expect(validateEmail(" paulo@example.com ")).toBe("");
    expect(validateEmail("paulo@")).toBe("E-mail inválido.");
  });

  it("exige senha forte sem impor caractere especial", () => {
    expect(validateNewPassword("Senha123")).toBe("");
    expect(validateNewPassword("senha123")).toContain("maiúscula");
    expect(validateNewPassword("Senha")).toContain("8 e 72");
  });
});
