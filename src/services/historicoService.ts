import { Historico } from "@models/models";
import { apiRequest } from "./apiClient";

export const listarHistorico = async (obraId: string): Promise<Historico[]> =>
  apiRequest<Historico[]>(`/v1/obras/${obraId}/historico`);
