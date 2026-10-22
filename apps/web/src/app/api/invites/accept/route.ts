import { NextResponse } from "next/server";
import { gatewayFetch, getAccessTokenFromCookies } from "@/lib/server/gateway/fetch";

export async function POST(request: Request) {
  try {
    const accessToken = await getAccessTokenFromCookies();
    if (!accessToken) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in or create an account to accept this invitation" } },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim() ?? "";

    if (!token) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Invitation token is required" } },
        { status: 400 },
      );
    }

    const result = await gatewayFetch<{
      workspace: { id: string; name: string };
      membership: { id: string; userId: string; role: string };
    }>("/v1/invites/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
      accessToken,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      ok: true,
      workspace: result.data.workspace,
      redirect: `/workspaces/${result.data.workspace.id}/agents`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to accept workspace invitation" } },
      { status: 500 },
    );
  }
}
