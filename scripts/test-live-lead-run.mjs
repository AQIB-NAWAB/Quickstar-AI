import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";

const gateway = "http://127.0.0.1:3000";

async function request(url, { method = "GET", token, body, key, status = 200 } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (res.status !== status) {
    console.error("Failed request:", method, url, res.status, JSON.stringify(data));
  }
  assert.equal(res.status, status);
  return data;
}

async function runTest() {
  console.log("1. Registering test user...");
  const user = await request(`${gateway}/v1/register`, {
    method: "POST",
    status: 201,
    body: {
      email: `test-lead-live-run-${randomUUID()}@example.com`,
      password: randomBytes(24).toString("hex"),
      organization_name: "QuickStart AI Tech Leads",
    },
  });
  const token = user.tokens.access_token;
  console.log("   Registered org:", user.org_id);

  console.log("2. Creating workspace...");
  const wsRes = await request(`${gateway}/v1/orgs/${user.org_id}/workspaces`, {
    method: "POST",
    token,
    status: 201,
    body: { name: "Live Leads Workspace", slug: `leads-${randomUUID().slice(0, 8)}` },
  });
  const workspaceId = wsRes.workspace.id;
  const base = `${gateway}/v1/workspaces/${workspaceId}/lead-generation`;
  console.log("   Workspace ID:", workspaceId);

  console.log("3. Putting business profile (QuickStart AI)...");
  await request(`${base}/profile`, {
    method: "PUT",
    token,
    status: 202,
    body: {
      expected_version: 0,
      business: {
        name: "QuickStart AI",
        website: "https://example.com",
        description: "AI infrastructure platform for businesses and developers",
        offerings: ["AI platform", "voice agents", "automation"],
        target_categories: ["software"],
        locations: ["Austin"],
      },
    },
  });

  // Wait for profile research
  console.log("4. Waiting for profile research...");
  for (let i = 0; i < 30; i++) {
    await pause(1000);
    const p = await request(`${base}/profile`, { token });
    if (p.profile?.research_status === "ready") {
      console.log("   Profile ready! Researched summary:", p.profile.researched?.summary);
      break;
    }
    process.stdout.write(".");
  }

  console.log("\n5. Starting real live lead generation run (categories: [software], location: Austin)...");
  const runBody = {
    target_count: 1,
    required_contact: "none",
    campaign_id: randomUUID(),
    categories: ["software"],
    location: "Austin",
  };
  const runRes = await request(`${base}/runs`, {
    method: "POST",
    token,
    body: runBody,
    key: randomUUID(),
    status: 202,
  });
  const runId = runRes.run.id;
  console.log("   Run started with ID:", runId);

  console.log("6. Monitoring live web search and candidate qualification...");
  let run;
  for (let i = 0; i < 40; i++) {
    await pause(3000);
    const r = await request(`${base}/runs/${runId}`, { token });
    process.stdout.write(` [status: ${r.run.status}, accepted: ${r.run.accepted}, errors: ${r.run.errors}, rounds: ${r.run.rounds}] `);
    if (!["queued", "running"].includes(r.run.status)) {
      run = r.run;
      break;
    }
  }
  console.log("\n   Run final status:", run?.status, "accepted:", run?.accepted, "stop_reason:", run?.stop_reason);

  const results = await request(`${base}/runs/${runId}/results`, { token });
  console.log("   Total evaluated prospects:", results.items?.length);
  if (results.items?.length > 0) {
    for (const item of results.items.slice(0, 3)) {
      console.log("   Candidate evaluated:", {
        candidate_url: item.candidate_url,
        status: item.status,
        fit_score: item.assessment?.fit_score,
        company_name: item.assessment?.company_name,
        origin: item.assessment?.data_origin,
      });
    }
  }

  const leads = await request(`${base}/leads`, { token });
  console.log("   Accepted leads in database:", leads.items?.length);
  if (leads.items?.length > 0) {
    for (const lead of leads.items.slice(0, 3)) {
      console.log("   Lead record:", {
        domain: lead.domain,
        company: lead.data?.company_name,
        fit_score: lead.data?.fit_score,
        category: lead.data?.category,
        evidence_count: lead.data?.evidence?.length,
      });
    }
  }

  console.log("\n SUCCESS: Real live lead generation test executed successfully!");
}

runTest().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
