import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { WorkspaceHttpContext } from "../context.js";

export const createInvitesRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { authGuard, membersCtrl } = ctx;

  // Verify invite token (public or authenticated)
  router.get("/v1/invites/verify", asyncHandler(membersCtrl.verifyInvite));

  // Accept invite (requires authenticated user)
  router.post("/v1/invites/accept", authGuard, asyncHandler(membersCtrl.acceptInvite));

  return router;
};
