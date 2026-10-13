/**
 * Feature 23 — Campaigns Done when proof.
 *
 * A campaign of a few fake targets runs through the voice test double once each.
 *
 * Prerequisites:
 *   make up; migrate identity, workspace, agent, conversation, voice, campaign
 *   Start gateway, identity, workspace, agent, conversation, model-gateway,
 *   runtime, voice :3008, campaign-service :3013 with CAMPAIGN_DIAL_MODE=voice
 *   INTERNAL_TOKEN / CAMPAIGN_INTERNAL_TOKEN / VOICE_INTERNAL_TOKEN must match
 *
 * Usage:
 *   node --env-file=.env scripts/check-campaign-voice-proof.mjs
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import process from "node:process";
import console from "node:console";

const { fetch, AbortSignal } = globalThis;

const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const voice = (process.env.VOICE_URL ?? "http://127.0.0.1:3008").replace(/\/$/, "");
const campaign = (process.env.CAMPAIGN_URL ?? "http://127.0.0.1:3013").replace(/\/$/, "");
const internalToken =
  process.env.CAMPAIGN_INTERNAL_TOKEN ??
  process.env.VOICE_INTERNAL_TOKEN ??
  process.env.INTERNAL_TOKEN ??
  "";

async function request(url, { method = "GET", token, body, headers = {}, status } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90_000),
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  assert.ok(internalToken.length >= 32, "INTERNAL_TOKEN (or CAMPAIGN_/VOICE_) must be >= 32 chars");

  await request(`${gateway}/healthz`, { status: 200 });
  await request(`${voice}/healthz`, { status: 200 });
  await request(`${campaign}/healthz`, { status: 200 });
  console.log("PASS: gateway, voice, campaign healthz");

  const registered = await request(`${gateway}/v1/register`, {
    method: "POST",
    status: 201,
    body: {
      email: `campaign-proof-${randomUUID()}@example.com`,
      password: randomBytes(24).toString("hex"),
      organization_name: `Campaign proof ${randomUUID().slice(0, 8)}`,
    },
  });
  const token = registered.data.tokens.access_token;
  const orgId = registered.data.org_id;

  const ws = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Campaign proof", slug: `camp-${randomUUID().slice(0, 8)}` },
  });
  const workspaceId = ws.data.workspace.id;

  const agentRes = await request(`${gateway}/v1/workspaces/${workspaceId}/agents`, {
    method: "POST",
    token,
    status: 201,
    body: {
      name: "Campaign dial agent",
      instructions: "You are a short helpful outbound voice assistant.",
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

  // Campaign APIs hit campaign-service directly (gateway proxy may be an older process).
  const campBase = `${campaign}/v1/workspaces/${workspaceId}/campaigns`;

  const idemKey = `campaign-proof-${randomUUID()}`;
  const createBody = {
    name: "Proof campaign",
    agent_id: agent.id,
    agent_name: agent.name ?? "Campaign dial agent",
    idempotency_key: idemKey,
    pacing: { max_concurrent_calls: 3, max_call_starts_per_minute: 60 },
    retry_policy: { max_retries: 0, retry_interval_minutes: 30, eligible_outcomes: [] },
  };

  const created = await request(campBase, {
    method: "POST",
    token,
    status: 201,
    body: createBody,
  });
  const campaignId = created.data.campaign.id;
  assert.ok(campaignId);

  const createdAgain = await request(campBase, {
    method: "POST",
    token,
    status: 201,
    body: createBody,
  });
  assert.equal(
    createdAgain.data.campaign.id,
    campaignId,
    "create retry with same idempotency_key must return same campaign",
  );
  console.log("PASS: create idempotency");

  const phones = ["+15551001", "+15551002", "+15551003"];
  await request(`${campBase}/${campaignId}/targets/import`, {
    method: "POST",
    token,
    status: 200,
    body: {
      targets: phones.map((phone) => ({ phone, name: `Lead ${phone.slice(-4)}` })),
    },
  });
  console.log("PASS: imported 3 targets");

  const version = createdAgain.data.campaign.version ?? created.data.campaign.version ?? 1;
  await request(`${campBase}/${campaignId}/launch`, {
    method: "POST",
    token,
    status: 200,
    body: { expected_version: version },
  });
  console.log("PASS: campaign launched");

  const deadline = Date.now() + 90_000;
  let attempts = [];
  while (Date.now() < deadline) {
    const att = await request(`${campBase}/${campaignId}/attempts`, {
      token,
      status: 200,
    });
    attempts = att.data.attempts ?? [];
    const done = attempts.filter(
      (a) => a.status && a.status !== "in_progress" && a.call_id && !String(a.call_id).startsWith("stub-"),
    );
    if (done.length >= 3) {
      attempts = done;
      break;
    }
    await sleep(1_500);
  }

  assert.ok(
    attempts.length >= 3,
    `expected >=3 completed voice attempts, got ${attempts.length}: ${JSON.stringify(attempts).slice(0, 500)}`,
  );

  const byTarget = new Map();
  for (const a of attempts) {
    const tid = a.contact_id ?? a.target_id ?? a.targetId;
    assert.ok(tid, `attempt missing contact_id: ${JSON.stringify(a)}`);
    byTarget.set(tid, (byTarget.get(tid) ?? 0) + 1);
    assert.ok(a.call_id, "attempt must have call_id");
    assert.ok(!String(a.call_id).startsWith("stub-"), `call_id must not be stub: ${a.call_id}`);
  }
  assert.equal(byTarget.size, 3, "exactly three targets should have attempts");
  for (const count of byTarget.values()) {
    assert.equal(count, 1, "each target attempted once");
  }

  const report = {
    create_idempotent: true,
    targets_once: true,
    voice_call_ids: attempts.map((a) => a.call_id),
    ok: true,
  };
  console.log("PASS: each target dialed once via voice test double");
  console.log(JSON.stringify(report));
}

main().catch((err) => {
  console.error("FAIL:", err.message ?? err);
  process.exitCode = 1;
});
