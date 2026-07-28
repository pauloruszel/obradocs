import { Historico } from "@models/models";
import { apiRequest } from "./apiClient";

export const listarHistorico = (obraId: string): Promise<Historico[]> =>
  apiRequest(`/v1/obras/${obraId}/historico`);
