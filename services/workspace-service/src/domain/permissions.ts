export const WORKSPACE_ROLES = [
  "owner",
  "admin",
  "developer",
  "operator",
  "analyst",
  "human_agent",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

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
} as const;

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[keyof typeof WORKSPACE_PERMISSIONS];

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
  ],
  developer: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.AGENT_CREATE,
    WORKSPACE_PERMISSIONS.AGENT_READ,
    WORKSPACE_PERMISSIONS.AGENT_UPDATE,
    WORKSPACE_PERMISSIONS.AGENT_PUBLISH,
    WORKSPACE_PERMISSIONS.AGENT_DELETE,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
  ],
  operator: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.AGENT_READ,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE,
  ],
  analyst: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.AGENT_READ,
    WORKSPACE_PERMISSIONS.ANALYTICS_READ,
  ],
  human_agent: [
    WORKSPACE_PERMISSIONS.WORKSPACE_READ,
    WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE,
  ],
};

export function permissionsForRole(role: WorkspaceRole): readonly WorkspacePermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: WorkspaceRole, permission: WorkspacePermission | string): boolean {
  const permissions = permissionsForRole(role);
  return permissions.includes(permission as WorkspacePermission);
}
