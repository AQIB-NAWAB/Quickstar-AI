import type { Response } from "express";
import { httpStatusForError, toErrorEnvelope } from "@quickstart/errors";

export function sendPlatformJson(res: Response, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function sendPlatformError(res: Response, error: unknown, requestId: string): void {
  const status = httpStatusForError(error);
  res.status(status).json(toErrorEnvelope(error, requestId));
}
