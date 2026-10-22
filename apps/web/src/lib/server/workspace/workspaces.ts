import { gatewayFetch } from "../gateway/fetch";

export type WorkspaceSummary = {
  id: string;
  orgId?: string;
  org_id?: string;
  name: string;
  slug: string;
};

export type MeResponse = {
  user: { id: string; email: string };
  organizations: { id: string; name: string }[];
};

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

function normalizeWorkspace(raw: Record<string, unknown>): WorkspaceSummary {
  return {
    id: String(raw.id),
    orgId: (raw.orgId as string | undefined) ?? (raw.org_id as string | undefined),
    name: String(raw.name),
    slug: String(raw.slug),
  };
}

export async function fetchMe(accessToken: string): Promise<MeResponse | null> {
  const res = await gatewayFetch<MeResponse>("/v1/me", { accessToken });
  return res.ok ? res.data : null;
}

export async function listOrgWorkspaces(
  accessToken: string,
  orgId: string,
): Promise<WorkspaceSummary[]> {
  const res = await gatewayFetch<{ workspaces: Record<string, unknown>[] }>(
    `/v1/orgs/${encodeURIComponent(orgId)}/workspaces`,
    { accessToken },
  );
  if (!res.ok) {
    return [];
  }
  return (res.data.workspaces ?? []).map(normalizeWorkspace);
}

export async function createWorkspace(
  accessToken: string,
  orgId: string,
  name: string,
  slug: string,
): Promise<WorkspaceSummary | null> {
  const res = await gatewayFetch<{ workspace: Record<string, unknown> }>(
    `/v1/orgs/${encodeURIComponent(orgId)}/workspaces`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ name, slug }),
    },
  );
  if (!res.ok) {
    return null;
  }
  return normalizeWorkspace(res.data.workspace);
}

/** Pick first workspace for user across all authorized organizations or create a default one. */
export async function ensureWorkspaceForUser(accessToken: string): Promise<string | null> {
  const me = await fetchMe(accessToken);
  if (!me?.organizations?.length) {
    return null;
  }

  // Check each authorized organization for existing workspaces
  for (const org of me.organizations) {
    const list = await listOrgWorkspaces(accessToken, org.id);
    if (list.length > 0) {
      return list[0]!.id;
    }
  }

  // If no workspaces exist across any organization, create default in the primary organization
  const org = me.organizations[0]!;
  const slug = slugify(org.name);
  const created = await createWorkspace(accessToken, org.id, org.name, slug);
  return created?.id ?? null;
}
