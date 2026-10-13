import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { PublishableKeysService } from "../services/publishable-keys.service.js";
import { routeParam } from "../utils/route-param.js";

export function createPublishableKeysController(service: PublishableKeysService) {
  return {
    create: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as {
        name?: string;
        allowed_origins?: string[];
        default_agent_id?: string | null;
      };
      const created = await service.createKey(
        tenant,
        {
          name: body.name ?? "",
          allowed_origins: body.allowed_origins ?? [],
          default_agent_id: body.default_agent_id,
        },
        { requestId },
      );
      sendPlatformJson(res, 201, { request_id: requestId, publishable_key: created });
    }) as RequestHandler,

    list: (async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const keys = await service.listKeys(tenant);
      sendPlatformJson(res, 200, { request_id: requestId, publishable_keys: keys });
    }) as RequestHandler,

    update: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const keyId = routeParam(req.params.keyId);
      const body = req.body as {
        name?: string;
        allowed_origins?: string[];
        default_agent_id?: string | null;
      };
      const updated = await service.updateKey(tenant, keyId, body);
      sendPlatformJson(res, 200, { request_id: requestId, publishable_key: updated });
    }) as RequestHandler,

    revoke: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const keyId = routeParam(req.params.keyId);
      await service.revokeKey(tenant, keyId, { requestId });
      res.status(204);
      res.setHeader("x-request-id", requestId);
      res.end();
    }) as RequestHandler,

    resolveInternal: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const body = req.body as { key?: string };
      const resolved = await service.resolveKey(body.key ?? "");
      sendPlatformJson(res, 200, { request_id: requestId, ...resolved });
    }) as RequestHandler,
  };
}
