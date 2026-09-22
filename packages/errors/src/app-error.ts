import { type ErrorCode, httpStatusForCode } from "./codes.js";

export type AppErrorOptions = {
  code: ErrorCode;
  message: string;
  httpStatus?: number;
  details?: unknown;
  requestId?: string;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(options: AppErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? httpStatusForCode(options.code);
    this.details = options.details;
    this.requestId = options.requestId;
  }
}
