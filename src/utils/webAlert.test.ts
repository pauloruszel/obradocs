import { describe, expect, it, vi } from "vitest";
import { executeWebAlert } from "./webAlert";

describe("executeWebAlert", () => {
  it("executa a ação destrutiva quando o usuário confirma", () => {
    const cancel = vi.fn();
    const remove = vi.fn();
    const confirm = vi.fn(() => true);

    executeWebAlert(
      "Excluir obra permanentemente?",
      "Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel", onPress: cancel },
        { text: "Excluir obra", style: "destructive", onPress: remove },
      ],
      { alert: vi.fn(), confirm },
    );

    expect(confirm).toHaveBeenCalledWith(
      "Excluir obra permanentemente?\n\nEsta ação não pode ser desfeita.",
    );
    expect(remove).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("executa a ação de cancelamento quando o usuário recusa", () => {
    const cancel = vi.fn();
    const remove = vi.fn();

    executeWebAlert(
      "Excluir obra?",
      undefined,
      [
        { text: "Cancelar", style: "cancel", onPress: cancel },
        { text: "Excluir", style: "destructive", onPress: remove },
      ],
      { alert: vi.fn(), confirm: vi.fn(() => false) },
    );

    expect(cancel).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });

  it("mantém alerta informativo de um único botão", () => {
    const acknowledged = vi.fn();
    const alert = vi.fn();
    const confirm = vi.fn();

    executeWebAlert(
      "Aviso",
      "Operação concluída.",
      [{ text: "OK", onPress: acknowledged }],
      { alert, confirm },
    );

    expect(alert).toHaveBeenCalledWith("Aviso\n\nOperação concluída.");
    expect(acknowledged).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("usa a segunda ação como confirmação quando não há estilo destrutivo", () => {
    const first = vi.fn();
    const second = vi.fn();

    executeWebAlert(
      "Continuar?",
      undefined,
      [
        { text: "Não", onPress: first },
        { text: "Sim", onPress: second },
      ],
      { alert: vi.fn(), confirm: vi.fn(() => true) },
    );

    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });
});
