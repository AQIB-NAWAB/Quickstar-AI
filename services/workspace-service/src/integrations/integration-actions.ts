import { AppError } from "@quickstart/errors";

export type IntegrationActionContext = {
  provider: string;
  action: string;
  input: Record<string, unknown>;
  accessToken?: string;
  credentials: Record<string, unknown>;
  connection: {
    accountIdentifier: string | null;
    accountName: string | null;
    metadata: Record<string, unknown>;
  };
};

export type IntegrationActionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; status?: number; notConnected?: boolean };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function fail(error: string, status?: number): IntegrationActionResult {
  return { ok: false, error, status };
}

function ok(data: Record<string, unknown>): IntegrationActionResult {
  return { ok: true, data };
}

function required(value: unknown, name: string): string | IntegrationActionResult {
  const parsed = str(value);
  if (!parsed) return fail(`${name} is required`);
  return parsed;
}

function isFailure(value: string | IntegrationActionResult): value is IntegrationActionResult {
  return typeof value !== "string";
}

async function requestJson(
  url: string,
  init: { method: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; ok: boolean; body: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      body = { raw: text.slice(0, 300) };
    }
    return { status: res.status, ok: res.ok, body };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      body: { error: err instanceof Error ? err.message : "network error" },
    };
  } finally {
    clearTimeout(timer);
  }
}

function errorText(body: Record<string, unknown>): string {
  const error = body.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const nested = error as { message?: string; error?: string };
    return nested.message ?? nested.error ?? "provider error";
  }
  if (typeof body.message === "string") return body.message;
  if (Array.isArray(body.errors)) {
    const first = body.errors[0] as { message?: string; detail?: string } | undefined;
    return first?.message ?? first?.detail ?? "provider error";
  }
  return "provider error";
}

function requireAccessToken(ctx: IntegrationActionContext): string | IntegrationActionResult {
  const token = str(ctx.accessToken);
  if (!token) {
    return {
      ok: false,
      error: `${ctx.provider} is not connected for this workspace`,
      notConnected: true,
    };
  }
  return token;
}

function zendeskSubdomain(ctx: IntegrationActionContext): string | null {
  const explicit = str(ctx.input.subdomain) ?? str(ctx.connection.metadata.subdomain);
  if (explicit) return explicit.replace(/\.zendesk\.com$/i, "");
  for (const candidate of [ctx.connection.accountName, ctx.connection.accountIdentifier]) {
    const match = candidate?.match(/^([a-z0-9-]+)\.zendesk\.com/i);
    if (match) return match[1];
  }
  return null;
}

