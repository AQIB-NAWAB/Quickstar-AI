import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { toAgentJson } from "../domain/types.js";
import type { AgentsService } from "../services/agents.service.js";
import { routeParam } from "../utils/route-param.js";

export function createAgentsController(agents: AgentsService) {
  return {
    createAgent: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as {
        name?: string;
        description?: string | null;
        instructions?: string;
        environment?: string;
        model_settings?: Record<string, unknown>;
        channels?: { chat?: boolean; voice?: boolean };
      };

      const agent = await agents.createAgent(tenant, {
        name: body?.name ?? "",
        description: body?.description,
        instructions: body?.instructions,
        environment: body?.environment,
        modelSettings: body?.model_settings,
        channels: body?.channels
          ? { chat: body.channels.chat ?? true, voice: body.channels.voice ?? false }
          : undefined,
      });

      sendPlatformJson(res, 201, {
        request_id: requestId,
        agent: toAgentJson(agent),
      });
    }) as RequestHandler,

    listAgents: (async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const list = await agents.listAgents(tenant);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        agents: list.map(toAgentJson),
      });
    }) as RequestHandler,

    getAgent: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      const agent = await agents.getAgent(tenant, agentId);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        agent: toAgentJson(agent),
      });
    }) as RequestHandler,

    updateAgent: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      const body = req.body as {
        name?: string;
        description?: string | null;
        instructions?: string;
        environment?: string;
        model_settings?: Record<string, unknown>;
        channels?: { chat?: boolean; voice?: boolean };
        expected_version?: number;
        version?: number;
      };

      const expectedVersion = body.expected_version ?? body.version;
      const agent = await agents.updateAgent(tenant, agentId, {
        name: body.name,
        description: body.description,
        instructions: body.instructions,
        environment: body.environment,
        modelSettings: body.model_settings,
        channels: body.channels
          ? { chat: body.channels.chat ?? true, voice: body.channels.voice ?? false }
          : undefined,
        expectedVersion: expectedVersion as number,
      });

      sendPlatformJson(res, 200, {
        request_id: requestId,
        agent: toAgentJson(agent),
      });
    }) as RequestHandler,

    deleteAgent: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      await agents.deleteAgent(tenant, agentId);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        deleted: true,
      });
    }) as RequestHandler,
  };
}
