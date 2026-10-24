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
  workspaceUrl?: string;
  conversationUrl?: string;
  secretsUrl?: string;
  leadUrl?: string;
  internalToken?: string;
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

async function resolveManagedCredential(
  ctx: ActionExecutionContext,
  credentialId: string,
): Promise<{ type: string; value: string } | null> {
  if (!ctx.secretsUrl || !ctx.internalToken) return null;
  try {
    const res = await fetch(
      `${ctx.secretsUrl}/v1/workspaces/${ctx.workspaceId}/secrets/${encodeURIComponent(credentialId)}`,
      {
        headers: {
          "x-quickstart-internal-token": ctx.internalToken,
        },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { name?: string; value?: string; secret_type?: string } };
    if (!json.data?.value) return null;
    return {
      type: json.data.secret_type || "api_key",
      value: json.data.value,
    };
  } catch {
    return null;
  }
}

async function executeWebhook(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const method = asString(config.method, "POST").toUpperCase();
  const url = asString(config.url);
  const bodyTemplate = asString(config.body ?? config.body_template, "");
  const authType = asString(config.authType ?? config.auth_type, "none").toLowerCase();
  const customHeaders = Array.isArray(config.headers)
    ? Object.fromEntries(config.headers.map((h: { key: string; value: string }) => [h.key, h.value]))
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

  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  if (!url) {
    throw new Error("Webhook URL is required");
  }

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
  if (renderedBody) {
    try {
      JSON.parse(renderedBody);
    } catch {
      // Body is plain text or custom payload
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-QuickStart-Event-Id": ctx.eventId,
    "X-QuickStart-Run-Id": ctx.runId,
  };

  // Resolve authorization credentials if configured
  if (config.connection_credential_id) {
    const cred = await resolveManagedCredential(ctx, String(config.connection_credential_id));
    if (cred?.value) {
      headers["Authorization"] = cred.value.startsWith("Bearer ")
        ? cred.value
        : `Bearer ${cred.value}`;
    }
  } else if (authType === "bearer" && config.token) {
    const renderedToken = renderTemplate(String(config.token), ctx.eventData);
    headers["Authorization"] = `Bearer ${renderedToken}`;
  } else if (authType === "basic" && config.username) {
    const user = renderTemplate(String(config.username), ctx.eventData);
    const pass = renderTemplate(String(config.password || ""), ctx.eventData);
    const b64 = Buffer.from(`${user}:${pass}`).toString("base64");
    headers["Authorization"] = `Basic ${b64}`;
  }

  for (const [k, v] of Object.entries(customHeaders)) {
    if (k && v !== undefined) {
      if (
        /^(authorization|cookie|proxy-authorization|host|content-length|transfer-encoding|connection)$/i.test(
          k,
        )
      ) {
        if (headers[k]) continue; // don't override managed auth
      }
      headers[k] = renderTemplate(String(v), ctx.eventData);
    }
  }

  const claim = await recordEffect(ctx, action.id, "webhook", {
    state: "dispatching",
    method,
    url: safeUrl.origin + safeUrl.pathname,
  });
  if (!claim.inserted) {
    throw new Error(
      "This action was already dispatched or has an uncertain outcome; automatic resend is blocked.",
    );
  }

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
  const config = action.config;
  const mode = asString(config.mode, "add").toLowerCase() as "add" | "remove" | "replace";

  // Raw tags can be array of strings or comma-separated string
  let rawTags: string[] = [];
  if (Array.isArray(config.tags)) {
    rawTags = config.tags.map(String);
  } else if (typeof config.tags === "string") {
    rawTags = config.tags.split(",").map((s) => s.trim());
  }

  const resolvedTags = rawTags
    .map((t) => renderTemplate(t, ctx.eventData).trim())
    .filter(Boolean);

  if (resolvedTags.length === 0 && mode !== "replace") {
    throw new Error("No tags provided for tag update. No action was performed.");
  }

  // Determine target: lead or conversation
  let target = asString(config.target, "").toLowerCase();
  if (!target) {
    if (ctx.eventData.lead_id || ctx.eventData.leadId || config.lead_id || config.leadId) {
      target = "lead";
    } else if (
      ctx.eventData.conversation_id ||
      ctx.eventData.conversationId ||
      config.conversation_id ||
      config.conversationId
    ) {
      target = "conversation";
    } else {
      throw new Error(
        "Target conversation or lead ID could not be resolved from event or config. No action was performed.",
      );
    }
  }

  let targetId = "";
  if (target === "lead") {
    targetId = asString(
      ctx.eventData.lead_id ?? ctx.eventData.leadId ?? config.lead_id ?? config.leadId,
    );
    if (!targetId) {
      throw new Error("Target lead ID could not be resolved from event or config. No action was performed.");
    }

    const leadUrl = ctx.leadUrl || "http://127.0.0.1:3008";
    const res = await fetch(`${leadUrl}/v1/workspaces/${ctx.workspaceId}/leads/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-quickstart-internal-token": ctx.internalToken || "",
      },
      body: JSON.stringify({ tags: resolvedTags }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to update lead tags: HTTP ${res.status} ${errText}. No action was performed.`);
    }

    await recordEffect(ctx, action.id, "update_tags", {
      target: "lead",
      targetId,
      tags: resolvedTags,
      mode,
    });

    return {
      summary: `Updated tags (${mode}) on lead ${targetId}: [${resolvedTags.join(", ")}]`,
      output: { target: "lead", targetId, tags: resolvedTags, mode },
    };
  } else {
    targetId = asString(
      ctx.eventData.conversation_id ??
        ctx.eventData.conversationId ??
        config.conversation_id ??
        config.conversationId,
    );
    if (!targetId) {
      throw new Error("Target conversation ID could not be resolved from event or config. No action was performed.");
    }

    const convUrl = ctx.conversationUrl || "http://127.0.0.1:3003";
    const res = await fetch(
      `${convUrl}/internal/v1/workspaces/${ctx.workspaceId}/conversations/${targetId}/tags`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-quickstart-internal-token": ctx.internalToken || "",
        },
        body: JSON.stringify({ tags: resolvedTags, mode }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to update conversation tags: HTTP ${res.status} ${errText}. No action was performed.`);
    }

    await recordEffect(ctx, action.id, "update_tags", {
      target: "conversation",
      targetId,
      tags: resolvedTags,
      mode,
    });

    return {
      summary: `Updated tags (${mode}) on conversation ${targetId}: [${resolvedTags.join(", ")}]`,
      output: { target: "conversation", targetId, tags: resolvedTags, mode },
    };
  }
}

async function executeNotification(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const delivery = asString(config.delivery ?? config.channel, "in_app").toLowerCase();
  const rawTitle = asString(config.title, "Workflow Notification");
  const rawMsg = asString(config.message ?? config.body, "A workflow action triggered a notification");
  const severity = asString(config.severity, "info").toLowerCase();

  const title = renderTemplate(rawTitle, ctx.eventData);
  const message = renderTemplate(rawMsg, ctx.eventData);

  if (delivery === "slack") {
    const slackChannel = asString(config.slack_channel ?? config.slackChannel, "#general");
    const webhookUrl = asString(config.slack_webhook_url ?? config.slackWebhookUrl);

    if (!webhookUrl) {
      throw new Error("Slack webhook URL is required for Slack notification delivery. No action was performed.");
    }

    const safeUrl = await assertSafeWebhookUrl(webhookUrl, { allowHttp: false });
    await sendSafeWebhook(safeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: slackChannel,
        text: `*${title}*\n${message}`,
      }),
      timeoutMs: 10_000,
    });

    await recordEffect(ctx, action.id, "notification", {
      delivery: "slack",
      channel: slackChannel,
      title,
      message,
    });

    return {
      summary: `Slack notification sent to ${slackChannel}`,
      output: { delivery: "slack", channel: slackChannel, title },
    };
  }

  // Default: in_app notification via workspace-service
  const wsUrl = ctx.workspaceUrl;
  if (!wsUrl && !ctx.internalToken) {
    throw new Error(
      "Notification delivery is not connected to workspace service. No action was performed.",
    );
  }
  const resolvedWsUrl = wsUrl || "http://127.0.0.1:3002";
  const dedupKey = `wf_notif:${ctx.runId}:${action.id}`;

  try {
    const res = await fetch(`${resolvedWsUrl}/internal/v1/workspaces/${ctx.workspaceId}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-quickstart-internal-token": ctx.internalToken || "",
      },
      body: JSON.stringify({
        category: "workflow",
        severity,
        type: "workflow.action",
        title,
        description: message,
        sourceType: "workflow",
        sourceId: ctx.runId,
        deduplicationKey: dedupKey,
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to deliver in-app notification: HTTP ${res.status}. No action was performed.`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("No action was performed")) {
      throw err;
    }
    throw new Error(
      `Notification delivery failed to connect to owning service: ${err instanceof Error ? err.message : String(err)}. No action was performed.`,
    );
  }

  await recordEffect(ctx, action.id, "notification", {
    delivery: "in_app",
    severity,
    title,
    message,
  });

  return {
    summary: `[${severity.toUpperCase()}] Notification: ${title}`,
    output: { delivery: "in_app", severity, title, message },
  };
}

async function executeHandoff(
  action: WorkflowAction,
  ctx: ActionExecutionContext,
): Promise<ActionResult> {
  const config = action.config;
  const queueId = asString(config.queue_id ?? config.queueId);
  const priority = asString(config.priority, "normal");
  const rawReason = asString(config.reason ?? config.handoff_reason, "Automated workflow handoff to live agent");
  const rawNote = asString(config.internal_note ?? config.internalNote, "");

  const reason = renderTemplate(rawReason, ctx.eventData);
  const internalNote = rawNote ? renderTemplate(rawNote, ctx.eventData) : undefined;

  const conversationId = asString(
    ctx.eventData.conversation_id ??
      ctx.eventData.conversationId ??
      config.conversation_id ??
      config.conversationId,
  );

  if (!conversationId) {
    throw new Error("Conversation ID not found in event context for agent handoff. No action was performed.");
  }

  const convUrl = ctx.conversationUrl || "http://127.0.0.1:3003";
  const res = await fetch(
    `${convUrl}/internal/v1/workspaces/${ctx.workspaceId}/operator-queues/enqueue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-quickstart-internal-token": ctx.internalToken || "",
      },
      body: JSON.stringify({
        conversationId,
        queueId: queueId || undefined,
        priority,
        reason,
        internalNote,
        workflowRunId: ctx.runId,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to enqueue conversation for handoff: HTTP ${res.status} ${errText}`);
  }

  const json = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown> };

  await recordEffect(ctx, action.id, "agent_handoff", {
    conversationId,
    queueId,
    priority,
    reason,
  });

  return {
    summary: `Conversation ${conversationId} enqueued for human handoff (priority: ${priority})`,
    output: {
      conversationId,
      queueId: queueId || json.data?.queueId || "default",
      priority,
      reason,
    },
  };
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
