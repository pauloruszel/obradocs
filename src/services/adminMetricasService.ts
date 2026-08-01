import { apiRequest } from "./apiClient";

export type AdminMetricas = {
  inicio: string;
  fim: string;
  convites_enviados: number;
  convites_aceitos: number;
  taxa_aceite: number;
  revisoes_enviadas: number;
  aprovacoes_solicitadas: number;
  aprovacoes_concluidas: number;
  tempo_medio_aprovacao_horas: number | null;
  alteracoes_solicitadas: number;
  atividade_por_obra: {
    obra_id: string;
    obra_nome: string;
    usuarios_com_atividade_registrada: number;
  }[];
};

export const consultarMetricasAdministrativas = (inicio: string, fim: string) =>
  apiRequest<AdminMetricas>(`/v1/admin/metricas?inicio=${inicio}&fim=${fim}`);
