import { context, SpanStatusCode, trace, type Span } from "@opentelemetry/api";
import { applyRequestAttributes, type RequestSpanAttributes } from "./attributes.js";

export async function runWithSpan<T>(
  spanName: string,
  attributes: RequestSpanAttributes,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer("quickstart");
  return tracer.startActiveSpan(spanName, async (span) => {
    applyRequestAttributes(span, attributes);
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "error",
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function getTraceIds(): { traceId?: string; spanId?: string } {
  const span = trace.getSpan(context.active());
  if (!span) {
    return {};
  }
  const ctx = span.spanContext();
  return { traceId: ctx.traceId, spanId: ctx.spanId };
}
