export { AppError, type AppErrorOptions } from "./app-error.js";
export { ErrorCode, httpStatusForCode } from "./codes.js";
export type { ErrorCode as PlatformErrorCode } from "./codes.js";
export { toErrorEnvelope, httpStatusForError, type ErrorEnvelope } from "./envelope.js";
