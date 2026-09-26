import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { ModelGatewayHttpContext } from "../context.js";

export const createInternalRoutes: RouteModule<ModelGatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const auth = ctx.internalAuth;
  const ctrl = ctx.internalCtrl;

  router.post("/internal/complete", auth, asyncHandler(ctrl.complete));
  router.post("/internal/stream", auth, asyncHandler(ctrl.stream));
  router.post("/internal/decide", auth, asyncHandler(ctrl.decide));

  return router;
};
