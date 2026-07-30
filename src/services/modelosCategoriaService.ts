import { CategoriaObra, ModeloCategoria } from "@models/models";
import { apiRequest } from "./apiClient";

export const listarModelosCategoria = (): Promise<ModeloCategoria[]> =>
  apiRequest("/v1/modelos-categoria");

export const salvarModeloCategoria = (
  nome: string,
  categorias: CategoriaObra[],
): Promise<ModeloCategoria> =>
  apiRequest("/v1/modelos-categoria", {
    method: "POST",
    body: JSON.stringify({
      nome: nome.trim(),
      categorias: categorias.map((categoria, ordem) => ({
        nome: categoria.nome,
        tipo: categoria.tipo,
        ordem,
      })),
    }),
  });
