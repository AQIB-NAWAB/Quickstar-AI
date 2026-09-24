import { asyncHandler, createServiceRouter, requestIdFromResponse, type RouteModule } from "@quickstart/http-server";
import * as usersController from "../../controllers/users.controller.js";
import type { IdentityHttpContext } from "../context.js";

export const createUsersRoutes: RouteModule<IdentityHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { services, authGuard } = ctx;

  router.get(
    "/v1/me",
    authGuard,
    asyncHandler(async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const auth = res.locals.identityAuth!;
      await usersController.handleGetMe(res, requestId, auth.userId, services.users);
    }),
  );

  return router;
};
