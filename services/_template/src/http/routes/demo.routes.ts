import { extractAuthContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import {
  asyncHandler,
  createServiceRouter,
  requestIdFromResponse,
  sendPlatformJson,
  type RouteModule,
} from "@quickstart/http-server";
import { fetchWithPolicy } from "@quickstart/utilities";
import type { TemplateHttpContext } from "../context.js";

function headerRecord(req: { headers: Record<string, string | string[] | undefined> }) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? (value[0] ?? "") : value;
  }
  return out;
}

export const createDemoRoutes: RouteModule<TemplateHttpContext> = (ctx) => {
  const router = createServiceRouter();

  router.get(
    "/demo/error",
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const auth = extractAuthContext(headerRecord(req));
      void auth?.tenantId;
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Demo validation failure",
        requestId,
        details: { field: "example" },
      });
    }),
  );

  router.get(
    "/demo/outbound",
    asyncHandler(async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const response = await fetchWithPolicy(
        `http://127.0.0.1:${ctx.port}/healthz`,
        { method: "GET" },
        { timeoutMs: 2_000, maxRetries: 2 },
      );
      const payload = await response.json();
      sendPlatformJson(res, response.status, { request_id: requestId, upstream: payload });
    }),
  );

  return router;
};
