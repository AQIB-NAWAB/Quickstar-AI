import type { AuditEntry } from "./types";

export const SAMPLE_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "aud_1042",
    workspaceId: "local-preview",
    actor: {
      id: "usr_alex",
      name: "Alex Morgan",
      email: "alex@example.com",
      type: "user",
    },
    action: "agent.published",
    resource: {
      id: "agent_1024",
      type: "agent",
      name: "SupportAssistant",
    },
    occurredAt: "2026-10-10T14:22:00.000Z",
    requestId: "req_8c21",
    metadata: {
      agent_id: "agent_1024",
      version: 8,
      request_id: "req_8c21",
    },
    changes: {
      before: {
        version: 7,
        status: "published",
      },
      after: {
        version: 8,
        status: "published",
      },
    },
  },
  {
    id: "aud_1041",
    workspaceId: "local-preview",
    actor: {
      id: "usr_jordan",
      name: "Jordan Lee",
      email: "jordan@example.com",
      type: "user",
    },
    action: "member.role_updated",
    resource: {
      id: "user_301",
      type: "member",
      name: "Sam Patel",
    },
    occurredAt: "2026-10-10T13:48:00.000Z",
    requestId: "req_8c20",
    metadata: {
      target_user_id: "user_301",
      previous_role: "developer",
      new_role: "analyst",
    },
    changes: {
      before: {
        role: "developer",
      },
      after: {
        role: "analyst",
      },
    },
  },
  {
    id: "aud_1040",
    workspaceId: "local-preview",
    actor: {
      id: "usr_alex",
      name: "Alex Morgan",
      email: "alex@example.com",
      type: "user",
    },
    action: "secret.rotated",
    resource: {
      id: "sec_crm",
      type: "secret",
      name: "CRM_ACCESS_TOKEN",
    },
    occurredAt: "2026-10-10T12:31:00.000Z",
    requestId: "req_8c19",
    metadata: {
      secret_name: "CRM_ACCESS_TOKEN",
      key_version: 2,
    },
    changes: null,
  },
  {
    id: "aud_1039",
    workspaceId: "local-preview",
    actor: {
      id: "sys_core",
      name: "System",
      type: "system",
    },
    action: "knowledge.ingest_failed",
    resource: {
      id: "source_224",
      type: "knowledge_source",
      name: "Product guide",
    },
    occurredAt: "2026-10-10T11:12:00.000Z",
    requestId: "req_8c18",
    metadata: {
      source_id: "source_224",
      reason: "Document chunk extraction timeout after 3 retries",
      status_code: 504,
    },
    changes: null,
  },
  {
    id: "aud_1038",
    workspaceId: "local-preview",
    actor: {
      id: "usr_sam",
      name: "Sam Patel",
      email: "sam@example.com",
      type: "user",
    },
    action: "workspace.updated",
    resource: {
      id: "ws_acme",
      type: "workspace",
      name: "AcmeSupport",
    },
    occurredAt: "2026-10-09T16:04:00.000Z",
    requestId: "req_8b99",
    metadata: {
      workspace_id: "ws_acme",
      field: "name",
    },
    changes: {
      before: {
        name: "Acme Support",
      },
      after: {
        name: "AcmeSupport",
      },
    },
  },
];
