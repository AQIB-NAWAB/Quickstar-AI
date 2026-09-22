import type { Span } from "@opentelemetry/api";

export type RequestSpanAttributes = {
  requestId: string;
  tenantId?: string;
  agentId?: string;
  conversationId?: string;
};

export function applyRequestAttributes(span: Span, attrs: RequestSpanAttributes): void {
  span.setAttribute("quickstart.request_id", attrs.requestId);
  if (attrs.tenantId) {
    span.setAttribute("quickstart.tenant_id", attrs.tenantId);
  }
  if (attrs.agentId) {
    span.setAttribute("quickstart.agent_id", attrs.agentId);
  }
  if (attrs.conversationId) {
    span.setAttribute("quickstart.conversation_id", attrs.conversationId);
  }
}
