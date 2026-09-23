import { AppError, ErrorCode } from "@quickstart/errors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: string, label: string, requestId?: string): string {
  if (!UUID_RE.test(value)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Invalid ${label}`,
      requestId,
    });
  }
  return value;
}
