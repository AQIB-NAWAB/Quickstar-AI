import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { routeParam } from "../utils/route-param.js";
import type { FactsService } from "../services/facts.service.js";

export function createInternalController(facts: FactsService) {
  return {
    listFacts: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const workspaceId = routeParam(req.params.workspaceId);
      const subjectKey = String(req.query.subject_key ?? "");
      const limit = req.query.limit;
      const result = await facts.listInternal(workspaceId, subjectKey, limit);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        facts: result.facts,
        total: result.total,
      });
    }) as RequestHandler,
  };
}
