import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { IntegrationProvider } from "@quickstart/contracts";
import type { IntegrationsService } from "../services/integrations.service.js";
import { routeParam } from "../utils/route-param.js";

function getWorkspaceId(req: { params: Record<string, any> }): string {
  const wid = routeParam(req.params.workspaceId);
  if (!wid) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "workspaceId parameter is required",
    });
  }
  return wid;
}

function getProvider(req: { params: Record<string, any> }): IntegrationProvider {
  const p = routeParam(req.params.provider) as IntegrationProvider;
  if (!p) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "provider parameter is required",
    });
  }
  return p;
}

export function createIntegrationsController(service: IntegrationsService) {
  return {
    list: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const result = await service.listIntegrations(workspaceId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    get: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const provider = getProvider(req);
      const result = await service.getIntegration(workspaceId, provider);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        integration: result,
      });
    }) as RequestHandler,

    authorize: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const provider = getProvider(req);
      const userId = res.locals.workspaceAuth?.userId ?? "user_default";
      const body = (req.body ?? {}) as { redirect_uri?: string };
      const redirectUri = body.redirect_uri || `http://localhost:3000/api/workspaces/${workspaceId}/integrations/${provider}/callback`;

      const result = await service.initiateOAuth(workspaceId, userId, provider, redirectUri);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    callback: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const provider = getProvider(req);
      const userId = res.locals.workspaceAuth?.userId ?? "user_default";
      const body = (req.body ?? {}) as { code?: string; state?: string };
      if (!body.state) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "state parameter is required in callback",
        });
      }

      const result = await service.handleOAuthCallback(
        workspaceId,
        userId,
        provider,
        body.code ?? "auth_code",
        body.state,
      );
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        integration: result,
      });
    }) as RequestHandler,

    credentials: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const provider = getProvider(req);
      const body = (req.body ?? {}) as { credentials?: Record<string, string> };
      const result = await service.saveCredentials(workspaceId, provider, body.credentials ?? {});
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        integration: result,
      });
    }) as RequestHandler,

    disconnect: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const provider = getProvider(req);
      const result = await service.disconnect(workspaceId, provider);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        integration: result,
      });
    }) as RequestHandler,
  };
}
