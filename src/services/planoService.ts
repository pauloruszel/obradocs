import { apiRequest } from "./apiClient";

export type PlanoCodigo = "FREE" | "PRO";

export type MinhaAssinatura = {
  plano: {
    codigo: PlanoCodigo;
    nome: string;
    precoCentavos: number;
    moeda: string;
    fundador: boolean;
  };
  uso: {
    obras: number;
    limiteObras: number | null;
    armazenamentoBytes: number;
    limiteArmazenamentoBytes: number;
    limiteColaboradoresPorObra: number | null;
  };
};

export const consultarMinhaAssinatura = () =>
  apiRequest<MinhaAssinatura>("/v1/minha-assinatura");
