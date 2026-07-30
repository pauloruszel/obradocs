import { describe, expect, it, vi } from "vitest";
import { executeDeleteObraFlow } from "./deleteObraFlow";

describe("executeDeleteObraFlow", () => {
  it("executa sucesso somente depois da exclusão terminar", async () => {
    const order: string[] = [];
    const deleteObra = vi.fn(async () => {
      order.push("delete");
    });
    const onSuccess = vi.fn(() => order.push("success"));
    const onError = vi.fn();

    const result = await executeDeleteObraFlow({ deleteObra, onSuccess, onError });

    expect(result).toBe(true);
    expect(order).toEqual(["delete", "success"]);
    expect(deleteObra).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("mantém a tela atual e apresenta erro quando a exclusão falha", async () => {
    const deleteObra = vi.fn(async () => {
      throw new Error("falha de rede");
    });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const result = await executeDeleteObraFlow({ deleteObra, onSuccess, onError });

    expect(result).toBe(false);
    expect(deleteObra).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });
});
