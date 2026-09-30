import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { AgentToolDefinition } from "@quickstart/contracts";
import { toAgentJson, toAgentVersionJson } from "../domain/types.js";
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
        tools?: AgentToolDefinition[];
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
        tools: body?.tools,
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
        tools?: AgentToolDefinition[];
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
        tools: body.tools,
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

    publishAgent: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      const body = req.body as { base_version?: number; version?: number };
      const baseVersion = body.base_version ?? body.version;

      const result = await agents.publish(tenant, agentId, baseVersion as number);

      sendPlatformJson(res, 201, {
        request_id: requestId,
        version: toAgentVersionJson(result.version),
        agent: toAgentJson(result.agent),
      });
    }) as RequestHandler,

    rollbackAgent: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      const body = req.body as { version_id?: string };

      const result = await agents.rollback(tenant, agentId, body.version_id ?? "");

      sendPlatformJson(res, 200, {
        request_id: requestId,
        version: toAgentVersionJson(result.version),
        agent: toAgentJson(result.agent),
      });
    }) as RequestHandler,

    listVersions: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const list = await agents.listVersions(tenant, agentId, limit);

      sendPlatformJson(res, 200, {
        request_id: requestId,
        versions: list.map(toAgentVersionJson),
      });
    }) as RequestHandler,

    getVersion: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      const versionId = routeParam(req.params.versionId);

      const version = await agents.getVersion(tenant, agentId, versionId);

      sendPlatformJson(res, 200, {
        request_id: requestId,
        version: toAgentVersionJson(version),
      });
    }) as RequestHandler,

    diffVersions: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const agentId = routeParam(req.params.agentId);
      const leftId = routeParam(req.params.leftId);
      const rightId = routeParam(req.params.rightId);

      const diff = await agents.diffVersions(tenant, agentId, leftId, rightId);

      sendPlatformJson(res, 200, {
        request_id: requestId,
        left_id: diff.leftId,
        right_id: diff.rightId,
        fields: diff.fields,
      });
    }) as RequestHandler,
  };
}