function salesforceInstance(ctx: IntegrationActionContext): string | null {
  const explicit =
    str(ctx.input.instance_url) ?? str(ctx.connection.metadata.instance_url);
  if (explicit) return explicit.replace(/\/$/, "");
  const candidate = ctx.connection.accountIdentifier ?? ctx.connection.accountName;
  if (candidate && /^https?:\/\//i.test(candidate)) return candidate.replace(/\/$/, "");
  return null;
}

function mailchimpDc(ctx: IntegrationActionContext): string {
  return str(ctx.input.dc) ?? str(ctx.connection.metadata.dc) ?? "us1";
}

function twilioFrom(ctx: IntegrationActionContext): string | null {
  const explicit = str(ctx.input.from);
  if (explicit) return explicit;
  const phones = ctx.connection.metadata.phone_numbers;
  if (Array.isArray(phones) && phones.length > 0) {
    const first = phones[0] as { phone_number?: string } | undefined;
    return first?.phone_number ?? null;
  }
  return null;
}

async function slackAction(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
  if (ctx.action !== "post_message") return fail(`Unsupported Slack action '${ctx.action}'`);
  const token = requireAccessToken(ctx);
  if (isFailure(token)) return token;
  const channel = required(ctx.input.channel, "channel");
  if (isFailure(channel)) return channel;
  const text = required(ctx.input.text, "text");
  if (isFailure(text)) return text;

  const res = await requestJson("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });
  if (!res.ok || res.body.ok !== true) {
    return fail(`Slack error: ${str(res.body.error) ?? res.status}`, res.status);
  }
  return ok({ channel: res.body.channel ?? channel, ts: res.body.ts ?? null });
}

async function zendeskAction(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
  const token = requireAccessToken(ctx);
  if (isFailure(token)) return token;
  const subdomain = zendeskSubdomain(ctx);
  if (!subdomain) {
    return fail("Zendesk subdomain is missing. Reconnect the integration or pass subdomain.");
  }
  const root = `https://${subdomain}.zendesk.com/api/v2`;
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  if (ctx.action === "create_ticket") {
    const subject = required(ctx.input.subject, "subject");
    if (isFailure(subject)) return subject;
    const description = required(ctx.input.description, "description");
    if (isFailure(description)) return description;
    const requesterName = str(ctx.input.requester_name);
    const requesterEmail = str(ctx.input.requester_email);
    const ticket: Record<string, unknown> = {
      subject,
      description,
      ...(requesterName || requesterEmail
        ? {
            requester: {
              ...(requesterName ? { name: requesterName } : {}),
              ...(requesterEmail ? { email: requesterEmail } : {}),
            },
          }
        : {}),
      ...(str(ctx.input.priority) ? { priority: str(ctx.input.priority) } : {}),
      ...(str(ctx.input.type) ? { type: str(ctx.input.type) } : {}),
      ...(Array.isArray(ctx.input.tags) ? { tags: ctx.input.tags } : {}),
    };
    const res = await requestJson(`${root}/tickets.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ticket }),
    });
    if (!res.ok) return fail(`Zendesk error: ${errorText(res.body)}`, res.status);
    const created = record(res.body.ticket);
    return ok({
      ticket_id: created.id ?? null,
      status: created.status ?? "new",
      subject: created.subject ?? subject,
    });
  }

  const ticketId = required(ctx.input.ticket_id, "ticket_id");
  if (isFailure(ticketId)) return ticketId;

  if (ctx.action === "get_ticket") {
    const res = await requestJson(`${root}/tickets/${encodeURIComponent(ticketId)}.json`, {
      method: "GET",
      headers,
    });
    if (!res.ok) return fail(`Zendesk error: ${errorText(res.body)}`, res.status);
    const ticket = record(res.body.ticket);
    return ok({
      ticket_id: ticket.id ?? ticketId,
      subject: ticket.subject ?? null,
      status: ticket.status ?? null,
      description: ticket.description ?? null,
      updated_at: ticket.updated_at ?? null,
    });
  }

  if (ctx.action === "add_comment") {
    const body = required(ctx.input.body, "body");
    if (isFailure(body)) return body;
    const res = await requestJson(`${root}/tickets/${encodeURIComponent(ticketId)}.json`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        ticket: {
          comment: { body, public: ctx.input.public !== false },
        },
      }),
    });
    if (!res.ok) return fail(`Zendesk error: ${errorText(res.body)}`, res.status);
    const ticket = record(res.body.ticket);
    return ok({ ticket_id: ticket.id ?? ticketId, status: ticket.status ?? null });
  }

  return fail(`Unsupported Zendesk action '${ctx.action}'`);
}

async function hubspotAction(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
  if (ctx.action !== "create_or_update_contact") {
    return fail(`Unsupported HubSpot action '${ctx.action}'`);
  }
  const token = requireAccessToken(ctx);
  if (isFailure(token)) return token;
  const properties = {
    ...record(ctx.input.properties),
    ...(str(ctx.input.email) ? { email: str(ctx.input.email) } : {}),
    ...(str(ctx.input.firstname) ? { firstname: str(ctx.input.firstname) } : {}),
    ...(str(ctx.input.lastname) ? { lastname: str(ctx.input.lastname) } : {}),
    ...(str(ctx.input.phone) ? { phone: str(ctx.input.phone) } : {}),
  };
  const email = str(properties.email);
  if (!email) return fail("email is required to create or update a HubSpot contact");
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  const search = await requestJson("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers,
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: "email", operator: "EQ", value: email }] },
      ],
      properties: Object.keys(properties),
      limit: 1,
    }),
  });
  if (!search.ok) return fail(`HubSpot error: ${errorText(search.body)}`, search.status);
  const existing = Array.isArray(search.body.results)
    ? (search.body.results[0] as { id?: string } | undefined)
    : undefined;

  if (existing?.id) {
    const patch = await requestJson(
      `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(existing.id)}`,
      { method: "PATCH", headers, body: JSON.stringify({ properties }) },
    );
    if (!patch.ok) return fail(`HubSpot error: ${errorText(patch.body)}`, patch.status);
    return ok({ contact_id: existing.id, created: false });
  }

  const created = await requestJson("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers,
    body: JSON.stringify({ properties }),
  });
  if (!created.ok) return fail(`HubSpot error: ${errorText(created.body)}`, created.status);
  return ok({ contact_id: created.body.id ?? null, created: true });
}

async function salesforceAction(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
  if (ctx.action !== "create_lead") return fail(`Unsupported Salesforce action '${ctx.action}'`);
  const token = requireAccessToken(ctx);
  if (isFailure(token)) return token;
  const instance = salesforceInstance(ctx);
  if (!instance) {
    return fail("Salesforce instance URL is missing. Reconnect the integration.");
  }
  const fields = {
    ...record(ctx.input.fields),
    ...(str(ctx.input.last_name) ? { LastName: str(ctx.input.last_name) } : {}),
    ...(str(ctx.input.company) ? { Company: str(ctx.input.company) } : {}),
    ...(str(ctx.input.email) ? { Email: str(ctx.input.email) } : {}),
    ...(str(ctx.input.phone) ? { Phone: str(ctx.input.phone) } : {}),
    ...(str(ctx.input.description) ? { Description: str(ctx.input.description) } : {}),
  };
  if (!str(fields.LastName)) {
    return fail("last_name is required to create a Salesforce lead");
  }
  if (!str(fields.Company)) return fail("company is required to create a Salesforce lead");

  const res = await requestJson(`${instance}/services/data/v59.0/sobjects/Lead`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) return fail(`Salesforce error: ${errorText(res.body)}`, res.status);
  return ok({ lead_id: res.body.id ?? null, success: res.body.success === true });
}

async function googleSheetsAction(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
  if (ctx.action !== "append_row") {
    return fail(`Unsupported Google Sheets action '${ctx.action}'`);
  }
  const token = requireAccessToken(ctx);
  if (isFailure(token)) return token;
  const spreadsheetId = required(ctx.input.spreadsheet_id, "spreadsheet_id");
  if (isFailure(spreadsheetId)) return spreadsheetId;
  const range = str(ctx.input.range) ?? "Sheet1";
  if (!Array.isArray(ctx.input.values) || ctx.input.values.length === 0) {
    return fail("values must be a non-empty array for the row");
  }
  const row = ctx.input.values.map((value) => String(value ?? ""));
  const res = await requestJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    },
  );
  if (!res.ok) return fail(`Google Sheets error: ${errorText(res.body)}`, res.status);
  const updates = record(res.body.updates);
  return ok({
    updated_range: updates.updatedRange ?? null,
    updated_rows: updates.updatedRows ?? 1,
  });
}

async function mailchimpAction(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
  if (ctx.action !== "add_subscriber") {
    return fail(`Unsupported Mailchimp action '${ctx.action}'`);
  }
  const token = requireAccessToken(ctx);
  if (isFailure(token)) return token;
  const listId = required(ctx.input.list_id, "list_id");
  if (isFailure(listId)) return listId;
  const email = str(ctx.input.email_address) ?? str(ctx.input.email);
  if (!email) return fail("email_address is required");
  const dc = mailchimpDc(ctx);
  const res = await requestJson(
    `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: str(ctx.input.status) ?? "subscribed",
        merge_fields: record(ctx.input.merge_fields),
      }),
    },
  );
  if (!res.ok) return fail(`Mailchimp error: ${errorText(res.body)}`, res.status);
  return ok({ member_id: res.body.id ?? null, status: res.body.status ?? "subscribed" });
}

