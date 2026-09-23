import type { Response } from "@quickstart/http-server";
import { sendPlatformJson } from "@quickstart/http-server";

export const SERVICE_NAME = "service-workspace";

export type ReadinessProbe = () => Promise<void>;

export function handleHealth(res: Response): void {
  sendPlatformJson(res, 200, { status: "ok", service: SERVICE_NAME });
}

export async function handleReady(res: Response, probes: ReadinessProbe[]): Promise<void> {
  try {
    for (const probe of probes) {
      await probe();
    }
    sendPlatformJson(res, 200, { status: "ready", service: SERVICE_NAME });
  } catch {
    sendPlatformJson(res, 503, { status: "not_ready", service: SERVICE_NAME });
  }
}
