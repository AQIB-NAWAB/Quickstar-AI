import { randomUUID } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";

export function getRequestIdFromRequest(req: Request): string {
  const incoming = req.headers["x-request-id"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && value.length > 0 ? value : randomUUID();
}

/** Attach `res.locals.requestId` and echo `x-request-id` on the response. */
export function requestIdMiddleware(): RequestHandler {
  return (req, res, next) => {
    const requestId = getRequestIdFromRequest(req);
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  };
}

export function requestIdFromResponse(res: Response): string {
  return res.locals.requestId;
}
