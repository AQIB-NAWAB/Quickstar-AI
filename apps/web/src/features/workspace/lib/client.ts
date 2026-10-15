import type { CreateWorkspaceInput, WorkspaceItem, WorkspacesApiResponse } from "./types";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function fetchWorkspaces(): Promise<WorkspacesApiResponse> {
  const res = await fetch("/api/workspaces", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load workspaces (${res.status})`);
  }
  return res.json() as Promise<WorkspacesApiResponse>;
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<{ ok: boolean; workspace?: WorkspaceItem; error?: string }> {
  try {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      workspace?: WorkspaceItem;
      error?: { message?: string } | string;
    };

    if (!res.ok) {
      const msg =
        typeof data.error === "string"
          ? data.error
          : data.error?.message || `Failed to create workspace (${res.status})`;
      return { ok: false, error: msg };
    }

    return { ok: true, workspace: data.workspace };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error creating workspace",
    };
  }
}
