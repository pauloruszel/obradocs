import { Papel, Permissao } from "@models/models";
import { apiRequest } from "./apiClient";

export const listarPermissoes = async (obraId: string): Promise<Permissao[]> =>
  apiRequest<Permissao[]>(`/v1/obras/${obraId}/permissoes`);

export const adicionarPermissao = async (obraId: string, userId: string, papel: Papel) =>
  apiRequest<Permissao>(`/v1/obras/${obraId}/permissoes`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, papel }),
  });

export const atualizarPermissao = async (permissaoId: string, papel: Papel) =>
  apiRequest<Permissao>(`/v1/permissoes/${permissaoId}`, {
    method: "PATCH",
    body: JSON.stringify({ papel }),
  });

export const removerPermissao = async (permissaoId: string) =>
  apiRequest<void>(`/v1/permissoes/${permissaoId}`, { method: "DELETE" });

export const convidarUsuarioPorEmail = async (
  obraId: string,
  email: string,
  papel: Papel = "EDITOR"
) =>
  apiRequest<Permissao>(`/v1/obras/${obraId}/permissoes/por-email`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), papel }),
  });
