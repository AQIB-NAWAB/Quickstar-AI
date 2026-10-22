export interface AuditActor {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  type: "user" | "system" | "service";
}

export interface AuditResource {
  type: string;
  id: string;
  name: string;
}

export interface AuditChanges {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export interface AuditEntry {
  id: string;
  workspaceId: string;
  actor: AuditActor;
  action: string;
  resource: AuditResource;
  occurredAt: string; // ISO UTC
  requestId: string | null;
  originIp?: string | null;
  countryCode?: string | null;
  city?: string | null;
  userAgent?: string | null;
  metadata: Record<string, unknown>;
  changes?: AuditChanges | null;
  isRedacted?: boolean;
}

export interface AuditFilters {
  resource?: string;
  actor?: string;
  actions?: string[];
  range?: "7d" | "30d" | "90d" | "custom";
  fromDate?: string;
  toDate?: string;
  cursor?: string;
  q?: string;
  limit?: number;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export interface AuditRepository {
  listEntries(
    workspaceId: string,
    filters?: AuditFilters,
    signal?: AbortSignal
  ): Promise<RepositoryResult<{ entries: AuditEntry[]; nextCursor?: string; prevCursor?: string; total?: number }>>;

  getEntry(
    workspaceId: string,
    entryId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<AuditEntry>>;
}
