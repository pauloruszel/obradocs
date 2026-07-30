export type RequestErrorLike = {
  status?: number;
  message?: string;
  code?: string;
};

export type UpgradeLimitCode =
  | "PLAN_LIMIT_REACHED"
  | "STORAGE_LIMIT_REACHED"
  | "COLLABORATOR_LIMIT_REACHED";

const UPGRADE_LIMIT_CODES: UpgradeLimitCode[] = [
  "PLAN_LIMIT_REACHED",
  "STORAGE_LIMIT_REACHED",
  "COLLABORATOR_LIMIT_REACHED",
];

export const getUpgradeLimitCode = (error: unknown): UpgradeLimitCode | null => {
  if (!error || typeof error !== "object") return null;
  const code = (error as RequestErrorLike).code as UpgradeLimitCode;
  return UPGRADE_LIMIT_CODES.includes(code) ? code : null;
};

export const isPlanLimitReached = (error: unknown) =>
  getUpgradeLimitCode(error) === "PLAN_LIMIT_REACHED";

export const usageLevel = (used: number, limit: number | null) => {
  if (limit == null || limit <= 0) return "available" as const;
  if (used >= limit) return "limit" as const;
  if (used / limit >= 0.8) return "warning" as const;
  return "available" as const;
};
