/**
 * Feature 17 — Website widget browser proof (HTTP client simulating the embed).
 *
 * Proves Done when from docs/roadmap.md §20 / docs/ai-roadmap.md Feature 17:
 *   1. Create conversation with publishable key + allowed Origin
 *   2. Post a turn (idempotent)
 *   3. "Refresh" = GET messages with the same conversation_id → history present
 *   4. Wrong Origin is rejected
 *   5. Retry with the same Idempotency-Key does not duplicate the user message
 *
 * Prerequisites (local data plane + services):
 *   make up
 *   make identity-migrate workspace-migrate agent-migrate conversation-migrate
 *   Start identity :3001, workspace :3002, agent :3003, conversation :3004,
 *   model-gateway :3005, runtime :3006, gateway :3000 (env from .env).
 *
 * Headed demo (optional): serve fixtures/widget-demo.html from http://127.0.0.1:8080
 * with the printed publishable key + agent id, widget JS from apps/web :3015.
 *
 * Usage:
 *   node --env-file=.env scripts/check-widget-browser-proof.mjs
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import process from "node:process";
import console from "node:console";

const { fetch, AbortSignal } = globalThis;

const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const ALLOWED_ORIGIN = process.env.WIDGET_PROOF_ORIGIN ?? "http://127.0.0.1:8080";
const WRONG_ORIGIN = "http://evil.example:9999";

async function request(url, { method = "GET", token, body, headers = {}, status } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60_000),
    redirect: "error",
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (status !== undefined) {
    assert.equal(
      response.status,
      status,
      `${method} ${url}: expected ${status}, got ${response.status}: ${text.slice(0, 400)}`,
    );
  }
  return { status: response.status, data };
}

async function widgetRequest(path, { method = "GET", key, origin, body, idempotencyKey, status } = {}) {
  return request(`${gateway}/v1/public/widget${path}`, {
    method,
    body,
    status,
    headers: {
      "X-Publishable-Key": key,
      Origin: origin,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
  });
}

async function main() {
  await request(`${gateway}/healthz`, { status: 200 });
  console.log("PASS: gateway healthz");

  const email = `widget-proof-${randomUUID()}@example.com`;
  const password = randomBytes(24).toString("hex");
  const registered = await request(`${gateway}/v1/register`, {
    method: "POST",
    status: 201,
    body: {
      email,
      password,
      organization_name: `Widget proof ${randomUUID().slice(0, 8)}`,
    },
  });
  const token = registered.data.tokens.access_token;
  const orgId = registered.data.org_id;
  assert.ok(token && orgId, "register must return access_token and org_id");

  const ws = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Widget proof", slug: `widget-${randomUUID().slice(0, 8)}` },
  });
  const workspaceId = ws.data.workspace.id;

  const agentRes = await request(`${gateway}/v1/workspaces/${workspaceId}/agents`, {
    method: "POST",
    token,
    status: 201,
    body: {
      name: "Widget demo agent",
      instructions: "You are a short helpful assistant for widget proof.",
      model_settings: { profile: "fake", model_id: "fake" },
    },
  });
  const agent = agentRes.data.agent;
  assert.ok(agent?.id, "agent create must return id");

  const publishRes = await request(
    `${gateway}/v1/workspaces/${workspaceId}/agents/${agent.id}/publish`,
    {
      method: "POST",
      token,
      status: 201,
      body: { base_version: agent.version },
    },
  );
  assert.ok(publishRes.data.version?.id, "publish must return version");
  console.log("PASS: agent created and published");

  const keyRes = await request(`${gateway}/v1/workspaces/${workspaceId}/publishable-keys`, {
    method: "POST",
    token,
    status: 201,
    body: {
      name: "Widget demo site",
      allowed_origins: [ALLOWED_ORIGIN],
      default_agent_id: agent.id,
    },
  });
  const rawKey = keyRes.data.publishable_key?.publishable_key;
  assert.ok(rawKey?.startsWith("pk_live_"), "publishable key must be returned once");
  console.log("PASS: publishable key issued for", ALLOWED_ORIGIN);

  const visitorId = randomUUID();
  const subjectKey = `anon:${visitorId}`;

  const created = await widgetRequest("/conversations", {
    method: "POST",
    key: rawKey,
    origin: ALLOWED_ORIGIN,
    status: 201,
    body: { subject_key: subjectKey, agent_id: agent.id },
  });
  const conversationId = created.data.conversation_id;
  assert.ok(conversationId, "create conversation must return conversation_id");
  assert.equal(created.data.workspace_id, workspaceId);
  console.log("PASS: widget conversation created");

  const wrongOrigin = await widgetRequest("/conversations", {
    method: "POST",
    key: rawKey,
    origin: WRONG_ORIGIN,
    body: { subject_key: subjectKey, agent_id: agent.id },
  });
  assert.ok(
    wrongOrigin.status === 403 || wrongOrigin.status === 401 || wrongOrigin.status === 400,
    `wrong origin must be rejected, got ${wrongOrigin.status}`,
  );
  console.log("PASS: wrong origin rejected (", wrongOrigin.status, ")");

  const idempotencyKey = randomUUID();
  const userText = `Widget proof hello ${randomUUID().slice(0, 8)}`;
  const turn1 = await widgetRequest(`/conversations/${conversationId}/turns`, {
    method: "POST",
    key: rawKey,
    origin: ALLOWED_ORIGIN,
    idempotencyKey,
    body: { message: userText, subject_key: subjectKey },
  });
  assert.ok(
    turn1.status === 200 || turn1.status === 201,
    `turn expected 200/201, got ${turn1.status}: ${JSON.stringify(turn1.data).slice(0, 300)}`,
  );
  assert.ok(turn1.data.turn, "turn response must include turn");
  console.log("PASS: widget turn completed");

  const turn2 = await widgetRequest(`/conversations/${conversationId}/turns`, {
    method: "POST",
    key: rawKey,
    origin: ALLOWED_ORIGIN,
    idempotencyKey,
    body: { message: userText, subject_key: subjectKey },
  });
  assert.ok(turn2.status === 200 || turn2.status === 201, `idempotent retry status ${turn2.status}`);
  const turn1UserId = turn1.data.turn?.user_message?.id;
  const turn2UserId = turn2.data.turn?.user_message?.id;
  if (turn1UserId && turn2UserId) {
    assert.equal(turn1UserId, turn2UserId, "idempotent retry must return the same user message id");
  }
  console.log("PASS: idempotent turn retry did not create a new user message id");

  // Simulate browser refresh: same conversation_id, reload history (no create).
  const history = await widgetRequest(`/conversations/${conversationId}/messages`, {
    method: "GET",
    key: rawKey,
    origin: ALLOWED_ORIGIN,
    status: 200,
  });
  const messages = history.data.messages ?? [];
  assert.ok(messages.length >= 2, `expected at least user+assistant messages, got ${messages.length}`);
  const userMessages = messages.filter(
    (m) => m.sender_type === "user" && (m.text === userText || m.content === userText),
  );
  assert.equal(
    userMessages.length,
    1,
    `expected exactly one user message with proof text after idempotent retry, got ${userMessages.length}`,
  );
  console.log("PASS: refresh persistence — GET messages returns the same conversation history");

  console.log("");
  console.log("Feature 17 widget browser proof: ALL CHECKS PASSED");
  console.log("Optional headed demo:");
  console.log(`  Publishable key: ${rawKey}`);
  console.log(`  Agent id:        ${agent.id}`);
  console.log(`  Conversation id: ${conversationId}`);
  console.log(`  Serve fixtures/widget-demo.html from ${ALLOWED_ORIGIN}`);
  console.log("  Set data-publishable-key / data-agent-id on the script tag.");
}

main().catch((err) => {
  console.error("FAIL:", err.message ?? err);
  process.exitCode = 1;
});
