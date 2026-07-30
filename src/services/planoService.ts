import { apiRequest } from "./apiClient";
import {
  MinhaAssinatura,
  MinhaAssinaturaApi,
  normalizarMinhaAssinatura,
  PlanoCodigo,
} from "./planoMapper";

export type { MinhaAssinatura, PlanoCodigo } from "./planoMapper";
export { normalizarMinhaAssinatura } from "./planoMapper";

export const consultarMinhaAssinatura = async () =>
  normalizarMinhaAssinatura(await apiRequest<MinhaAssinaturaApi>("/v1/minha-assinatura"));
