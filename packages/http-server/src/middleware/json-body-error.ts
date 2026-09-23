import { AppError, ErrorCode } from "@quickstart/errors";
import type { ErrorRequestHandler } from "express";
import { requestIdFromResponse } from "./request-id.js";
import { sendPlatformError } from "../send-platform-json.js";

/** Map malformed JSON bodies to the platform validation envelope. */
export function jsonBodyErrorMiddleware(): ErrorRequestHandler {
  return (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const isSyntax =
      error instanceof SyntaxError &&
      typeof error === "object" &&
      error !== null &&
      "body" in error;
    if (!isSyntax) {
      next(error);
      return;
    }
    const requestId = requestIdFromResponse(res);
    sendPlatformError(
      res,
      new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid JSON body",
        requestId,
      }),
      requestId,
    );
  };
}
