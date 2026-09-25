import type { HealthResponse } from "@quickstart/contracts";
import { createServiceRouter, sendPlatformJson, type RouteModule } from "@quickstart/http-server";
import type { GatewayHttpContext } from "../context.js";

export const SERVICE_NAME = "service-gateway";

export const createHealthRoutes: RouteModule<GatewayHttpContext> = () => {
  const router = createServiceRouter();

  router.get("/healthz", (_req, res) => {
    const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
    sendPlatformJson(res, 200, body);
  });
  router.get("/health", (_req, res) => {
    const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
    sendPlatformJson(res, 200, body);
  });

  return router;
};
