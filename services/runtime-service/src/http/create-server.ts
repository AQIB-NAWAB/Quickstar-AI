import { bearerTokenFromHeader, verifyAccessToken } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Logger } from "@quickstart/logging";
import { createPlatformApp, type Application } from "@quickstart/http-server";
import { SERVICE_NAME, type ReadinessProbe } from "../controllers/health.controller.js";
import { createEvalTurnsController } from "../controllers/eval-turns.controller.js";
import { createGraphTurnsController } from "../controllers/graph-turns.controller.js";
import { createTurnsController } from "../controllers/turns.controller.js";
import { createVoiceTurnsController } from "../controllers/voice-turns.controller.js";
import { createWidgetTurnsController } from "../controllers/widget-turns.controller.js";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { createRequireInternalTokenMiddleware } from "../middleware/require-internal-token.js";
import { requireTenantContext } from "../middleware/tenant.middleware.js";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { TurnsService } from "../services/turns.service.js";
import type { GraphTurnsService } from "../services/graph-turns.service.js";
import type { RuntimeHttpContext } from "./context.js";
import { createRuntimeApiRouter } from "./routes/index.js";

export { SERVICE_NAME };

export type CreateRuntimeHttpServerOptions = {
  logger: Logger;
  turnsService: TurnsService;
  graphTurnsService?: GraphTurnsService;
  workspaceAccess: WorkspaceAccessClient;
  jwtSecret?: string;
  internalToken: string;
  readinessProbes?: ReadinessProbe[];
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
};

export function createHttpServer(options: CreateRuntimeHttpServerOptions): Application {
  const { logger, turnsService, graphTurnsService, jwtSecret, workspaceAccess } = options;

  const authGuard = createAuthMiddleware(jwtSecret);
  const tenantGuard = requireTenantContext();

  const httpContext: RuntimeHttpContext = {
    readinessProbes: options.readinessProbes ?? [],
    authGuard,
    graphAuthGuard: async (req, res, next) => {
      try {
        const token = bearerTokenFromHeader(req.headers.authorization);
        if (!token || !jwtSecret) throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "A verified access token is required for canvas operations." });
        const claims = await verifyAccessToken(token, jwtSecret);
        res.locals.actorUserId = claims.sub;
        if (res.locals.tenantContext) res.locals.tenantContext = { workspaceId: res.locals.tenantContext.workspaceId, actorId: claims.sub };
        next();
      } catch { next(new AppError({code:ErrorCode.UNAUTHORIZED,message:"Invalid or missing canvas access token."})); }
    },
    internalAuth: createRequireInternalTokenMiddleware(options.internalToken),
    tenantMiddleware: [authGuard, tenantGuard],
    turnsCtrl: createTurnsController(turnsService),
    widgetTurnsCtrl: createWidgetTurnsController(turnsService),
    voiceTurnsCtrl: createVoiceTurnsController(turnsService),
    evalTurnsCtrl: createEvalTurnsController(turnsService),
    graphTurnsCtrl: createGraphTurnsController(
      graphTurnsService ?? ({} as unknown as GraphTurnsService),
    ),
    workspaceAccess,
  };

  const apiRouter = createRuntimeApiRouter(httpContext);

  return createPlatformApp({
    logger,
    apiRouter,
    requestTimeoutMs: options.requestTimeoutMs ?? 30_000,
    globalRateLimit: {
      windowMs: options.rateLimitWindowMs ?? 60_000,
      max: options.rateLimitMax ?? 300,
      skipPaths: ["/healthz", "/health", "/readyz"],
    },
  });
}
