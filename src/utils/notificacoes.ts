import { Notificacao } from "@services/notificacoesService";
import { formatFileName } from "./display";

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
  return "Há uma nova atividade nesta obra.";
};
