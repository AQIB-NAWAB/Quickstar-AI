import type {
  ApiKeyItem,
  ApiError,
  CreateApiKeyResult,
  CreatePublishableKeyResult,
  CustomToolItem,
  PublishableKeyItem,
  SecretItem,
  WorkspaceData,
  WorkspaceMember,
  WorkspaceRole,
} from "./types";
import type {
  BillingSummaryResponse,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionResponse,
} from "@quickstart/contracts";

type BffResponse<T> = { data?: T; error?: ApiError; status: number };

async function bff<T>(path: string, init?: RequestInit): Promise<BffResponse<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (res.status === 204) {
      return { status: 204, data: undefined as unknown as T };
    }

    const body = (await res.json().catch(() => ({}))) as {
      error?: ApiError;
      [key: string]: unknown;
    };

    if (!res.ok) {
      return {
        status: res.status,
        error: body?.error ?? {
          code: `HTTP_${res.status}`,
          message: res.statusText || "Request failed",
        },
      };
    }

    return { status: res.status, data: body as unknown as T };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    return {
      status: 0,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network request failed",
      },
    };
  }
}

// Workspace Management
export async function getWorkspace(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<{ workspace?: WorkspaceData; error?: ApiError }> {
  const { data, error } = await bff<{ workspace: WorkspaceData }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    { signal },
  );
  if (error) return { error };
  return { workspace: data?.workspace };
}

export async function updateWorkspace(
  workspaceId: string,
  input: { name: string; slug: string },
): Promise<{ workspace?: WorkspaceData; error?: ApiError }> {
  const { data, error } = await bff<{ workspace: WorkspaceData }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { workspace: data?.workspace };
}

export async function deleteWorkspace(
  workspaceId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { data, error } = await bff<{ deleted: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: Boolean(data?.deleted) };
}

