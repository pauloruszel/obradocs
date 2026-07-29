import { apiRequest } from "./apiClient";

export const reportContent = (
  targetType: "OBRA" | "ARQUIVO",
  targetId: string,
  reason: string,
) =>
  apiRequest<void>("/v1/reports", {
    method: "POST",
    body: JSON.stringify({
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim(),
    }),
  });
