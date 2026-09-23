import { AppError, ErrorCode } from "@quickstart/errors";
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { requestIdFromResponse } from "./request-id.js";
import { sendPlatformError } from "../send-platform-json.js";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  /** Skip rate limit for these pathnames (e.g. health checks). */
  skipPaths?: string[];
  message?: string;
};

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const skipPaths = new Set(options.skipPaths ?? []);
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => skipPaths.has(req.path),
    handler: (_req, res) => {
      const requestId = requestIdFromResponse(res);
      sendPlatformError(
        res,
        new AppError({
          code: ErrorCode.RATE_LIMITED,
          message: options.message ?? "Too many requests",
          requestId,
        }),
        requestId,
      );
    },
  });
}
