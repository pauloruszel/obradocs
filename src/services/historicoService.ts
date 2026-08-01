import { Historico } from "@models/models";
import { apiRequest, PageResponse } from "./apiClient";

export const listarHistorico = (obraId: string): Promise<Historico[]> =>
  apiRequest(`/v1/obras/${obraId}/historico`);

export const listarHistoricoPagina = (
  obraId: string,
  page: number,
): Promise<PageResponse<Historico>> =>
  apiRequest(`/v1/obras/${obraId}/historico/pagina?page=${page}&size=20`);
