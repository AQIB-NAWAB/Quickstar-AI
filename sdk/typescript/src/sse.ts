import type { StreamEvent } from "./types.js";

/**
 * Async generator that consumes a Server-Sent Events HTTP response body stream
 * and yields structured StreamEvent records.
 */
export async function* parseEventStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent, void, undefined> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      let currentEvent: StreamEvent = { event: "message", data: "" };
      let hasData = false;

      for (const line of lines) {
        if (line.trim() === "") {
          if (hasData) {
            yield currentEvent;
            currentEvent = { event: "message", data: "" };
            hasData = false;
          }
          continue;
        }

        if (line.startsWith(":")) {
          // SSE comment/keepalive ping
          continue;
        }

        const colonIndex = line.indexOf(":");
        let field = line;
        let valueStr = "";
        if (colonIndex !== -1) {
          field = line.slice(0, colonIndex);
          valueStr = line.slice(colonIndex + 1);
          if (valueStr.startsWith(" ")) {
            valueStr = valueStr.slice(1);
          }
        }

        if (field === "event") {
          currentEvent.event = valueStr;
        } else if (field === "data") {
          currentEvent.data = currentEvent.data ? `${currentEvent.data}\n${valueStr}` : valueStr;
          hasData = true;
        } else if (field === "id") {
          currentEvent.id = valueStr;
        } else if (field === "retry") {
          const retryMs = parseInt(valueStr, 10);
          if (!Number.isNaN(retryMs)) {
            currentEvent.retry = retryMs;
          }
        }
      }

      if (hasData) {
        yield currentEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
