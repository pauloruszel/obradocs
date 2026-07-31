import { describe, expect, it } from "vitest";
import { Notificacao } from "@services/notificacoesService";
import { mensagemNotificacao, notificationBadgeLabel } from "./notificacoes";

const notification = (acao: string, detalhes: Record<string, unknown>): Notificacao => ({
  id: "notification-id",
  historico_id: "history-id",
  obra_id: "work-id",
  obra_nome: "Casa",
  autor_id: "author-id",
  autor_nome: "Paulo",
  acao,
  detalhes,
  lida_at: null,
  created_at: "2026-07-31T12:00:00Z",
});

describe("mensagemNotificacao", () => {
  it("descreve arquivo e revisão com os dados do evento", () => {
    expect(mensagemNotificacao(notification("UPLOAD_ARQUIVO", { nomeOriginal: "planta%20baixa.pdf" })))
      .toBe("Paulo enviou planta baixa.pdf.");
    expect(mensagemNotificacao(notification("NOVA_REVISAO", { nome: "Projeto.pdf", revisao: 2 })))
      .toBe("Paulo enviou a revisão R2 de Projeto.pdf.");
  });

  it("descreve mudanças de acesso", () => {
    expect(mensagemNotificacao(notification("ACESSO_CONCEDIDO", {})))
      .toBe("Paulo concedeu acesso a você.");
    expect(mensagemNotificacao(notification("ENTROU_OBRA", {})))
      .toBe("Paulo entrou na obra usando o código de compartilhamento.");
  });
});

describe("notificationBadgeLabel", () => {
  it("oculta zero e limita contagens acima de 99", () => {
    expect(notificationBadgeLabel(0)).toBeNull();
    expect(notificationBadgeLabel(99)).toBe("99");
    expect(notificationBadgeLabel(100)).toBe("99+");
  });
});
