import { Arquivo } from "@models/models";

export const selecionarRevisaoOficial = (
  arquivoAtual: Arquivo,
  revisoes: Arquivo[],
): Arquivo | null =>
  revisoes.find((revisao) => revisao.oficial_aprovada)
  || revisoes.find((revisao) => revisao.revisao === arquivoAtual.revisao_aprovada)
  || null;
