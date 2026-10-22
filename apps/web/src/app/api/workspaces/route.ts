import { NextResponse } from "next/server";
import { getAccessTokenFromCookies, gatewayFetch } from "@/lib/server/gateway/fetch";
import { fetchMe, listOrgWorkspaces } from "@/lib/server/workspace/workspaces";

export async function GET() {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await fetchMe(token);
  if (!me?.organizations?.length) {
    return NextResponse.json({
      workspaces: [],
      organizations: [],
      currentUser: me?.user || null,
    });
  }

  const allWorkspaces = await Promise.all(
    me.organizations.map((org) => listOrgWorkspaces(token, org.id)),
  );

  const flatWorkspaces = allWorkspaces.flat();

  return NextResponse.json({
    workspaces: flatWorkspaces,
    organizations: me.organizations,
    currentUser: me.user,
  });
}

export async function POST(req: Request) {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  let body: { name?: string; slug?: string; orgId?: string };
  try {
    body = (await req.json()) as { name?: string; slug?: string; orgId?: string };
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const name = body.name?.trim() || "";
  let slug = (body.slug?.trim() || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!name || name.length < 2 || name.length > 60) {
    return NextResponse.json(
      {
        error: {
          message: "Workspace name must be between 2 and 60 characters.",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  if (!slug) {
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  if (slug.length < 2 || slug.length > 40) {
    return NextResponse.json(
      {
        error: {
          message: "Workspace slug must be between 2 and 40 characters.",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  const me = await fetchMe(token);
  if (!me?.organizations?.length) {
    return NextResponse.json(
      {
        error: {
          message: "No organization found to create workspace in.",
          code: "ORGANIZATION_REQUIRED",
        },
      },
      { status: 400 },
    );
  }

  let targetOrgId = body.orgId;
  if (targetOrgId) {
    const isMember = me.organizations.some((o) => o.id === targetOrgId);
    if (!isMember) {
      return NextResponse.json(
        {
          error: {
            message: "Access denied: not a member of the specified organization",
            code: "FORBIDDEN",
          },
        },
        { status: 403 },
      );
    }
  } else {
    targetOrgId = me.organizations[0]?.id;
  }

  if (!targetOrgId) {
    return NextResponse.json(
      {
        error: {
          message: "No organization found to create workspace in.",
          code: "ORGANIZATION_REQUIRED",
        },
      },
      { status: 400 },
    );
  }

  const res = await gatewayFetch<{ workspace: Record<string, unknown> }>(
    `/v1/orgs/${encodeURIComponent(targetOrgId)}/workspaces`,
    {
      method: "POST",
      accessToken: token,
      body: JSON.stringify({ name, slug }),
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: res.error },
      { status: res.status },
    );
  }

  return NextResponse.json(
    { ok: true, workspace: res.data.workspace },
    { status: 201 },
  );
}
