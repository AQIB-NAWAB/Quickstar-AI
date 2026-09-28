import { AppError, ErrorCode } from "@quickstart/errors";

const WORKSPACE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertWorkspaceId(workspaceId: string, field = "workspace_id"): void {
  if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `${field} must be a UUID`,
    });
  }
}

export function assertHttpUrl(url: string, field = "url"): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `${field} must be a valid http(s) URL`,
    });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `${field} must use http or https`,
    });
  }
}
