import { AppError, ErrorCode } from "@quickstart/errors";
import type { RequestHandler } from "@quickstart/http-server";

export function createRequireInternalTokenMiddleware(expectedToken: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      next(new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Missing internal bearer token" }));
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (token !== expectedToken) {
      next(new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid internal bearer token" }));
      return;
    }
    next();
  };
}
