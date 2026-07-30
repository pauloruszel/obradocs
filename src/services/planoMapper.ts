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

export type MinhaAssinaturaApi = {
  plano: {
    codigo: PlanoCodigo;
    nome: string;
    preco_centavos: number;
    moeda: string;
    fundador: boolean;
  };
  uso: {
    obras: number;
    limite_obras: number | null;
    armazenamento_bytes: number;
    limite_armazenamento_bytes: number;
    limite_colaboradores_por_obra: number | null;
  };
};

export const normalizarMinhaAssinatura = (response: MinhaAssinaturaApi): MinhaAssinatura => ({
  plano: {
    codigo: response.plano.codigo,
    nome: response.plano.nome,
    precoCentavos: response.plano.preco_centavos,
    moeda: response.plano.moeda,
    fundador: response.plano.fundador,
  },
  uso: {
    obras: response.uso.obras,
    limiteObras: response.uso.limite_obras,
    armazenamentoBytes: response.uso.armazenamento_bytes,
    limiteArmazenamentoBytes: response.uso.limite_armazenamento_bytes,
    limiteColaboradoresPorObra: response.uso.limite_colaboradores_por_obra,
  },
});
