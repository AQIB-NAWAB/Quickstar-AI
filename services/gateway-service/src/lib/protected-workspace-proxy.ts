import { asyncHandler, type RequestHandler } from "@quickstart/http-server";
import type { GatewayHttpContext } from "../http/context.js";
import { proxyToUpstream } from "./proxy.js";

export function createProtectedWorkspaceProxyChain(
  ctx: GatewayHttpContext,
  upstreamBaseUrl: string,
): RequestHandler[] {
  const { requireAccessToken, requireWorkspaceMembership, config } = ctx;
  return [
    requireAccessToken,
    requireWorkspaceMembership,
    asyncHandler(async (req, res) => {
      await proxyToUpstream(req, res, upstreamBaseUrl, {
        timeoutMs: config.httpRequestTimeoutMs,
        access: res.locals.accessToken,
        rawBearer: res.locals.rawBearerToken,
      });
    }),
  ];
}
