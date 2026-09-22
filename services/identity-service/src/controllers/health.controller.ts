import type { ServerResponse } from "node:http";
import type { HealthResponse } from "@quickstart/contracts";
import { sendJson } from "../utils/http-response.js";

export const SERVICE_NAME = "service-identity";

export function handleHealth(res: ServerResponse): void {
  const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
  sendJson(res, 200, body);
}
