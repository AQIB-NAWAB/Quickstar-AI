/**
 * Security & Control section copy and verified repository facts.
 * References:
 * - docs/adr/0005-tenancy-and-rbac.md (Tenancy and Role-Based Access Control)
 * - docs/adr/0016-secrets.md (Secrets Vault with Envelope Encryption)
 * - services/secrets-service/src/lib/encrypt.ts (AES-256-GCM encryption)
 */

export interface WorkspaceRoleInfo {
  readonly id: "owner" | "admin" | "developer" | "operator" | "analyst" | "human_agent";
  readonly name: string;
  readonly description: string;
  readonly isFixed?: boolean;
}

export const WORKSPACE_ROLES: Record<string, WorkspaceRoleInfo> = {
  owner: {
    id: "owner",
    name: "Owner",
    description: "Full workspace control, billing management, deletion, and member role assignment.",
    isFixed: true,
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "Agent and member management, workspace integrations, and configuration settings.",
  },
  developer: {
    id: "developer",
    name: "Developer",
    description: "Agent creation, prompt tuning, knowledge ingestion, and agent release publishing.",
  },
  operator: {
    id: "operator",
    name: "Operator",
    description: "Live conversation monitoring, human handoffs, and real-time transcripts.",
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    description: "Analytics inspection and conversation metrics. Cannot publish or mutate agents.",
  },
  human_agent: {
    id: "human_agent",
    name: "Human Agent",
    description: "Active intervention and live responses in customer chat and phone calls.",
  },
};

export interface TeamPreviewMember {
  readonly id: string;
  readonly initials: string;
  readonly name: string;
  readonly defaultRole: WorkspaceRoleInfo["id"];
}

export const PREVIEW_MEMBERS: readonly TeamPreviewMember[] = [
  {
    id: "member-1",
    initials: "JD",
    name: "Jamie",
    defaultRole: "owner",
  },
  {
    id: "member-2",
    initials: "AS",
    name: "Alex",
    defaultRole: "admin",
  },
  {
    id: "member-3",
    initials: "ML",
    name: "Morgan",
    defaultRole: "operator",
  },
];

export interface SecurityFact {
  readonly title: string;
  readonly detail: string;
  readonly reference: string;
}

export const VERIFIED_SECURITY_FACTS: readonly SecurityFact[] = [
  {
    title: "Workspace-scoped tenant isolation",
    detail:
      "All operational resources—including conversations, agents, tools, and knowledge bases—are strictly bound to a workspace. Database queries enforce tenant boundaries at the repository layer.",
    reference: "ADR 0005 (Tenancy & RBAC)",
  },
  {
    title: "Granular role-based boundaries",
    detail:
      "Six standard roles (Owner, Admin, Developer, Operator, Analyst, Human Agent) govern actions. Dedicated permissions evaluate agent mutations, member invitations, and live handoffs.",
    reference: "ADR 0005 (Tenancy & RBAC)",
  },
  {
    title: "AES-256-GCM envelope encryption at rest",
    detail:
      "Tool credentials, integration secrets, and external tokens are encrypted using AES-256-GCM with unique 96-bit random IVs and 128-bit authentication tags before storage.",
    reference: "ADR 0016 (Secrets Vault)",
  },
  {
    title: "Call-time credential injection",
    detail:
      "Tool credentials remain inside the server-side secrets vault and are decrypted only at execution time for outgoing API calls. Secret values are never exposed to client browsers.",
    reference: "ADR 0016 (Secrets Vault)",
  },
];
