import { Papel, Permissao } from "@models/models";
import { apiRequest } from "./apiClient";

export const listarPermissoes = (obraId: string): Promise<Permissao[]> =>
  apiRequest(`/v1/obras/${obraId}/permissoes`);

export const convidarUsuarioPorEmail = (
  obraId: string,
  email: string,
  papel: Papel = "EDITOR",
): Promise<Permissao> =>
  apiRequest(`/v1/obras/${obraId}/permissoes`, {
    method: "POST",
    body: JSON.stringify({ email, papel }),
  });

export const atualizarPermissao = (
  obraId: string,
  permissaoId: string,
  papel: Papel,
): Promise<Permissao> =>
  apiRequest(`/v1/obras/${obraId}/permissoes/${permissaoId}`, {
    method: "PATCH",
    body: JSON.stringify({ papel }),
  });

export const removerPermissao = (obraId: string, permissaoId: string): Promise<void> =>
  apiRequest(`/v1/obras/${obraId}/permissoes/${permissaoId}`, { method: "DELETE" });
