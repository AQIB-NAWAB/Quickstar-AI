import type {
  CompletionRequestBody,
  CompletionResponseBody,
  DecideRequestBody,
  DecideResponseBody,
} from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Request, Response } from "@quickstart/http-server";
import { sendPlatformJson } from "@quickstart/http-server";
import type { CompletionOrchestrator } from "../services/completion-orchestrator.js";
import type { DecisionService } from "../services/decision.service.js";

function parseCompletionBody(req: Request): CompletionRequestBody {
  const body = req.body as Partial<CompletionRequestBody>;
  if (!body.workspace_id || !body.request_id || !body.model?.profile || !body.model?.model_id) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "workspace_id, request_id, and model.profile/model_id are required",
    });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "messages must be a non-empty array",
    });
  }
  return body as CompletionRequestBody;
}

function parseDecideBody(req: Request): DecideRequestBody {
  const body = req.body as Partial<DecideRequestBody>;
  if (!body.workspace_id || !body.request_id || body.state === undefined || !body.questions) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "workspace_id, request_id, state, and questions are required",
    });
  }
  return body as DecideRequestBody;
}

export function createInternalController(
  orchestrator: CompletionOrchestrator,
  decisions: DecisionService,
) {
  return {
    complete: async (req: Request, res: Response): Promise<void> => {
      const body = parseCompletionBody(req);
      const result: CompletionResponseBody = await orchestrator.complete(body);
      sendPlatformJson(res, 200, result);
    },

    stream: async (req: Request, res: Response): Promise<void> => {
      const body = parseCompletionBody(req);
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      let tokensStarted = false;
      const callbacks = {
        onToken: (delta: string) => {
          res.write(`event: token\n`);
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        },
        tokensStarted: () => tokensStarted,
        markTokensStarted: () => {
          tokensStarted = true;
        },
      };

      try {
        const result = await orchestrator.stream(body, callbacks);
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify(result)}\n\n`);
        res.end();
      } catch (error) {
        if (!tokensStarted) {
          throw error;
        }
        res.write(`event: error\n`);
        const message = error instanceof Error ? error.message : "stream failed";
        res.write(`data: ${JSON.stringify({ message })}\n\n`);
        res.end();
      }
    },

    decide: async (req: Request, res: Response): Promise<void> => {
      const body = parseDecideBody(req);
      const result: DecideResponseBody = await decisions.decide(body);
      sendPlatformJson(res, 200, result);
    },
  };
}
