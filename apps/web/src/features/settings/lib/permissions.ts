import type { WorkspaceRole } from "./types";

export const WORKSPACE_ROLES: readonly WorkspaceRole[] = [
  "owner",
  "admin",
  "developer",
  "operator",
  "analyst",
  "human_agent",
] as const;

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  operator: "Operator",
  analyst: "Analyst",
  human_agent: "Human Agent",
};

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  owner: "Full workspace administration, member management, and deletion.",
  admin: "Manages workspace, members, agents, and credentials; cannot delete workspace.",
  developer: "Manages agents, knowledge, memory, secrets, and widget keys; no member administration.",
  operator: "Handles conversations and operational actions; limited read access.",
  analyst: "Read access to workspace, agents, analytics, knowledge, and memory.",
  human_agent: "Conversation participation and handoff with permitted tool actions.",
};

export const WORKSPACE_PERMISSIONS = {
  WORKSPACE_READ: "workspace.read",
  WORKSPACE_UPDATE: "workspace.update",
  WORKSPACE_DELETE: "workspace.delete",
  MEMBER_INVITE: "workspace.member.invite",
  MEMBER_UPDATE_ROLE: "workspace.member.update_role",
  MEMBER_REMOVE: "workspace.member.remove",
  AGENT_CREATE: "workspace.agent.create",
  AGENT_READ: "workspace.agent.read",
  AGENT_UPDATE: "workspace.agent.update",
  AGENT_PUBLISH: "workspace.agent.publish",
  AGENT_DELETE: "workspace.agent.delete",
  ANALYTICS_READ: "workspace.analytics.read",
  CONVERSATION_READ: "workspace.conversation.read",
  CONVERSATION_PARTICIPATE: "workspace.conversation.participate",
  CONVERSATION_HANDOFF: "workspace.conversation.handoff",
  KNOWLEDGE_READ: "workspace.knowledge.read",
  KNOWLEDGE_WRITE: "workspace.knowledge.write",
  MEMORY_READ: "workspace.memory.read",
  MEMORY_WRITE: "workspace.memory.write",
  TOOLS_RUN: "workspace.tools.run",
  SECRET_READ: "workspace.secret.read",
  SECRET_WRITE: "workspace.secret.write",
  PUBLISHABLE_KEY_MANAGE: "workspace.publishable_key.manage",
} as const;

export type WorkspacePermission =
  (typeof WORKSPACE_PERMISSIONS)[keyof typeof WORKSPACE_PERMISSIONS];

const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: Object.values(WORKSPACE_PERMISSIONS),
  admin: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.WORKSPACE_UPDATE,
    WORKSPACE_PERMISSIONS.MEMBER_INVITE,
    WORKSPACE_PERMISSIONS.MEMBER_UPDATE_ROLE,
    WORKSPACE_PERMISSIONS.MEMBER_REMOVE,
    WORKSPACE_PERMISSIONS.AGENT_CREATE,
    WORKSPACE_PERMISSIONS.AGENT_READ,
    WORKSPACE_PERMISSIONS.AGENT_UPDATE,
    WORKSPACE_PERMISSIONS.AGENT_PUBLISH,
    WORKSPACE_PERMISSIONS.AGENT_DELETE,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE,
    WORKSPACE_PERMISSIONS.CONVERSATION_HANDOFF,
    WORKSPACE_PERMISSIONS.KNOWLEDGE_READ,
    WORKSPACE_PERMISSIONS.KNOWLEDGE_WRITE,
    WORKSPACE_PERMISSIONS.MEMORY_READ,
    WORKSPACE_PERMISSIONS.MEMORY_WRITE,
    WORKSPACE_PERMISSIONS.TOOLS_RUN,
    WORKSPACE_PERMISSIONS.SECRET_READ,
    WORKSPACE_PERMISSIONS.SECRET_WRITE,
    WORKSPACE_PERMISSIONS.PUBLISHABLE_KEY_MANAGE,
  ],
  developer: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.AGENT_CREATE,
    WORKSPACE_PERMISSIONS.AGENT_READ,
    WORKSPACE_PERMISSIONS.AGENT_UPDATE,
    WORKSPACE_PERMISSIONS.AGENT_PUBLISH,
    WORKSPACE_PERMISSIONS.AGENT_DELETE,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
    WORKSPACE_PERMISSIONS.KNOWLEDGE_READ,
    WORKSPACE_PERMISSIONS.KNOWLEDGE_WRITE,
    WORKSPACE_PERMISSIONS.MEMORY_READ,
    WORKSPACE_PERMISSIONS.MEMORY_WRITE,
    WORKSPACE_PERMISSIONS.SECRET_READ,
    WORKSPACE_PERMISSIONS.SECRET_WRITE,
    WORKSPACE_PERMISSIONS.PUBLISHABLE_KEY_MANAGE,
  ],
  operator: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.AGENT_READ,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE,
    WORKSPACE_PERMISSIONS.CONVERSATION_HANDOFF,
    WORKSPACE_PERMISSIONS.KNOWLEDGE_READ,
    WORKSPACE_PERMISSIONS.MEMORY_READ,
    WORKSPACE_PERMISSIONS.TOOLS_RUN,
    WORKSPACE_PERMISSIONS.SECRET_READ,
  ],
  analyst: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.AGENT_READ,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
    WORKSPACE_PERMISSIONS.KNOWLEDGE_READ,
    WORKSPACE_PERMISSIONS.MEMORY_READ,
  ],
  human_agent: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE,
    WORKSPACE_PERMISSIONS.CONVERSATION_HANDOFF,
    WORKSPACE_PERMISSIONS.TOOLS_RUN,
  ],
};

export function permissionsForRole(role: WorkspaceRole): readonly WorkspacePermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(
  role: WorkspaceRole,
  permission: WorkspacePermission | string,
): boolean {
  const permissions = permissionsForRole(role);
  return permissions.includes(permission as WorkspacePermission);
}
