import { NextResponse } from "next/server";
import { proxyToGateway } from "@/lib/server/gateway/proxy";

export const dynamic = "force-dynamic";

type OAuthRoute = {
  workspaceId: string;
  provider: string;
};

function decodeRoute(state: string | null): OAuthRoute | null {
  if (!state) return null;
  const [workspaceId, provider] = state.split(".");
  if (!workspaceId || !provider) return null;
  return { workspaceId, provider };
}

function requestOrigin(request: Request, url: URL): string {
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

function workspaceBaseUrl(): string {
  return (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, "");
}

/**
 * One registered OAuth redirect URI for every provider and workspace. The
 * provider returns code + state; the state prefix tells us which workspace and
 * provider to complete, and the staff session cookies authenticate the
 * exchange against workspace-service.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const providerErrorDescription = url.searchParams.get("error_description");
  const route = decodeRoute(state);
  const origin = requestOrigin(request, url);

  const targetUrl = route
    ? new URL(`/workspaces/${encodeURIComponent(route.workspaceId)}/integrations`, origin)
    : new URL("/workspaces", origin);

  if (providerError) {
    targetUrl.searchParams.set("error", providerErrorDescription || providerError);
    return NextResponse.redirect(targetUrl.toString());
  }
  if (!code || !state || !route) {
    targetUrl.searchParams.set(
      "error",
      "Missing OAuth authorization code or state token",
    );
    return NextResponse.redirect(targetUrl.toString());
  }

  const callbackPath = `/v1/workspaces/${encodeURIComponent(route.workspaceId)}/integrations/${encodeURIComponent(route.provider)}/callback`;
  const internalToken = process.env.INTERNAL_TOKEN ?? process.env.WORKSPACE_INTERNAL_TOKEN;

  let failure: string | null = null;
  let connectedProvider = route.provider;
  let connectedWorkspaceId = route.workspaceId;

  if (internalToken) {
    // The one-time state is enough to complete the exchange. This keeps the
    // connection even if the browser session cookie is missing or the browser
    // changed hosts between localhost and 127.0.0.1.
    try {
      const res = await fetch(
        `${workspaceBaseUrl()}/internal/integrations/oauth/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${internalToken}`,
          },
          body: JSON.stringify({ code, state }),
          cache: "no-store",
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        provider?: string;
        workspaceId?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        failure = body.error?.message ?? "Failed to complete provider authorization";
      } else {
        connectedProvider = body.provider ?? connectedProvider;
        connectedWorkspaceId = body.workspaceId ?? connectedWorkspaceId;
      }
    } catch (err) {
      failure =
        err instanceof Error ? err.message : "Failed to complete provider authorization";
    }
  } else {
    const result = await proxyToGateway<Record<string, unknown>>(callbackPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    });
    if (!result.ok) {
      const body = (await result.response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      failure = body?.error?.message ?? "Failed to complete provider authorization";
    }
  }

  const finalUrl = new URL(
    `/workspaces/${encodeURIComponent(connectedWorkspaceId)}/integrations`,
    origin,
  );
  if (failure) {
    finalUrl.searchParams.set("error", failure);
    return NextResponse.redirect(finalUrl.toString());
  }
  finalUrl.searchParams.set("connected", connectedProvider);
  return NextResponse.redirect(finalUrl.toString());
}
