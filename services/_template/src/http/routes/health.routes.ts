import type { HealthResponse } from "@quickstart/contracts";
import { createServiceRouter, sendPlatformJson, type RouteModule } from "@quickstart/http-server";
import type { TemplateHttpContext } from "../context.js";

export const createHealthRoutes: RouteModule<TemplateHttpContext> = (ctx) => {
  const router = createServiceRouter();

  router.get("/healthz", (_req, res) => {
    const body: HealthResponse = { status: "ok", service: ctx.serviceName };
    sendPlatformJson(res, 200, body);
  });
  router.get("/health", (_req, res) => {
    const body: HealthResponse = { status: "ok", service: ctx.serviceName };
    sendPlatformJson(res, 200, body);
  });

  return router;
};
