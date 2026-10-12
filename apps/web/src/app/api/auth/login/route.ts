import { NextResponse } from "next/server";
import { applyTokenCookies, type TokenPair } from "@/lib/server/auth/cookies";
import { gatewayFetch } from "@/lib/server/gateway/fetch";
import { ensureWorkspaceForUser } from "@/lib/server/workspace/workspaces";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Email and password are required" } },
      { status: 400 },
    );
  }

  const login = await gatewayFetch<TokenPair>("/v1/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!login.ok) {
    return NextResponse.json({ error: login.error }, { status: login.status || 401 });
  }

  const workspaceId = await ensureWorkspaceForUser(login.data.access_token);
  if (!workspaceId) {
    return NextResponse.json(
      {
        error: { code: "WORKSPACE_SETUP_FAILED", message: "Could not load or create a workspace" },
      },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ redirect: `/workspaces/${workspaceId}/agents` });
  applyTokenCookies(res, login.data);
  return res;
}
