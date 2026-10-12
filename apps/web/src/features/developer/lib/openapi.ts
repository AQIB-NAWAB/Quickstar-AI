import type { OpenApiOperation } from "./types";

export const OPENAPI_OPERATIONS: OpenApiOperation[] = [
  // Auth
  {
    id: "auth_register",
    method: "post",
    path: "/v1/register",
    summary: "Register user and organization",
    description: "Create a new user account and root organization.",
    tags: ["Auth"],
    hasSpecCoverage: true,
  },
  {
    id: "auth_login",
    method: "post",
    path: "/v1/login",
    summary: "Login",
    description: "Authenticate with email and password to receive a bearer JWT session.",
    tags: ["Auth"],
    hasSpecCoverage: true,
  },
  {
    id: "auth_me",
    method: "get",
    path: "/v1/me",
    summary: "Get current user",
    description: "Returns the authenticated user and organization memberships.",
    tags: ["Auth"],
    security: ["Bearer authentication"],
    hasSpecCoverage: true,
  },

  // Workspaces
  {
    id: "workspaces_list",
    method: "get",
    path: "/v1/orgs/{orgId}/workspaces",
    summary: "List workspaces in org",
    description: "Retrieve all workspaces owned by the organization.",
    tags: ["Workspaces"],
    security: ["Bearer authentication"],
    parameters: [
      {
        name: "orgId",
        in: "path",
        required: true,
        description: "Organization identifier",
      },
    ],
    hasSpecCoverage: true,
  },
  {
    id: "workspaces_create",
    method: "post",
    path: "/v1/orgs/{orgId}/workspaces",
    summary: "Create workspace",
    description: "Create a new tenant workspace under the organization.",
    tags: ["Workspaces"],
    security: ["Bearer authentication"],
    parameters: [
      {
        name: "orgId",
        in: "path",
        required: true,
        description: "Organization identifier",
      },
    ],
    hasSpecCoverage: true,
  },

  // Members
  {
    id: "members_invite",
    method: "post",
    path: "/v1/workspaces/{workspaceId}/invites",
    summary: "Create workspace invite",
    description: "Invite a team member to join the workspace.",
    tags: ["Members"],
    security: ["Bearer authentication"],
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "Workspace identifier",
      },
    ],
    hasSpecCoverage: true,
  },
  {
    id: "members_update_role",
    method: "patch",
    path: "/v1/workspaces/{workspaceId}/members/{userId}",
    summary: "Update member role",
    description: "Change permissions or role of an existing workspace member.",
    tags: ["Members"],
    security: ["Bearer authentication"],
    parameters: [
      {
        name: "workspaceId",
        in: "path",
        required: true,
        description: "Workspace identifier",
      },
      {
        name: "userId",
        in: "path",
        required: true,
        description: "User identifier",
      },
    ],
    hasSpecCoverage: true,
  },

  // Categories with spec coverage pending
  {
    id: "agents_pending",
    method: "get",
    path: "/v1/workspaces/{workspaceId}/agents",
    summary: "List agents",
    description: "Route documented outside core gateway skeleton.",
    tags: ["Agents"],
    hasSpecCoverage: false,
  },
  {
    id: "conversations_pending",
    method: "get",
    path: "/v1/workspaces/{workspaceId}/conversations",
    summary: "List conversations",
    description: "Route documented outside core gateway skeleton.",
    tags: ["Conversations"],
    hasSpecCoverage: false,
  },
];
