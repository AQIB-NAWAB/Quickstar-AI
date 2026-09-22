import type { ServerResponse } from "node:http";
import type { HealthResponse } from "@quickstart/contracts";
import { sendJson } from "../utils/http-response.js";

export const SERVICE_NAME = "service-identity";

export type ReadinessProbe = () => Promise<void>;

export function handleHealth(res: ServerResponse): void {
  const body: HealthResponse = { status: "ok", service: SERVICE_NAME };
  sendJson(res, 200, body);
}

export async function handleReady(res: ServerResponse, probes: ReadinessProbe[]): Promise<void> {
  try {
    for (const probe of probes) {
      await probe();
    }
    sendJson(res, 200, { status: "ready", service: SERVICE_NAME });
  } catch {
    sendJson(res, 503, { status: "not_ready", service: SERVICE_NAME });
  }
}
