import type { RequestHandler } from "@quickstart/http-server";
import type { createInternalController } from "../controllers/internal.controller.js";

export type WebFetchHttpContext = {
  serviceName: string;
  internalAuth: RequestHandler;
  internalCtrl: ReturnType<typeof createInternalController>;
  readinessProbes: Array<() => Promise<void>>;
};
