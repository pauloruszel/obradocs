export type RequestErrorLike = {
  status?: number;
  message?: string;
};

const PLAN_LIMIT_MESSAGE = "Você atingiu o limite de obras do seu plano.";

export const isPlanLimitReached = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as RequestErrorLike;
  return candidate.status === 409 && candidate.message === PLAN_LIMIT_MESSAGE;
};

export const usageLevel = (used: number, limit: number | null) => {
  if (limit == null || limit <= 0) return "available" as const;
  if (used >= limit) return "limit" as const;
  if (used / limit >= 0.8) return "warning" as const;
  return "available" as const;
};
