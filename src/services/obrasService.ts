import { Obra } from "@models/models";
import { apiRequest } from "./apiClient";

const normalizarCodigoEntrada = (codigo: string) => {
  const cleaned = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return codigo.trim().toUpperCase();
};

export const listObrasDoUsuario = async (_userId?: string): Promise<Obra[]> =>
  apiRequest<Obra[]>("/v1/obras");

export const criarObra = async (nome: string, _userId?: string): Promise<Obra> =>
  apiRequest<Obra>("/v1/obras", {
    method: "POST",
    body: JSON.stringify({ nome: nome.trim() }),
  });

export const entrarPorCodigo = async (codigo: string): Promise<Obra> =>
  apiRequest<Obra>("/v1/obras/entrar", {
    method: "POST",
    body: JSON.stringify({ codigo: normalizarCodigoEntrada(codigo) }),
  });

export const fetchObra = async (id: string): Promise<Obra | null> => {
  try {
    return await apiRequest<Obra>(`/v1/obras/${id}`);
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
};

export const renomearObra = async (obraId: string, novoNome: string): Promise<Obra> =>
  apiRequest<Obra>(`/v1/obras/${obraId}`, {
    method: "PATCH",
    body: JSON.stringify({ nome: novoNome.trim() }),
  });

export const excluirObra = async (obraId: string): Promise<void> =>
  apiRequest<void>(`/v1/obras/${obraId}`, { method: "DELETE" });
