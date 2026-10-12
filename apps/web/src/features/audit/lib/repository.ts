import { auditPreviewStore } from "./preview-store";
import type { AuditEntry,AuditFilters,AuditRepository,RepositoryResult } from "./types";

class UnavailableAuditRepository implements AuditRepository {
  async listEntries(
    _workspaceId: string,
    _filters?: AuditFilters,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<{ entries: AuditEntry[]; nextCursor?: string; prevCursor?: string }>> {
    void _workspaceId;
    void _filters;
    void _signal;
    return {
      status: "unavailable",
      message: "Audit logging service is not connected for this workspace.",
    };
  }

  async getEntry(
    _workspaceId: string,
    _entryId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<AuditEntry>> {
    void _workspaceId;
    void _entryId;
    void _signal;
    return {
      status: "unavailable",
      message: "Audit entry records are not available. Service is disconnected.",
    };
  }
}

export const unavailableAuditRepository = new UnavailableAuditRepository();

export function getAuditRepository(isPreview: boolean): AuditRepository {
  if (isPreview) {
    return auditPreviewStore;
  }
  return unavailableAuditRepository;
}
