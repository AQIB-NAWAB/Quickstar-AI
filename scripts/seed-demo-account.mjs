/**
 * Seeds the QuickStart demo account for local collective testing.
 *
 * Covers: register/login, workspace, published agent (audit), secret (audit),
 * publishable key (audit), knowledge source, memory facts, workflow, campaign +
 * targets, leads + schema, eval cases + run, usage ledger rows (model /
 * acquisition / voice).
 *
 * Usage (gateway + services must be up):
 *   node --env-file=.env scripts/seed-demo-account.mjs
 *   pnpm seed:demo
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

const { fetch, AbortSignal } = globalThis;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(root, "fixtures/quickstart-demo-account.json");
const livePath = join(root, "fixtures/quickstart-demo-account.live.json");

const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const usageUrl = (process.env.USAGE_URL ?? "http://127.0.0.1:3017").replace(/\/$/, "");
const internalToken =
  process.env.USAGE_INTERNAL_TOKEN ??
  process.env.INTERNAL_TOKEN ??
  "";

async function request(url, { method = "GET", token, body, status } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
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
  if (status !== undefined && response.status !== status) {
    throw new Error(
      `${method} ${url} → ${response.status} (expected ${status}): ${text.slice(0, 500)}`,
    );
  }
  return { status: response.status, data };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function claimsFromAccessToken(accessToken) {
  try {
    const payload = accessToken.split(".")[1];
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function usageIdempotencyKey(kind, workspaceId, fact, requestId) {
  if (kind === "model") return `model:${workspaceId}:${requestId}`;
  if (kind === "acquisition") {
    return `acquisition:${workspaceId}:${requestId}:${fact.unit_label ?? "scrape"}`;
  }
  return `voice:${workspaceId}:${requestId}:${fact.unit_label ?? "seconds"}`;
}

async function main() {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  const {
    account,
    workspace,
    agent,
    secret,
    publishable_key,
    knowledge_source,
    lead_generation_profile,
    lead_generation_run,
    memory_facts,
    workflow,
    campaign,
    leads,
    lead_schema,
    eval_cases,
    usage_facts,
  } = fixture;

  console.log(`[seed] gateway=${gateway}`);
  console.log(`[seed] account=${account.email}`);

  await request(`${gateway}/healthz`, { status: 200 });

  let token;
  let orgId;
  let userId;

  const loginAttempt = await request(`${gateway}/v1/login`, {
    method: "POST",
    body: { email: account.email, password: account.password },
  });
  if (loginAttempt.status === 200 || loginAttempt.status === 201) {
    token =
      loginAttempt.data.tokens?.access_token ?? loginAttempt.data.access_token;
    const claims = claimsFromAccessToken(token);
    orgId = loginAttempt.data.org_id ?? claims.org_id;
    userId = loginAttempt.data.user_id ?? claims.sub;
    console.log("[seed] logged in existing account");
  } else {
    const reg = await request(`${gateway}/v1/register`, {
      method: "POST",
      body: {
        email: account.email,
        password: account.password,
        organization_name: account.organization_name,
      },
    });
    if (reg.status === 201) {
      token = reg.data.tokens.access_token;
      orgId = reg.data.org_id;
      userId = reg.data.user_id ?? reg.data.user?.id;
      console.log("[seed] registered new account");
    } else if (reg.status === 409) {
      throw new Error(
        `Account ${account.email} exists but login failed (${loginAttempt.status}). ` +
          `Reset password_hash for that user to the fixture password, then re-run pnpm seed:demo.`,
      );
    } else {
      throw new Error(
        `register → ${reg.status}: ${JSON.stringify(reg.data).slice(0, 300)}`,
      );
    }
  }
  if (!token || !orgId) {
    throw new Error("Could not obtain access token / org_id");
  }

  // Workspace (reuse demo slug if present)
  let workspaceId;
  const listWs = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, { token });
  const existing = (listWs.data.workspaces ?? listWs.data.items ?? []).find(
    (w) => w.slug === workspace.slug || w.name === workspace.name,
  );
  if (existing) {
    workspaceId = existing.id;
    console.log(`[seed] reuse workspace ${workspaceId}`);
  } else {
    const created = await request(`${gateway}/v1/orgs/${orgId}/workspaces`, {
      method: "POST",
      token,
      status: 201,
      body: { name: workspace.name, slug: workspace.slug },
    });
    workspaceId = created.data.workspace.id;
    console.log(`[seed] created workspace ${workspaceId}`);
  }

  const ws = `${gateway}/v1/workspaces/${workspaceId}`;

  // Agent + publish (Feature 27 audit: agent.published)
  const agentsList = await request(`${ws}/agents`, { token });
  let agentRow = (agentsList.data.agents ?? []).find((a) => a.name === agent.name);
  if (!agentRow) {
    const created = await request(`${ws}/agents`, {
      method: "POST",
      token,
      status: 201,
      body: {
        name: agent.name,
        instructions: agent.instructions,
        model_settings: agent.model_settings,
      },
    });
    agentRow = created.data.agent;
    console.log(`[seed] created agent ${agentRow.id}`);
  } else {
    console.log(`[seed] reuse agent ${agentRow.id}`);
  }

  let versionId = agentRow.production_version_id;
  if (!versionId) {
    const published = await request(`${ws}/agents/${agentRow.id}/publish`, {
      method: "POST",
      token,
      status: 201,
      body: { base_version: agentRow.version },
    });
    versionId =
      published.data.version?.id ?? published.data.agent?.production_version_id ?? null;
    console.log(`[seed] published agent version ${versionId}`);
  } else {
    console.log(`[seed] agent already published ${versionId}`);
  }

  // Secret (Feature 27 audit: secret.created)
  try {
    await request(`${ws}/secrets`, {
      method: "POST",
      token,
      status: 201,
      body: { name: secret.name, value: secret.value },
    });
    console.log("[seed] secret upserted");
  } catch (err) {
    console.log(`[seed] secret skip: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
  }

  // Publishable key (Feature 27 audit)
  let publishableKeyPreview = null;
  try {
    const pk = await request(`${ws}/publishable-keys`, {
      method: "POST",
      token,
      status: 201,
      body: {
        name: publishable_key.name,
        allowed_origins: publishable_key.allowed_origins,
        default_agent_id: agentRow.id,
      },
    });
    publishableKeyPreview = {
      id: pk.data.publishable_key?.id,
      key_prefix: pk.data.publishable_key?.key_prefix,
      publishable_key: pk.data.publishable_key?.publishable_key,
    };
    console.log("[seed] publishable key created");
  } catch (err) {
    console.log(
      `[seed] publishable key skip: ${err instanceof Error ? err.message.slice(0, 120) : err}`,
    );
  }

  // Knowledge text source (Feature 11)
  let knowledgeSourceId = null;
  if (knowledge_source) {
    try {
      const existingSources = await request(`${ws}/knowledge/sources`, { token });
      const found = (existingSources.data.sources ?? []).find(
        (s) => s.name === knowledge_source.name,
      );
      if (found) {
        knowledgeSourceId = found.id;
        console.log(`[seed] reuse knowledge source ${knowledgeSourceId}`);
      } else {
        const created = await request(`${ws}/knowledge/sources`, {
          method: "POST",
          token,
          status: 201,
          body: {
            name: knowledge_source.name,
            type: knowledge_source.type ?? "text",
            content: knowledge_source.content,
          },
        });
        knowledgeSourceId = created.data.source?.id ?? null;
        console.log(`[seed] knowledge source ${knowledgeSourceId}`);
      }
    } catch (err) {
      console.log(
        `[seed] knowledge skip: ${err instanceof Error ? err.message.slice(0, 160) : err}`,
      );
    }
  }

  // Lead generation profile + optional demo run
  let leadGenRunId = null;
  if (lead_generation_profile) {
    try {
      const existingProfile = await request(`${ws}/lead-generation/profile`, { token });
      const version = Number(existingProfile.data.profile?.version ?? 0);
      const put = await request(`${ws}/lead-generation/profile`, {
        method: "PUT",
        token,
        body: {
          expected_version: version,
          business: lead_generation_profile.business,
        },
      });
      if (put.status === 202 || put.status === 200) {
        console.log("[seed] lead-generation profile upserted");
      } else {
        console.log(`[seed] lead-generation profile → ${put.status}`);
      }
      if (lead_generation_run) {
        for (let i = 0; i < 20; i++) {
          const got = await request(`${ws}/lead-generation/profile`, { token });
          const status = String(got.data.profile?.research_status ?? "");
          if (status === "ready" || status === "failed") break;
          await sleep(500);
        }
        const runRes = await fetch(`${ws}/lead-generation/runs`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "idempotency-key": `demo-lg-run:${workspaceId}`,
          },
          body: JSON.stringify(lead_generation_run),
          signal: AbortSignal.timeout(60_000),
        });
        const runData = await runRes.json().catch(() => ({}));
        leadGenRunId = runData.run?.id ?? null;
        console.log(`[seed] lead-generation run ${leadGenRunId ?? runRes.status}`);
      }
    } catch (err) {
      console.log(
        `[seed] lead-generation skip: ${err instanceof Error ? err.message.slice(0, 160) : err}`,
      );
    }
  }

  // Memory facts (Feature 14)
  const seededMemoryIds = [];
  for (const fact of memory_facts ?? []) {
    try {
      const created = await request(`${ws}/memory/facts`, {
        method: "POST",
        token,
        body: fact,
      });
      if (created.status === 201 || created.status === 200) {
        seededMemoryIds.push(created.data.fact?.id ?? created.data.id);
      }
    } catch (err) {
      console.log(
        `[seed] memory fact skip: ${err instanceof Error ? err.message.slice(0, 120) : err}`,
      );
    }
  }
  console.log(`[seed] memory facts: ${seededMemoryIds.length}`);

  // Workflow (Feature 20)
  let workflowId = null;
  if (workflow) {
    try {
      const listed = await request(`${ws}/workflows`, { token });
      const found = (listed.data.workflows ?? []).find((w) => w.name === workflow.name);
      if (found) {
        workflowId = found.id;
        console.log(`[seed] reuse workflow ${workflowId}`);
      } else {
        const created = await request(`${ws}/workflows`, {
          method: "POST",
          token,
          status: 201,
          body: workflow,
        });
        workflowId = created.data.workflow?.id ?? null;
        console.log(`[seed] workflow ${workflowId}`);
      }
    } catch (err) {
      console.log(
        `[seed] workflow skip: ${err instanceof Error ? err.message.slice(0, 160) : err}`,
      );
    }
  }

  // Campaign + targets (Feature 23) — draft only; do not start dialer
  let campaignId = null;
  if (campaign) {
    try {
      const listed = await request(`${ws}/campaigns`, { token });
      const found = (listed.data.campaigns ?? []).find((c) => c.name === campaign.name);
      if (found) {
        campaignId = found.id;
        console.log(`[seed] reuse campaign ${campaignId}`);
      } else {
        const created = await request(`${ws}/campaigns`, {
          method: "POST",
          token,
          status: 201,
          body: {
            name: campaign.name,
            description: campaign.description ?? null,
            agent_id: agentRow.id,
            agent_name: agentRow.name ?? agent.name,
            idempotency_key: `demo-campaign:${workspaceId}`,
            pacing: campaign.pacing,
            retry_policy: campaign.retry_policy,
            targets: campaign.targets ?? [],
          },
        });
        campaignId = created.data.campaign?.id ?? null;
        console.log(`[seed] campaign ${campaignId}`);
      }
      if (campaignId && Array.isArray(campaign.targets) && campaign.targets.length > 0) {
        await request(`${ws}/campaigns/${campaignId}/targets/import`, {
          method: "POST",
          token,
          body: {
            targets: campaign.targets,
            idempotency_key: `demo-campaign-targets:${workspaceId}`,
          },
        });
        console.log(`[seed] campaign targets: ${campaign.targets.length}`);
      }
    } catch (err) {
      console.log(
        `[seed] campaign skip: ${err instanceof Error ? err.message.slice(0, 160) : err}`,
      );
    }
  }

  // Lead schema + leads (Feature 24) — body is a field-def array
  const schemaRes = await request(`${ws}/leads/schema`, {
    method: "PUT",
    token,
    body: lead_schema,
  });
  if (schemaRes.status !== 200 && schemaRes.status !== 201) {
    throw new Error(`lead schema failed: ${schemaRes.status}`);
  }
  console.log("[seed] lead schema upserted");

  const seededLeads = [];
  for (const lead of leads) {
    const created = await request(`${ws}/leads`, {
      method: "POST",
      token,
      body: {
        ...lead,
        idempotency_key: `demo-lead:${workspaceId}:${lead.email}`,
      },
    });
    if (created.status === 201 || created.status === 200) {
      seededLeads.push(created.data.lead?.id ?? created.data.id);
    }
  }
  console.log(`[seed] leads: ${seededLeads.length}`);

  // Eval cases + run (Feature 25)
  let evalRunId = null;
  if (versionId) {
    const evalBase = `${ws}/agents/${agentRow.id}/eval`;
    for (const c of eval_cases) {
      await request(`${evalBase}/cases`, {
        method: "POST",
        token,
        body: c,
      });
    }
    console.log(`[seed] eval cases: ${eval_cases.length}`);
    const run = await request(`${evalBase}/runs`, {
      method: "POST",
      token,
      body: {
        agent_version_id: versionId,
        idempotency_key: `demo-eval-${workspaceId}`,
      },
    });
    evalRunId = run.data.run?.id ?? null;
    if (evalRunId && run.data.run?.status === "queued") {
      for (let i = 0; i < 40; i++) {
        const got = await request(`${evalBase}/runs/${evalRunId}`, { token });
        if (got.data.run?.status === "completed" || got.data.run?.status === "failed") {
          console.log(`[seed] eval run ${got.data.run.status} score=${got.data.run.score}`);
          break;
        }
        await sleep(500);
      }
    }
  }

  // Usage ledger facts (Feature 26)
  let usageCount = 0;
  if (internalToken.length >= 32) {
    for (const fact of usage_facts) {
      const requestId = randomUUID();
      const idempotencyKey = usageIdempotencyKey(fact.kind, workspaceId, fact, requestId);
      const res = await request(`${usageUrl}/internal/v1/usage/ingest`, {
        method: "POST",
        token: internalToken,
        body: {
          workspace_id: workspaceId,
          kind: fact.kind,
          units: fact.units,
          unit_label: fact.unit_label,
          provider: fact.provider,
          model: fact.model ?? null,
          price_micros: fact.price_micros,
          idempotency_key: idempotencyKey,
          request_id: requestId,
          detail: fact.detail ?? {},
        },
      });
      if (res.status === 200 || res.status === 201) usageCount += 1;
      else {
        console.log(
          `[seed] usage ${fact.kind} → ${res.status}: ${JSON.stringify(res.data).slice(0, 160)}`,
        );
      }
    }
    console.log(`[seed] usage facts: ${usageCount}`);
  } else {
    console.log("[seed] usage skip (INTERNAL_TOKEN missing)");
  }

  // Spot-check staff reads
  const usageList = await request(`${ws}/usage`, { token });
  const auditList = await request(`${ws}/audit`, { token });

  const live = {
    seeded_at: new Date().toISOString(),
    account: { email: account.email, password: account.password },
    org_id: orgId,
    user_id: userId,
    workspace_id: workspaceId,
    agent_id: agentRow.id,
    agent_version_id: versionId,
    publishable_key: publishableKeyPreview,
    knowledge_source_id: knowledgeSourceId,
    memory_fact_ids: seededMemoryIds,
    workflow_id: workflowId,
    campaign_id: campaignId,
    lead_generation_run_id: leadGenRunId,
    lead_ids: seededLeads,
    eval_run_id: evalRunId,
    usage_entries: usageList.data.count ?? usageList.data.entries?.length ?? 0,
    audit_entries: auditList.data.entries?.length ?? 0,
    login: {
      web: "http://127.0.0.1:3015/login",
      email: account.email,
      password: account.password,
    },
  };
  writeFileSync(livePath, JSON.stringify(live, null, 2));
  console.log(`[seed] wrote ${livePath}`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        workspace_id: workspaceId,
        agent_id: agentRow.id,
        knowledge_source_id: knowledgeSourceId,
        workflow_id: workflowId,
        campaign_id: campaignId,
        usage_entries: live.usage_entries,
        audit_entries: live.audit_entries,
        login: live.login,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
