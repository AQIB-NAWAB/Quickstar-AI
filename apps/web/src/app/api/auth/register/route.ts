import { NextResponse } from "next/server";
import { applyTokenCookies, type TokenPair } from "@/lib/server/auth/cookies";
import { gatewayFetch } from "@/lib/server/gateway/fetch";
import { createWorkspace } from "@/lib/server/workspace/workspaces";

type RegisterResponse = {
  user_id: string;
  org_id: string;
  tokens: TokenPair;
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

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    organization_name?: string;
  };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const organizationName = body.organization_name?.trim() ?? "";

  if (!email || !password || !organizationName) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Email, password, and organization name are required",
        },
      },
      { status: 400 },
    );
  }

  const reg = await gatewayFetch<RegisterResponse>("/v1/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      organization_name: organizationName,
    }),
  });

  if (!reg.ok) {
    return NextResponse.json({ error: reg.error }, { status: reg.status || 400 });
  }

  const tokens = reg.data.tokens;
  const workspace =
    (await createWorkspace(
      tokens.access_token,
      reg.data.org_id,
      organizationName,
      slugify(organizationName),
    )) ??
    (await createWorkspace(
      tokens.access_token,
      reg.data.org_id,
      organizationName,
      `${slugify(organizationName)}-${Date.now().toString(36).slice(-4)}`,
    ));

  if (!workspace) {
    return NextResponse.json(
      {
        error: {
          code: "WORKSPACE_SETUP_FAILED",
          message: "Account created but workspace setup failed",
        },
      },
      { status: 503 },
    );
  }

  const res = NextResponse.json({
    redirect: `/workspaces/${workspace.id}/agents`,
  });
  applyTokenCookies(res, tokens);
  return res;
}
