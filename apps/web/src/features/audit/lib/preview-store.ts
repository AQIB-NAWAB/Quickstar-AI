import { SAMPLE_AUDIT_ENTRIES } from "./fixtures";
import type { AuditEntry,AuditFilters,AuditRepository,RepositoryResult } from "./types";

class InMemoryAuditPreviewStore implements AuditRepository {
  private entries: AuditEntry[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.entries = JSON.parse(JSON.stringify(SAMPLE_AUDIT_ENTRIES));
  }

  async listEntries(
    _workspaceId: string,
    filters?: AuditFilters,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<{ entries: AuditEntry[]; nextCursor?: string; prevCursor?: string }>> {
    void _workspaceId;
    void _signal;
    let result = [...this.entries];

    if (filters?.resource?.trim()) {
      const q = filters.resource.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.resource.id.toLowerCase().includes(q) ||
          e.resource.name.toLowerCase().includes(q)
      );
    }

    if (filters?.actor && filters.actor !== "all") {
      result = result.filter(
        (e) => e.actor.id === filters.actor || e.actor.name === filters.actor || e.actor.type === filters.actor
      );
    }

    if (filters?.actions && filters.actions.length > 0 && !filters.actions.includes("all")) {
      result = result.filter((e) => filters.actions!.includes(e.action));
    }

    return {
      status: "ready",
      data: {
        entries: result,
      },
    };
  }

  async getEntry(
    _workspaceId: string,
    entryId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<AuditEntry>> {
    void _workspaceId;
    void _signal;
    const found = this.entries.find((e) => e.id === entryId);
    if (found) {
      return {
        status: "ready",
        data: JSON.parse(JSON.stringify(found)),
      };
    }
    return {
      status: "not_found",
      message: `Audit entry ${entryId} was not found.`,
    };
  }
}

export const auditPreviewStore = new InMemoryAuditPreviewStore();
