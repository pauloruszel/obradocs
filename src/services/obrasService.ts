import { Obra, ObraTemplate } from "@models/models";
import { apiRequest } from "./apiClient";

export const listObrasDoUsuario = (): Promise<Obra[]> => apiRequest("/v1/obras");

export const criarObra = (
  nome: string,
  templateCodigo: ObraTemplate = "GERAL",
  modeloId?: string,
): Promise<Obra> =>
  apiRequest("/v1/obras", {
    method: "POST",
    body: JSON.stringify({ nome, template_codigo: templateCodigo, modelo_id: modeloId }),
  });

export const entrarPorCodigo = (codigo: string): Promise<Obra> =>
  apiRequest("/v1/obras/entrar", {
    method: "POST",
    body: JSON.stringify({ codigo }),
  });

export const fetchObra = (id: string): Promise<Obra> => apiRequest(`/v1/obras/${id}`);

export const renomearObra = (obraId: string, nome: string): Promise<Obra> =>
  apiRequest(`/v1/obras/${obraId}`, {
    method: "PATCH",
    body: JSON.stringify({ nome: nome.trim() }),
  });

export const excluirObra = (obraId: string): Promise<void> =>
  apiRequest(`/v1/obras/${obraId}`, { method: "DELETE" });
