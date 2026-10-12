import type { PoolClient } from "pg";
import type { WorkflowAction } from "../domain/types.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";
import { assertSafeWebhookUrl } from "./ssrf.js";
import { renderTemplate } from "./template.js";

export type ActionExecutionContext = {
  repo: WorkflowsRepository;
  client: PoolClient;
  workspaceId: string;
  runId: string;
  eventId: string;
  eventData: Record<string, unknown>;
  allowHttpWebhooks: boolean;
  webhookTimeoutMs: number;
};

export type ActionResult = {
  summary: string;
  output: Record<string, unknown>;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

async function recordEffect(
  ctx: ActionExecutionContext,
  stepId: string,
  effectKind: string,
  payload: Record<string, unknown>,
): Promise<{ inserted: boolean }> {
  return ctx.repo.insertSideEffect(ctx.client, {
    workspaceId: ctx.workspaceId,
    runId: ctx.runId,
    eventId: ctx.eventId,
    stepId,
    effectKind,
    payload,
  });
}

async function executeWebhook(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const method = asString(config.method, "POST").toUpperCase();
  const url = asString(config.url);
  const bodyTemplate = asString(config.body, "");
  const authType = asString(config.authType, "none");
  const secretName = asString(config.secretName);

  const safeUrl = await assertSafeWebhookUrl(url, { allowHttp: ctx.allowHttpWebhooks });
  const renderedBody = bodyTemplate ? renderTemplate(bodyTemplate, ctx.eventData) : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-QuickStart-Event-Id": ctx.eventId,
    "X-QuickStart-Run-Id": ctx.runId,
  };
  if (authType === "secret" && secretName) {
    // Secrets vault resolution is Feature 16; v1 records the secret *name* only.
    headers["X-QuickStart-Secret-Ref"] = secretName;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.webhookTimeoutMs);
  try {
    const response = await fetch(safeUrl.toString(), {
      method,
      headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : renderedBody || undefined,
      signal: controller.signal,
      redirect: "error",
    });
    const text = await response.text();
    const truncated = text.length > 4_096 ? `${text.slice(0, 4_096)}…` : text;
    if (!response.ok) {
      throw new Error(`Webhook returned HTTP ${response.status}: ${truncated}`);
    }
    const effect = await recordEffect(ctx, action.id, "webhook", {
      method,
      url: safeUrl.origin + safeUrl.pathname,
      status: response.status,
      secret_ref: authType === "secret" ? secretName || null : null,
    });
    return {
      summary: `Webhook ${method} ${safeUrl.host} → ${response.status}`,
      output: {
        status: response.status,
        body_preview: truncated,
        duplicated: !effect.inserted,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function executeUpdateTags(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const targetResource = asString(config.targetResource, "conversation");
  const operation = asString(config.operation, "add");
  const tags = asStringArray(config.tags);
  const conversationId =
    typeof ctx.eventData.conversation_id === "string" ? ctx.eventData.conversation_id : null;

  const effect = await recordEffect(ctx, action.id, "update_tags", {
    target_resource: targetResource,
    operation,
    tags,
    conversation_id: conversationId,
  });

  return {
    summary: `${operation} tags on ${targetResource}: ${tags.join(", ") || "(none)"}`,
    output: { tags, operation, targetResource, duplicated: !effect.inserted },
  };
}

async function executeEmail(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const recipients = asStringArray(config.recipients);
  const subject = renderTemplate(asString(config.subject), ctx.eventData);
  const body = renderTemplate(asString(config.body), ctx.eventData);

  const effect = await recordEffect(ctx, action.id, "email_notification", {
    recipients,
    subject,
    body,
    provider: "dev_record",
  });

  return {
    summary: `Queued email to ${recipients.join(", ") || "(none)"}`,
    output: { recipients, subject, duplicated: !effect.inserted },
  };
}

async function executeHandoff(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const destinationType = asString(config.destinationType, "human");
  const destination = asString(config.destination);
  const note = asString(config.note);
  const conversationId =
    typeof ctx.eventData.conversation_id === "string" ? ctx.eventData.conversation_id : null;

  const effect = await recordEffect(ctx, action.id, "agent_handoff", {
    destination_type: destinationType,
    destination,
    note,
    conversation_id: conversationId,
  });

  return {
    summary: `Recorded handoff to ${destinationType}:${destination || "unset"}`,
    output: { destinationType, destination, duplicated: !effect.inserted },
  };
}

export async function executeAction(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  switch (action.kind) {
    case "webhook":
      return executeWebhook(action, ctx);
    case "update_tags":
      return executeUpdateTags(action, ctx);
    case "email_notification":
      return executeEmail(action, ctx);
    case "agent_handoff":
      return executeHandoff(action, ctx);
    default:
      throw new Error(`Unsupported action kind: ${String((action as WorkflowAction).kind)}`);
  }
}