async function twilioAction(ctx: IntegrationActionContext): Promise<IntegrationActionResult> {
  if (ctx.action !== "send_sms") return fail(`Unsupported Twilio action '${ctx.action}'`);
  const accountSid = str(ctx.credentials.accountSid);
  const authToken = str(ctx.credentials.authToken);
  if (!accountSid || !authToken) {
    return { ok: false, error: "Twilio is not connected for this workspace", notConnected: true };
  }
  const to = required(ctx.input.to, "to");
  if (isFailure(to)) return to;
  const body = required(ctx.input.body, "body");
  if (isFailure(body)) return body;
  const from = twilioFrom(ctx);
  if (!from) return fail("A Twilio from number is required; add one to the integration.");

  const res = await requestJson(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    },
  );
  if (!res.ok) return fail(`Twilio error: ${errorText(res.body)}`, res.status);
  return ok({ message_sid: res.body.sid ?? null, status: res.body.status ?? "queued" });
}

/** Dispatches an agent integration action without exposing provider credentials. */
export async function executeIntegrationAction(
  ctx: IntegrationActionContext,
): Promise<IntegrationActionResult> {
  try {
    switch (ctx.provider) {
      case "slack":
        return await slackAction(ctx);
      case "zendesk":
        return await zendeskAction(ctx);
      case "hubspot":
        return await hubspotAction(ctx);
      case "salesforce":
        return await salesforceAction(ctx);
      case "google_sheets":
        return await googleSheetsAction(ctx);
      case "mailchimp":
        return await mailchimpAction(ctx);
      case "twilio":
        return await twilioAction(ctx);
      default:
        return fail(`Unsupported integration provider '${ctx.provider}'`);
    }
  } catch (err) {
    if (err instanceof AppError) {
      return fail(err.message);
    }
    return fail(err instanceof Error ? err.message : "integration action failed");
  }
}

export const INTEGRATION_ACTION_PROVIDERS = new Set([
  "slack",
  "zendesk",
  "hubspot",
  "salesforce",
  "google_sheets",
  "mailchimp",
  "twilio",
]);
