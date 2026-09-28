import { sendPlatformJson, type RequestHandler } from "@quickstart/http-server";

export const SERVICE_NAME = "service-knowledge";

export type ReadinessProbe = () => Promise<void>;

export function createHealthController(probes: ReadinessProbe[] = []) {
  return {
    healthz: ((_req, res) => {
      sendPlatformJson(res, 200, { status: "ok", service: SERVICE_NAME });
    }) as RequestHandler,
    readyz: (async (_req, res) => {
      for (const probe of probes) {
        await probe();
      }
      sendPlatformJson(res, 200, { status: "ready", service: SERVICE_NAME });
    }) as RequestHandler,
  };
}