// Members & Invites
export async function listMembers(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<{ members?: WorkspaceMember[]; error?: ApiError }> {
  const { data, error } = await bff<{ members: WorkspaceMember[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
    { signal },
  );
  if (error) return { error };
  return { members: data?.members ?? [] };
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<{ member?: WorkspaceMember; error?: ApiError }> {
  const { data, error } = await bff<{ member: WorkspaceMember }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
  if (error) return { error };
  return { member: data?.member };
}

export async function removeMember(
  workspaceId: string,
  userId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { data, error } = await bff<{ removed: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: Boolean(data?.removed) };
}

export async function createInvite(
  workspaceId: string,
  input: { email: string; role: WorkspaceRole },
): Promise<{ rawToken?: string; error?: ApiError }> {
  const { data, error } = await bff<{ raw_token?: string }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/invites`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { rawToken: data?.raw_token };
}

// Organization API Keys
export async function listApiKeys(
  orgId: string,
  signal?: AbortSignal,
): Promise<{ apiKeys?: ApiKeyItem[]; error?: ApiError }> {
  const { data, error } = await bff<{ api_keys: ApiKeyItem[] }>(
    `/api/organizations/${encodeURIComponent(orgId)}/api-keys`,
    { signal },
  );
  if (error) return { error };
  return { apiKeys: data?.api_keys ?? [] };
}

export async function createApiKey(
  orgId: string,
  name: string,
): Promise<{ key?: CreateApiKeyResult; error?: ApiError }> {
  const { data, error } = await bff<CreateApiKeyResult>(
    `/api/organizations/${encodeURIComponent(orgId)}/api-keys`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
  );
  if (error) return { error };
  return { key: data };
}

export async function revokeApiKey(
  orgId: string,
  keyId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { error } = await bff<void>(
    `/api/organizations/${encodeURIComponent(orgId)}/api-keys/${encodeURIComponent(keyId)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: true };
}

// Secrets Vault
export async function listSecrets(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<{ secrets?: SecretItem[]; error?: ApiError }> {
  const { data, error } = await bff<{ secrets: SecretItem[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/secrets`,
    { signal },
  );
  if (error) return { error };
  return { secrets: data?.secrets ?? [] };
}

export async function createSecret(
  workspaceId: string,
  input: { name: string; value: string },
): Promise<{ secret?: SecretItem; error?: ApiError }> {
  const { data, error } = await bff<{ secret: SecretItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/secrets`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { secret: data?.secret };
}

export async function rotateSecret(
  workspaceId: string,
  name: string,
): Promise<{ secret?: SecretItem; error?: ApiError }> {
  const { data, error } = await bff<{ secret: SecretItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/secrets/${encodeURIComponent(name)}/rotate`,
    {
      method: "PUT",
    },
  );
  if (error) return { error };
  return { secret: data?.secret };
}

export async function deleteSecret(
  workspaceId: string,
  name: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { data, error } = await bff<{ deleted: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/secrets/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: Boolean(data?.deleted) };
}

// Publishable Keys (Widget)
export async function listPublishableKeys(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<{ publishableKeys?: PublishableKeyItem[]; error?: ApiError }> {
  const { data, error } = await bff<{ publishable_keys: PublishableKeyItem[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/publishable-keys`,
    { signal },
  );
  if (error) return { error };
  return { publishableKeys: data?.publishable_keys ?? [] };
}

export async function createPublishableKey(
  workspaceId: string,
  input: { name: string; allowed_origins: string[] },
): Promise<{ publishableKey?: CreatePublishableKeyResult; error?: ApiError }> {
  const { data, error } = await bff<{ publishable_key: CreatePublishableKeyResult }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/publishable-keys`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { publishableKey: data?.publishable_key };
}

export async function updatePublishableKeyOrigins(
  workspaceId: string,
  keyId: string,
  allowed_origins: string[],
): Promise<{ publishableKey?: PublishableKeyItem; error?: ApiError }> {
  const { data, error } = await bff<{ publishable_key: PublishableKeyItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/publishable-keys/${encodeURIComponent(keyId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ allowed_origins }),
    },
  );
  if (error) return { error };
  return { publishableKey: data?.publishable_key };
}

export async function revokePublishableKey(
  workspaceId: string,
  keyId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { error } = await bff<void>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/publishable-keys/${encodeURIComponent(keyId)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: true };
}

// Custom tools (agent-callable workspace integrations)
export type CustomToolPayload = {
  name: string;
  description?: string;
  kind: CustomToolItem["kind"];
  config: CustomToolItem["config"];
};

export async function listCustomTools(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<{ tools?: CustomToolItem[]; error?: ApiError }> {
  const { data, error } = await bff<{ tools: CustomToolItem[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/custom-tools`,
    { signal },
  );
  if (error) return { error };
  return { tools: data?.tools ?? [] };
}

export async function createCustomTool(
  workspaceId: string,
  input: CustomToolPayload,
): Promise<{ tool?: CustomToolItem; error?: ApiError }> {
  const { data, error } = await bff<{ tool: CustomToolItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/custom-tools`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { tool: data?.tool };
}

export async function updateCustomTool(
  workspaceId: string,
  toolId: string,
  input: Partial<CustomToolPayload>,
): Promise<{ tool?: CustomToolItem; error?: ApiError }> {
  const { data, error } = await bff<{ tool: CustomToolItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/custom-tools/${encodeURIComponent(toolId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (error) return { error };
  return { tool: data?.tool };
}

export async function deleteCustomTool(
  workspaceId: string,
  toolId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { data, error } = await bff<{ deleted: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/custom-tools/${encodeURIComponent(toolId)}`,
    {
      method: "DELETE",
    },
  );
  if (error) return { success: false, error };
  return { success: Boolean(data?.deleted) };
}

export async function getBillingSummary(
  orgId: string,
): Promise<{ data?: BillingSummaryResponse; error?: ApiError }> {
  const { data, error } = await bff<BillingSummaryResponse>(
    `/api/organizations/${encodeURIComponent(orgId)}/billing`,
  );
  if (error) return { error };
  return { data };
}

export async function createCheckoutSession(
  orgId: string,
  planId: string,
  interval: "month" | "year",
): Promise<{ data?: CreateCheckoutSessionResponse; error?: ApiError }> {
  const successUrl = typeof window !== "undefined"
    ? `${window.location.origin}/settings?tab=billing&session=success`
    : "";
  const cancelUrl = typeof window !== "undefined"
    ? `${window.location.origin}/settings?tab=billing&session=canceled`
    : "";
  const { data, error } = await bff<CreateCheckoutSessionResponse>(
    `/api/organizations/${encodeURIComponent(orgId)}/billing/checkout`,
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        interval,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    },
  );
  if (error) return { error };
  return { data };
}

export async function createCustomerPortalSession(
  orgId: string,
): Promise<{ data?: CreateCustomerPortalSessionResponse; error?: ApiError }> {
  const returnUrl = typeof window !== "undefined"
    ? `${window.location.origin}/settings?tab=billing`
    : "";
  const { data, error } = await bff<CreateCustomerPortalSessionResponse>(
    `/api/organizations/${encodeURIComponent(orgId)}/billing/portal`,
    {
      method: "POST",
      body: JSON.stringify({ return_url: returnUrl }),
    },
  );
  if (error) return { error };
  return { data };
}

export async function cancelSubscription(
  orgId: string,
  immediately = false,
): Promise<{ error?: ApiError }> {
  const { error } = await bff(
    `/api/organizations/${encodeURIComponent(orgId)}/billing/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ immediately }),
    },
  );
  if (error) return { error };
  return {};
}

