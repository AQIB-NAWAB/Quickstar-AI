import { AppError, ErrorCode } from "@quickstart/errors";

/** Turn Postgres driver errors into platform errors (avoid raw 500 where we can). */
export function mapDatabaseError(error: unknown, requestId?: string): AppError {
  if (isPgError(error)) {
    if (error.code === "23505") {
      return new AppError({
        code: ErrorCode.CONFLICT,
        message: "Resource already exists",
        requestId,
      });
    }
    if (error.code === "22P02") {
      return new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid identifier format",
        requestId,
      });
    }
  }
  return new AppError({
    code: ErrorCode.INTERNAL,
    message: "Database error",
    requestId,
  });
}

export function rethrowDatabaseError(error: unknown, requestId?: string): never {
  if (error instanceof AppError) {
    throw error;
  }
  throw mapDatabaseError(error, requestId);
}

type PgErrorLike = { code?: string };

function isPgError(error: unknown): error is PgErrorLike {
  return typeof error === "object" && error !== null && "code" in error;
}
