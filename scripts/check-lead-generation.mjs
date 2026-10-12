import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";
import process from "node:process";
import console from "node:console";
import { URL } from "node:url";
const { fetch, AbortSignal } = globalThis;

const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const leadService = (process.env.LEAD_GENERATION_URL ?? "http://127.0.0.1:3012").replace(/\/$/, "");

async function request(url, { method = "GET", token, body, key, status = 200 } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  const data = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${new URL(url).pathname}: ${data.error?.code ?? "unexpected response"}`,
  );
  return data;
}

async function until(load, ready, label) {
  const deadline = Date.now() + 120_000;
  do {
    const value = await load();
    if (ready(value)) return value;
    await pause(750);
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for ${label}. Check the service terminals and /tasks.`);
}

async function register(label) {
  return request(`${gateway}/v1/register`, {
    method: "POST",
    status: 201,
    body: {
      email: `lead-check-${randomUUID()}@example.com`,
      password: randomBytes(24).toString("hex"),
      organization_name: `Lead smoke check ${label}`,
    },
  });
}

async function main() {
  const health = await request(`${leadService}/healthz`);
  assert.equal(
    health.mode,
    "demo",
    "This check creates synthetic data. Use a demo service, never a live production service.",
  );
  await request(`${leadService}/readyz`);
  await request(`${gateway}/healthz`);
  console.log("PASS: gateway is reachable and lead service is ready (demo mode).");

  const owner = await register("owner");
  const token = owner.tokens.access_token;
  const workspace = (
    await request(`${gateway}/v1/orgs/${owner.org_id}/workspaces`, {
      method: "POST",
      token,
      status: 201,
      body: { name: "Lead smoke check", slug: `leads-${randomUUID()}` },
    })
  ).workspace;
  const base = `${gateway}/v1/workspaces/${workspace.id}/lead-generation`;
  await request(`${base}/profile`, {
    method: "PUT",
    token,
    status: 202,
    body: {
      expected_version: 0,
      business: {
        name: "Appointments Demo",
        website: "https://example.com/",
        description: "Appointment software for clinics",
        offerings: ["appointment software"],
        target_categories: ["clinics"],
        locations: ["Lahore"],
      },
    },
  });
  const profile = await until(
    () => request(`${base}/profile`, { token }),
    (value) => ["ready", "failed"].includes(value.profile?.research_status),
    "business research",
  );
  assert.equal(profile.profile.research_status, "ready");
  assert.ok(profile.profile.researched.evidence.length > 0);
  console.log("PASS: business profile research completed with evidence.");

  const body = {
    categories: ["clinics"],
    location: "Lahore",
    target_count: 3,
    required_contact: "email",
    campaign_id: randomUUID(),
  };
  const key = randomUUID();
  const created = await request(`${base}/runs`, { method: "POST", token, body, key, status: 202 });
  const replay = await request(`${base}/runs`, { method: "POST", token, body, key });
  assert.equal(replay.run.id, created.run.id);
  assert.equal(replay.deduplicated, true);
  await request(`${base}/runs`, {
    method: "POST",
    token,
    body: { ...body, target_count: 2 },
    key,
    status: 409,
  });
  console.log("PASS: duplicate requests reuse a run; conflicting reuse returns 409.");

  const runUrl = `${base}/runs/${created.run.id}`;
  const { run } = await until(
    () => request(runUrl, { token }),
    (value) => !["queued", "running"].includes(value.run.status),
    "lead generation",
  );
  assert.equal(run.status, "completed");
  assert.equal(run.accepted, 3);
  assert.equal(run.stop_reason, "target_reached");
  const results = await request(`${runUrl}/results`, { token });
  const accepted = results.items.filter((value) => value.status === "accepted");
  assert.equal(accepted.length, 3);
  assert.ok(
    accepted.every(
      (value) =>
        value.assessment.data_origin === "demo" &&
        value.assessment.email &&
        value.assessment.evidence.length > 0,
    ),
  );
  const leads = await request(`${base}/leads`, { token });
  assert.equal(leads.items.length, 3);
  console.log("PASS: three unique, evidence-backed synthetic leads saved.");

  const deliveries = await until(
    () => request(`${runUrl}/deliveries`, { token }),
    (value) =>
      value.items.length === 3 &&
      value.items.every((item) => ["done", "failed"].includes(item.state)),
    "campaign handoff",
  );
  assert.ok(
    deliveries.items.every((value) => value.state === "done" && value.result.simulated === true),
  );
  console.log("PASS: all three campaign handoffs acknowledged by the demo adapter.");

  const admin = process.env.LEAD_GENERATION_ADMIN_TOKEN;
  assert.ok(admin, "Load .env.leads so the smoke checker can verify admin policy changes.");
  const before = await request(
    `${leadService}/internal/lead-generation/tenants/${owner.org_id}/policy`,
    { token: admin },
  );
  const version = Number(before.version.split(":").at(-1));
  const changed = await request(`${leadService}/internal/lead-generation/settings`, {
    method: "PUT",
    token: admin,
    body: {
      scope: "tenant",
      org_id: owner.org_id,
      expected_version: version,
      policy: { max_target_count: 2 },
      reason: "Development smoke check: exercise dynamic tenant limits",
    },
  });
  try {
    await request(`${base}/runs`, { method: "POST", token, body, key: randomUUID(), status: 429 });
    const effective = await request(`${base}/policy`, { token });
    assert.equal(effective.policy.max_target_count, 2);
    const history = await request(`${leadService}/internal/lead-generation/audit`, {
      token: admin,
    });
    // The shared audit is paginated; use the returned update's version plus workspace
    // policy for the check, and assert the organization's audit through its ID.
    let page = history;
    let found = page.items.some(
      (item) => item.org_id === owner.org_id && item.action === "settings.tenant",
    );
    while (!found && page.next_cursor) {
      page = await request(
        `${leadService}/internal/lead-generation/audit?after=${page.next_cursor}`,
        { token: admin },
      );
      found = page.items.some(
        (item) => item.org_id === owner.org_id && item.action === "settings.tenant",
      );
    }
    assert.ok(found, "Tenant settings update must have an audit entry.");
  } finally {
    await request(`${leadService}/internal/lead-generation/settings`, {
      method: "PUT",
      token: admin,
      body: {
        scope: "tenant",
        org_id: owner.org_id,
        expected_version: changed.policy_version,
        policy: null,
        reason: "Development smoke check: restore inherited tenant policy",
      },
    });
  }
  console.log(
    "PASS: dynamic tenant limits take effect immediately and settings changes are audited.",
  );

  await request(`${base}/runs`, { status: 401 });
  const stranger = await register("unauthorized");
  await request(`${base}/runs`, { token: stranger.tokens.access_token, status: 403 });
  await request(`${leadService}/internal/lead-generation/settings`, { token, status: 401 });
  console.log("PASS: anonymous, other-tenant and customer-as-admin access rejected.");

  const audit = await request(`${base}/audit`, { token });
  assert.ok(audit.items.some((value) => value.action === "profile.updated"));
  assert.ok(audit.items.some((value) => value.action === "run.created"));
  await request(`${base}/policy`, { token });
  await request(`${base}/usage`, { token });
  console.log("PASS: policy, usage and action history are available.");
  console.log(
    JSON.stringify(
      {
        workspace_id: workspace.id,
        run_id: run.id,
        accepted: run.accepted,
        campaign_deliveries: deliveries.items.length,
        mode: "demo",
      },
      null,
      2,
    ),
  );
  console.log(
    "ALL CHECKS PASSED. Demo accounts and results remain in your development database for inspection. No real businesses were researched or contacted.",
  );
}

main().catch((error) => {
  console.error(`CHECK FAILED: ${error.message}`);
  process.exitCode = 1;
});
