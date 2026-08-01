import { Notificacao } from "@services/notificacoesService";
import { formatFileName } from "./display";

export const notificationBadgeLabel = (count: number) => {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
};

const detail = (item: Notificacao, ...keys: string[]) => {
  for (const key of keys) {
    const value = item.detalhes?.[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "";
};

export const mensagemNotificacao = (item: Notificacao) => {
  const author = item.autor_nome || "Alguém";

  if (item.acao === "UPLOAD_ARQUIVO") {
    const name = detail(item, "nomeOriginal", "nome_original", "nome");
    return `${author} enviou ${name ? formatFileName(name) : "um arquivo"}.`;
  }
  if (item.acao === "NOVA_REVISAO") {
    const name = detail(item, "nome", "nomeOriginal", "nome_original");
    const revision = detail(item, "revisao");
    return `${author} enviou ${revision ? `a revisão R${revision}` : "uma nova revisão"}${name ? ` de ${formatFileName(name)}` : ""}.`;
  }
  if (item.acao === "ACESSO_CONCEDIDO") {
    return `${author} concedeu acesso a você.`;
  }
  if (item.acao === "ENTROU_OBRA") {
    return `${author} entrou na obra usando o código de compartilhamento.`;
  }
  if (item.acao === "APROVACAO_SOLICITADA") {
    const revision = detail(item, "revisao");
    return `${author} solicitou aprovação${revision ? ` para a revisão R${revision}` : ""}.`;
  }
  if (item.acao === "REVISAO_APROVADA") {
    const revision = detail(item, "revisao");
    return `${author} aprovou${revision ? ` a revisão R${revision}` : " uma revisão"}.`;
  }
  if (item.acao === "ALTERACOES_SOLICITADAS") {
    const revision = detail(item, "revisao");
    return `${author} solicitou alterações${revision ? ` na revisão R${revision}` : ""}.`;
  }
  return "Há uma nova atividade nesta obra.";
};
