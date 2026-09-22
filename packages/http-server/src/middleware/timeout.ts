import { AppError, ErrorCode } from "@quickstart/errors";
import type { RequestHandler } from "express";
import { requestIdFromResponse } from "./request-id.js";
import { sendPlatformError } from "../send-platform-json.js";

/** Abort work if the handler does not finish within `timeoutMs` (defense in depth; gateway also sets limits). */
export function requestTimeoutMiddleware(timeoutMs: number): RequestHandler {
  return (_req, res, next) => {
    const requestId = requestIdFromResponse(res);
    let finished = false;

    const timer = setTimeout(() => {
      if (finished || res.headersSent) {
        return;
      }
      finished = true;
      res.locals.requestTimedOut = true;
      sendPlatformError(
        res,
        new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: "Request timed out",
          requestId,
        }),
        requestId,
      );
    }, timeoutMs);

    res.once("finish", () => {
      finished = true;
      clearTimeout(timer);
    });
    res.once("close", () => {
      finished = true;
      clearTimeout(timer);
    });

    next();
  };
}
