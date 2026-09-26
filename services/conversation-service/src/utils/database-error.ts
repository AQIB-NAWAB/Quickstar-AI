import { AppError, ErrorCode } from "@quickstart/errors";

type PgErrorLike = { code?: string };

function isPgError(error: unknown): error is PgErrorLike {
  return typeof error === "object" && error !== null && "code" in error;
}

/** Postgres unique_violation — concurrent idempotent retries on the same key. */
export function isUniqueViolation(error: unknown): boolean {
  return isPgError(error) && error.code === "23505";
}

const UNAVAILABLE_PG_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "57P01",
  "57P02",
  "57P03",
  "53300",
]);

function isPostgresUnavailable(error: unknown): boolean {
  if (!isPgError(error) || !error.code) {
    return false;
  }
  if (UNAVAILABLE_PG_CODES.has(error.code)) {
    return true;
  }
  return error.code.startsWith("08");
}

/** Map driver / Postgres failures to platform errors (ADR 0008: fail closed on DB down). */
export function mapConversationDatastoreError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (isPostgresUnavailable(error)) {
    return new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: "Database unavailable",
    });
  }
  return new AppError({
    code: ErrorCode.INTERNAL,
    message: "Database error",
  });
}
