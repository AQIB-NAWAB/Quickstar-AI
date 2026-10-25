import { AppError, ErrorCode } from "@quickstart/errors";
import {
  asyncHandler,
  createServiceRouter,
  requestIdFromResponse,
  sendPlatformJson,
  type RouteModule,
} from "@quickstart/http-server";
import { postInternalJson } from "../../lib/internal-fetch.js";
import type { GatewayHttpContext } from "../context.js";

/**
 * Public, token-authenticated unsubscribe completion. The HMAC token in the
 * email link is its own proof; no staff session or publishable key is needed.
 */
export const createEmailCampaignPublicRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { config } = ctx;

  router.post(
    "/v1/public/email-campaigns/unsubscribe",
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const body = (req.body ?? {}) as { token?: string };
      const { status, json } = await postInternalJson<{
        email?: string;
        alreadySuppressed?: boolean;
        error?: { message?: string };
      }>(
        config.workspaceUrl,
        "/internal/email-campaigns/unsubscribe",
        config.internalToken,
        { token: body.token ?? "" },
        requestId,
        config.httpRequestTimeoutMs,
      );
      if (status !== 200) {
        throw new AppError({
          code: status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.UPSTREAM_UNAVAILABLE,
          message: json.error?.message ?? "Failed to unsubscribe",
          requestId,
        });
      }
      sendPlatformJson(res, 200, {
        request_id: requestId,
        email: json.email ?? null,
        alreadySuppressed: Boolean(json.alreadySuppressed),
      });
    }),
  );

  return router;
};
