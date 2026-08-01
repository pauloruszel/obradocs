import { Obra, ObraConvite, Papel, Permissao } from "@models/models";
import { apiRequest } from "./apiClient";

export const listarPermissoes = (obraId: string): Promise<Permissao[]> =>
  apiRequest(`/v1/obras/${obraId}/permissoes`);

export const convidarUsuarioPorEmail = (
  obraId: string,
  email: string,
  papel: Papel = "EDITOR",
): Promise<ObraConvite> =>
  apiRequest(`/v1/obras/${obraId}/convites`, {
    method: "POST",
    body: JSON.stringify({ email, papel }),
  });

export const listarConvites = (obraId: string): Promise<ObraConvite[]> =>
  apiRequest(`/v1/obras/${obraId}/convites`);

export const revogarConvite = (obraId: string, conviteId: string): Promise<ObraConvite> =>
  apiRequest(`/v1/obras/${obraId}/convites/${conviteId}`, { method: "DELETE" });

export const aceitarConvite = (token: string): Promise<Obra> =>
  apiRequest("/v1/convites/aceitar", {
    method: "POST",
    body: JSON.stringify({ token }),
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
