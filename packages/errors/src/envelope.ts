import { AppError } from "./app-error.js";
import { ErrorCode } from "./codes.js";

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: unknown;
  };
};

export function toErrorEnvelope(error: unknown, requestId: string): ErrorEnvelope {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        request_id: error.requestId ?? requestId,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    };
  }

  return {
    error: {
      code: ErrorCode.INTERNAL,
      message: "An unexpected error occurred",
      request_id: requestId,
    },
  };
}

export function httpStatusForError(error: unknown): number {
  if (error instanceof AppError) {
    return error.httpStatus;
  }
  return 500;
}
