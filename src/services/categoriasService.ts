import { ArquivoTipo, CategoriaObra } from "@models/models";
import { apiRequest } from "./apiClient";

export const listarCategorias = (obraId: string): Promise<CategoriaObra[]> =>
  apiRequest(`/v1/obras/${obraId}/categorias`);

export const adicionarCategoria = (
  obraId: string,
  nome: string,
  tipo: ArquivoTipo,
): Promise<CategoriaObra> =>
  apiRequest(`/v1/obras/${obraId}/categorias`, {
    method: "POST",
    body: JSON.stringify({ nome: nome.trim(), tipo }),
  });

export const atualizarCategoria = (
  obraId: string,
  categoriaId: string,
  data: { nome?: string; ordem?: number },
): Promise<CategoriaObra> =>
  apiRequest(`/v1/obras/${obraId}/categorias/${categoriaId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
