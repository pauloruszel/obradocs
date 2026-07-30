import { apiRequest } from "./apiClient";

export type UpgradeInterest = {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  empresa?: string | null;
  status: "PENDING" | "CONTACTED" | "CONVERTED" | "CANCELLED";
  created_at: string;
  updated_at: string;
};

export type AdminUpgradeInterest = UpgradeInterest & {
  usuario_id: string;
  origem: string;
};

export const registrarInteresseUpgrade = (payload: { telefone?: string; empresa?: string }) =>
  apiRequest<UpgradeInterest>("/v1/upgrade-interest", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const consultarMeuInteresse = () =>
  apiRequest<UpgradeInterest>("/v1/upgrade-interest/me");

export const listarInteressesUpgrade = () =>
  apiRequest<AdminUpgradeInterest[]>("/v1/upgrade-interest/admin");

export const consultarCapacidadeAdministrativa = () =>
  apiRequest<{ admin: boolean }>("/v1/upgrade-interest/admin-capability");

export const atualizarStatusInteresse = (
  id: string,
  status: "CONTACTED" | "CONVERTED" | "CANCELLED",
) =>
  apiRequest<void>(`/v1/upgrade-interest/admin/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
