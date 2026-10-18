import type { PoolClient } from "pg";
import type { WorkflowAction } from "../domain/types.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";
import { assertSafeWebhookUrl, sendSafeWebhook } from "./ssrf.js";
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
  const bodyTemplate = asString(config.body ?? config.body_template, "");
  const authType = asString(config.authType ?? config.auth_type, "none");
  const customHeaders = Array.isArray(config.headers)
    ? Object.fromEntries(config.headers.map((h) => [h.key, h.value]))
    : (config.headers as Record<string, string>) || {};
  const queryParams = (config.query_params as Record<string, string>) || {};
  const timeoutMs = Math.min(
    60000,
    Math.max(
      100,
      typeof config.timeout_seconds === "number"
        ? config.timeout_seconds * 1000
        : typeof config.timeout_ms === "number"
          ? config.timeout_ms
          : ctx.webhookTimeoutMs,
    ),
  );
  if (config.connection_credential_id || authType !== "none")
    throw new Error("Managed HTTP credential resolution is not configured; request was not sent.");
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method))
    throw new Error("Unsupported HTTP method");

  const targetUrl = new URL(url);
  for (const [k, v] of Object.entries(queryParams)) {
    if (k && v !== undefined) {
      targetUrl.searchParams.set(k, renderTemplate(String(v), ctx.eventData));
    }
  }

  const safeUrl = await assertSafeWebhookUrl(targetUrl.toString(), {
    allowHttp: ctx.allowHttpWebhooks,
  });
  const renderedBody = bodyTemplate ? renderTemplate(bodyTemplate, ctx.eventData, true) : "";
  if (renderedBody) JSON.parse(renderedBody);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-QuickStart-Event-Id": ctx.eventId,
    "X-QuickStart-Run-Id": ctx.runId,
  };

  for (const [k, v] of Object.entries(customHeaders)) {
    if (k && v !== undefined) {
      if (
        /^(authorization|cookie|proxy-authorization|host|content-length|transfer-encoding|connection)$/i.test(
          k,
        )
      )
        throw new Error("Use a managed credential for authentication");
      headers[k] = renderTemplate(String(v), ctx.eventData);
    }
  }

  const claim = await recordEffect(ctx, action.id, "webhook", {
    state: "dispatching",
    method,
    url: safeUrl.origin + safeUrl.pathname,
  });
  if (!claim.inserted)
    throw new Error(
      "This action was already dispatched or has an uncertain outcome; automatic resend is blocked.",
    );
  headers["Idempotency-Key"] = `${ctx.runId}:${action.id}`;
  const startedAt = Date.now();
  const response = await sendSafeWebhook(safeUrl, {
    method,
    headers,
    body: method === "GET" ? undefined : renderedBody || undefined,
    timeoutMs,
  });
  const text = response.text;
  const durationMs = Date.now() - startedAt;
  const truncated = text.length > 4_096 ? `${text.slice(0, 4_096)}…` : text;

  let parsedJson: unknown = null;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    // not JSON
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Webhook returned HTTP ${response.status}: ${truncated}`);
  }

  return {
    summary: `Webhook ${method} ${safeUrl.host} → ${response.status} (${durationMs}ms)`,
    output: {
      status: response.status,
      statusText: response.statusText,
      duration_ms: durationMs,
      body_preview: truncated,
      body_json: parsedJson,
      duplicated: false,
    },
  };
}

async function executeUpdateTags(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  void action;
  void ctx;
  throw new Error("Tag delivery is not connected to its owning service. No action was performed.");
}

async function executeNotification(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  void action;
  void ctx;
  throw new Error(
    "Notification delivery is not connected to its owning service. No action was performed.",
  );
}

async function executeHandoff(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  void action;
  void ctx;
  throw new Error(
    "Operator queue handoff is not connected to its owning service. No action was performed.",
  );
}

async function executeLog(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const level = asString(config.level, "info").toLowerCase();
  const rawMsg = asString(config.message ?? config.log_message, "Step executed");
  const message = renderTemplate(rawMsg, ctx.eventData);

  const effect = await recordEffect(ctx, action.id, "log", {
    level,
    message,
    timestamp: new Date().toISOString(),
  });

  return {
    summary: `[${level.toUpperCase()}] ${message}`,
    output: { level, message, duplicated: !effect.inserted },
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
    case "notification":
      return executeNotification(action, ctx);
    case "agent_handoff":
      return executeHandoff(action, ctx);
    case "log":
      return executeLog(action, ctx);
    case "end":
      return {
        summary: "Workflow ended normally",
        output: { reason: action.config?.reason || "completed" },
      };
    default:
      throw new Error(`Unsupported action kind: ${String((action as WorkflowAction).kind)}`);
  }
}
