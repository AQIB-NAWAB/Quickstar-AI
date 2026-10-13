import type { CompletionResponseBody } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";

export type ModelGatewayStreamHandlers = {
  onToken: (delta: string) => void;
};

/** Consumes model-gateway `text/event-stream` (token / done / error). */
export async function readModelGatewaySse(
  response: Response,
  handlers: ModelGatewayStreamHandlers,
): Promise<CompletionResponseBody> {
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    if (response.status === 504) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_TIMEOUT,
        message: errBody?.error?.message ?? "Model gateway timed out",
      });
    }
    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: errBody?.error?.message ?? `Model gateway error with status ${response.status}`,
    });
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: "Model gateway returned an empty stream body",
    });
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: CompletionResponseBody | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      let eventName = "message";
      let dataLine = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLine += line.slice(5).trim();
        }
      }
      if (!dataLine) continue;

      if (eventName === "token") {
        const parsed = JSON.parse(dataLine) as { delta?: string };
        if (typeof parsed.delta === "string" && parsed.delta.length > 0) {
          handlers.onToken(parsed.delta);
        }
      } else if (eventName === "done") {
        donePayload = JSON.parse(dataLine) as CompletionResponseBody;
      } else if (eventName === "error") {
        const parsed = JSON.parse(dataLine) as { message?: string };
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: parsed.message ?? "Model stream failed",
        });
      }
    }
  }

  if (!donePayload) {
    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: "Model stream ended without a completion",
    });
  }
  return donePayload;
}
