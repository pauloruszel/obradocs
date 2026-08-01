import { apiRequest, PageResponse } from "./apiClient";

export type Notificacao = {
  id: string;
  historico_id: string;
  obra_id: string;
  obra_nome: string | null;
  autor_id: string | null;
  autor_nome: string | null;
  acao: string;
  detalhes: Record<string, unknown> | null;
  lida_at: string | null;
  created_at: string;
};

export const listarNotificacoes = () =>
  apiRequest<Notificacao[]>("/v1/notificacoes");

export const listarNotificacoesPagina = (page: number) =>
  apiRequest<PageResponse<Notificacao>>(`/v1/notificacoes/pagina?page=${page}&size=20`);

export const contarNotificacoesNaoLidas = async () => {
  const response = await apiRequest<{ quantidade: number }>("/v1/notificacoes/nao-lidas/count");
  return response.quantidade;
};

export const marcarNotificacaoComoLida = (notificacaoId: string) =>
  apiRequest<void>(`/v1/notificacoes/${notificacaoId}/lida`, { method: "PATCH" });

export const marcarTodasNotificacoesComoLidas = () =>
  apiRequest<void>("/v1/notificacoes/lidas", { method: "PATCH" });
