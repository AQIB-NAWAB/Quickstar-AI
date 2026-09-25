import type { RequestHandler } from "@quickstart/http-server";
import type { GatewayConfig } from "../config/environment.js";

export type GatewayHttpContext = {
  config: GatewayConfig;
  redisRateLimit: RequestHandler;
  requireAccessToken: RequestHandler;
};
