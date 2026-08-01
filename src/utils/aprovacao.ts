import { AprovacaoStatus, Arquivo } from "@models/models";

export type AprovacaoFiltro = "ALL" | AprovacaoStatus;

export const aprovacaoLabel: Record<AprovacaoStatus, string> = {
  PENDING: "Aguardando aprovação",
  APPROVED: "Aprovado",
  CHANGES_REQUESTED: "Alterações solicitadas",
};

export const filtrarRevisoesPorAprovacao = (
  revisoes: Arquivo[],
  filtro: AprovacaoFiltro,
) => filtro === "ALL" ? revisoes : revisoes.filter((item) => item.aprovacao_status === filtro);
