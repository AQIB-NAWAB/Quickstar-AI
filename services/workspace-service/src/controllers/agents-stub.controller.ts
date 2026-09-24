import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";

export function createAgentsStubController() {
  return {
    publishAgent: ((req, res) => {
      const requestId = requestIdFromResponse(res);
      const agentId = req.params.agentId;

      sendPlatformJson(res, 200, {
        request_id: requestId,
        published: true,
        agent_id: agentId,
      });
    }) as RequestHandler,
  };
}
