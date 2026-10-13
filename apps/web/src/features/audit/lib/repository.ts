import { apiAuditRepository } from "./api-repository";
import { auditPreviewStore } from "./preview-store";
import type { AuditRepository } from "./types";

export function getAuditRepository(isPreview: boolean): AuditRepository {
  if (isPreview) {
    return auditPreviewStore;
  }
  return apiAuditRepository;
}
