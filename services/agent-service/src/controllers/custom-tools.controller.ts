import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import type { CustomToolInput, CustomToolUpdate } from "@quickstart/contracts";
import type { CustomToolsService } from "../services/custom-tools.service.js";
import { routeParam } from "../utils/route-param.js";

export function createCustomToolsController(customTools: CustomToolsService) {
  return {
    listCustomTools: (async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const tools = await customTools.listCustomTools(tenant);
      sendPlatformJson(res, 200, { request_id: requestId, tools });
    }) as RequestHandler,

    createCustomTool: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as CustomToolInput;
      const tool = await customTools.createCustomTool(tenant, body);
      sendPlatformJson(res, 201, { request_id: requestId, tool });
    }) as RequestHandler,

    getCustomTool: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const toolId = routeParam(req.params.toolId);
      const tool = await customTools.getCustomTool(tenant, toolId);
      sendPlatformJson(res, 200, { request_id: requestId, tool });
    }) as RequestHandler,

    updateCustomTool: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const toolId = routeParam(req.params.toolId);
      const body = req.body as CustomToolUpdate;
      const tool = await customTools.updateCustomTool(tenant, toolId, body);
      sendPlatformJson(res, 200, { request_id: requestId, tool });
    }) as RequestHandler,

    deleteCustomTool: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const toolId = routeParam(req.params.toolId);
      await customTools.deleteCustomTool(tenant, toolId);
      sendPlatformJson(res, 200, { request_id: requestId, deleted: true });
    }) as RequestHandler,
  };
}
