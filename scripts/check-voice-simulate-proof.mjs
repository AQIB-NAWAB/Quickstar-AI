/**
 * Feature 21 — Voice path Done when proof.
 *
 * Proves docs/roadmap.md §24 / docs/ai-roadmap.md Feature 21:
 *   1. Register → workspace → publish agent → create conversation
 *   2. POST voice simulate (internal token) with fake utterance
 *   3. Conversation has user + assistant messages (real runtime turn)
 *   4. Simulate response includes call_id and stage timings
 *   5. Call state is completed (not failed-with-fallback)
 *
 * Prerequisites:
 *   make up
 *   migrate identity, workspace, agent, conversation, voice
 *   Start identity :3001, workspace :3002, agent :3003, conversation :3004,
 *   model-gateway :3005, runtime :3006, gateway :3000, voice :3008
 *   VOICE_INTERNAL_TOKEN (or INTERNAL_TOKEN) must match runtime INTERNAL_TOKEN
 *
 * Usage:
 *   node --env-file=.env scripts/check-voice-simulate-proof.mjs
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import process from "node:process";
import console from "node:console";

const { fetch, AbortSignal } = globalThis;

const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const voice = (process.env.VOICE_URL ?? "http://127.0.0.1:3008").replace(/\/$/, "");
const internalToken =
  process.env.VOICE_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN ?? "";

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

async function main() {
  assert.ok(
    internalToken.length >= 32,
    "VOICE_INTERNAL_TOKEN or INTERNAL_TOKEN must be set (>= 32 chars)",
  );

  await request(`${gateway}/healthz`, { status: 200 });
  await request(`${voice}/healthz`, { status: 200 });
  console.log("PASS: gateway and voice healthz");

  const registered = await request(`${gateway}/v1/register`, {
    method: "POST",
    status: 201,
    body: {
      email: `voice-proof-${randomUUID()}@example.com`,
      password: randomBytes(24).toString("hex"),
      organization_name: `Voice proof ${randomUUID().slice(0, 8)}`,
    },
  });
  const token = registered.data.tokens.access_token;
  const orgId = registered.data.org_id;

  const ws = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Voice proof", slug: `voice-${randomUUID().slice(0, 8)}` },
  });
  const workspaceId = ws.data.workspace.id;

  const agentRes = await request(`${gateway}/v1/workspaces/${workspaceId}/agents`, {
    method: "POST",
    token,
    status: 201,
    body: {
      name: "Voice demo agent",
      instructions: "You are a short helpful voice assistant.",
      model_settings: { profile: "fake", model_id: "fake" },
    },
  });
  const agent = agentRes.data.agent;

  await request(`${gateway}/v1/workspaces/${workspaceId}/agents/${agent.id}/publish`, {
    method: "POST",
    token,
    status: 201,
    body: { base_version: agent.version },
  });
  console.log("PASS: agent published");

  const convRes = await request(`${gateway}/v1/workspaces/${workspaceId}/conversations`, {
    method: "POST",
    token,
    status: 201,
    body: { agent_id: agent.id, subject_key: `voice-proof:${randomUUID()}` },
  });
  const conversationId = convRes.data.conversation?.id ?? convRes.data.conversation_id;
  assert.ok(conversationId, "conversation create must return id");
  console.log("PASS: conversation created");

  const utteranceText = `voice proof hello ${randomUUID().slice(0, 8)}`;
  const simulate = await request(
    `${voice}/internal/v1/workspaces/${workspaceId}/voice/simulate`,
    {
      method: "POST",
      status: 201,
      headers: { authorization: `Bearer ${internalToken}` },
      body: {
        conversation_id: conversationId,
        agent_id: agent.id,
        utterance_text: utteranceText,
        direction: "inbound",
        caller: "+15551212",
        voice_mode: "cascade",
      },
    },
  );

  const result = simulate.data.result ?? simulate.data;
  const callId = result.call_id;
  const timings = result.timings;
  assert.ok(callId, "simulate must return call_id");
  assert.equal(result.state, "completed", `expected completed, got ${result.state}`);
  assert.ok(timings, "simulate must return timings");
  assert.ok(typeof timings.stt_ms === "number", "timings.stt_ms required");
  assert.ok(typeof timings.runtime_ms === "number", "timings.runtime_ms required");
  assert.ok(typeof timings.tts_ms === "number", "timings.tts_ms required");
  assert.ok(timings.runtime_ms > 0, "runtime_ms must be > 0 (real runtime hop)");
  assert.ok(
    result.assistant_text && !String(result.assistant_text).includes("having trouble"),
    "assistant_text must come from runtime, not spoken fallback",
  );
  console.log("PASS: simulate completed with call_id and stage timings");

  const messagesRes = await request(
    `${gateway}/v1/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
    { token, status: 200 },
  );
  const messages = messagesRes.data.messages ?? [];
  const userMsgs = messages.filter((m) => m.sender_type === "user");
  const asstMsgs = messages.filter((m) => m.sender_type === "assistant");
  assert.ok(userMsgs.length >= 1, `expected user message in conversation, got ${userMsgs.length}`);
  assert.ok(
    asstMsgs.length >= 1,
    `expected assistant message in conversation, got ${asstMsgs.length}`,
  );
  const matchedUser = userMsgs.some(
    (m) => m.text === utteranceText || m.text === result.user_text,
  );
  assert.ok(matchedUser, "conversation user message should match simulate utterance/STT text");
  console.log("PASS: conversation has user + assistant messages from real runtime turn");

  console.log("");
  console.log("Feature 21 voice simulate proof: ALL CHECKS PASSED");
  console.log(`  call_id:         ${callId}`);
  console.log(`  conversation_id: ${conversationId}`);
  console.log(
    `  timings:         stt=${timings.stt_ms}ms runtime=${timings.runtime_ms}ms tts=${timings.tts_ms}ms`,
  );
}

main().catch((err) => {
  console.error("FAIL:", err.message ?? err);
  process.exitCode = 1;
});
