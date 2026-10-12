import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type {
  BusinessInput,
  LeadPolicy,
  LeadRunInput,
  CampaignLeadDelivery,
} from "@quickstart/contracts";
import { DEFAULT_POLICY, domain, fail, fingerprint, policyInput } from "./domain.js";
import { ErrorCode } from "@quickstart/errors";

export type Identity = { orgId: string; workspaceId: string; actorId: string; requestId: string };
export type Task = {
  id: string;
  org_id: string;
  workspace_id: string;
  run_id: string | null;
  kind: "profile" | "search" | "candidate" | "delivery";
  payload: Record<string, unknown>;
  lease_token: string;
  attempts: number;
  request_id: string;
};
export type Run = {
  id: string;
  org_id: string;
  workspace_id: string;
  brief: LeadRunInput;
  policy_snapshot: LeadPolicy;
  policy_version: string;
  status: string;
  profile_id: string;
  profile_snapshot: { supplied: BusinessInput; researched: Json | null };
  accepted: number;
  errors: number;
  rounds: number;
  deadline_at: Date;
  stop_reason: string | null;
};
type Json = Record<string, unknown>;
export class Store {
  constructor(
    readonly pool: Pool,
    readonly mode: "demo" | "live" = "live",
  ) {}
  async tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async initialize(): Promise<void> {
    await this.pool.query(
      "INSERT INTO lg_control(id,default_policy) VALUES(1,$1) ON CONFLICT DO NOTHING",
      [DEFAULT_POLICY],
    );
  }
  private async global(c: PoolClient) {
    return (await c.query("SELECT * FROM lg_control WHERE id=1 FOR UPDATE")).rows[0];
  }
  private async tenant(c: PoolClient, org: string) {
    await c.query("INSERT INTO lg_tenants(org_id) VALUES($1) ON CONFLICT DO NOTHING", [org]);
    return (await c.query("SELECT * FROM lg_tenants WHERE org_id=$1 FOR UPDATE", [org])).rows[0];
  }
  private async effective(
    c: PoolClient,
    org: string,
  ): Promise<{ policy: LeadPolicy; version: string }> {
    const global = (await c.query("SELECT * FROM lg_control WHERE id=1")).rows[0];
    const tenant = (await c.query("SELECT * FROM lg_tenants WHERE org_id=$1", [org])).rows[0];
    const tier = tenant?.tier_name
      ? (await c.query("SELECT * FROM lg_tiers WHERE name=$1", [tenant.tier_name])).rows[0]
      : null;
    return {
      policy: policyInput({ ...global.default_policy, ...tier?.policy, ...tenant?.policy }),
      version: `${global.version}:${tier?.version ?? 0}:${tenant?.policy_version ?? 0}`,
    };
  }
  async policy(org: string) {
    return this.tx(async (c) => {
      await this.global(c);
      await this.tenant(c, org);
      return this.effective(c, org);
    });
  }
  private async audit(
    c: PoolClient,
    i: Identity,
    action: string,
    previous: unknown,
    next: unknown,
    reason: string,
  ) {
    await c.query(
      "INSERT INTO lg_audit(org_id,workspace_id,actor_id,action,previous,next,reason,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        i.orgId || null,
        i.workspaceId || null,
        i.actorId,
        action,
        previous,
        next,
        reason,
        i.requestId,
      ],
    );
  }
  async settings(): Promise<unknown> {
    const control = (await this.pool.query("SELECT * FROM lg_control")).rows[0];
    const tiers = (await this.pool.query("SELECT * FROM lg_tiers ORDER BY name")).rows;
    return { control, tiers };
  }
  async changeSettings(
    i: Identity,
    input: {
      scope: "global" | "tier" | "tenant";
      name?: string;
      org_id?: string;
      expected_version: number;
      policy?: Partial<LeadPolicy> | null;
      tier_name?: string | null;
      global_active_limit?: number;
      reason: string;
    },
  ) {
    return this.tx(async (c) => {
      const g = await this.global(c);
      let previous: unknown;
      let next: unknown;
      if (input.scope === "global") {
        if (g.version !== input.expected_version)
          fail("Configuration version changed", ErrorCode.CONFLICT);
        const p = policyInput({ ...g.default_policy, ...input.policy });
        const cap = input.global_active_limit ?? g.global_active_limit;
        previous = g;
        next = (
          await c.query(
            "UPDATE lg_control SET default_policy=$1,global_active_limit=$2,version=version+1 WHERE id=1 RETURNING *",
            [p, cap],
          )
        ).rows[0];
      } else if (input.scope === "tier") {
        const prior = (await c.query("SELECT * FROM lg_tiers WHERE name=$1", [input.name])).rows[0];
        if ((prior?.version ?? 0) !== input.expected_version)
          fail("Tier version changed", ErrorCode.CONFLICT);
        const patch = { ...prior?.policy, ...input.policy };
        policyInput({ ...g.default_policy, ...patch });
        previous = prior ?? null;
        next = (
          await c.query(
            "INSERT INTO lg_tiers(name,policy) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET policy=$2,version=lg_tiers.version+1 RETURNING *",
            [input.name, patch],
          )
        ).rows[0];
      } else {
        const t = await this.tenant(c, input.org_id!);
        if (t.policy_version !== input.expected_version)
          fail("Tenant version changed", ErrorCode.CONFLICT);
        const tierName = input.tier_name === undefined ? t.tier_name : input.tier_name;
        const tier = tierName
          ? (await c.query("SELECT * FROM lg_tiers WHERE name=$1", [tierName])).rows[0]
          : null;
        if (tierName && !tier) fail("Unknown tier");
        const patch = input.policy === null ? null : { ...t.policy, ...input.policy };
        policyInput({ ...g.default_policy, ...tier?.policy, ...patch });
        previous = t;
        next = (
          await c.query(
            "UPDATE lg_tenants SET tier_name=$2,policy=$3,policy_version=policy_version+1 WHERE org_id=$1 RETURNING *",
            [input.org_id, tierName, patch],
          )
        ).rows[0];
      }
      await this.audit(
        c,
        { ...i, orgId: input.scope === "tenant" ? input.org_id! : "" },
        `settings.${input.scope}`,
        previous,
        next,
        input.reason,
      );
      return next;
    });
  }
  async apiRate(org: string, write = true): Promise<void> {
    await this.tx(async (c) => {
      await this.global(c);
      const t = await this.tenant(c, org);
      const { policy: p } = await this.effective(c, org);
      if (write && !p.enabled) fail("Lead generation is disabled", ErrorCode.FORBIDDEN);
      const row = (await c.query("SELECT date_trunc('minute',now()) AS minute")).rows[0];
      const count = t.api_minute?.getTime() === row.minute.getTime() ? t.api_count : 0;
      if (count >= p.request_rate_per_minute)
        fail("Tenant API rate exceeded", ErrorCode.RATE_LIMITED);
      await c.query("UPDATE lg_tenants SET api_minute=$2,api_count=$3 WHERE org_id=$1", [
        org,
        row.minute,
        count + 1,
      ]);
    });
  }
  async profile(i: Identity) {
    return (
      (
        await this.pool.query(
          "SELECT * FROM lg_profiles WHERE workspace_id=$1 AND org_id=$2 AND execution_mode=$3 ORDER BY version DESC LIMIT 1",
          [i.workspaceId, i.orgId, this.mode],
        )
      ).rows[0] ?? null
    );
  }
  async putProfile(i: Identity, supplied: BusinessInput, expectedVersion: number) {
    return this.tx(async (c) => {
      await this.global(c);
      await this.tenant(c, i.orgId);
      const previous = (
        await c.query(
          "SELECT * FROM lg_profiles WHERE workspace_id=$1 AND org_id=$2 AND execution_mode=$3 ORDER BY version DESC LIMIT 1",
          [i.workspaceId, i.orgId, this.mode],
        )
      ).rows[0];
      if ((previous?.version ?? 0) !== expectedVersion)
        fail("Profile version changed", ErrorCode.CONFLICT);
      const { policy: p } = await this.effective(c, i.orgId);
      await this.backlog(c, i.orgId, p);
      const profile = (
        await c.query(
          "INSERT INTO lg_profiles(org_id,workspace_id,version,supplied,execution_mode) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [i.orgId, i.workspaceId, expectedVersion + 1, supplied, this.mode],
        )
      ).rows[0];
      await this.task(c, i, "profile", { profile_id: profile.id }, `profile:${profile.id}`);
      await this.audit(
        c,
        i,
        "profile.updated",
        previous?.supplied ?? null,
        supplied,
        "User updated business details",
      );
      return profile;
    });
  }
  private async backlog(c: PoolClient, org: string, p: LeadPolicy) {
    const n = Number(
      (
        await c.query(
          "SELECT count(*) FROM lg_tasks WHERE org_id=$1 AND kind='profile' AND state IN ('queued','running')",
          [org],
        )
      ).rows[0].count,
    );
    if (n >= p.max_queued_runs) fail("Onboarding backlog full", ErrorCode.RATE_LIMITED);
  }
  private async task(
    c: PoolClient,
    i: Identity,
    kind: Task["kind"],
    payload: unknown,
    dedup: string,
    run: string | null = null,
  ) {
    await c.query(
      "INSERT INTO lg_tasks(org_id,workspace_id,kind,payload,dedup_key,run_id,request_id,execution_mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(workspace_id,dedup_key) DO NOTHING",
      [i.orgId, i.workspaceId, kind, payload, dedup, run, i.requestId, this.mode],
    );
  }
  private async daily(c: PoolClient, org: string) {
    await c.query(
      "INSERT INTO lg_usage_daily(org_id,day) VALUES($1,CURRENT_DATE) ON CONFLICT DO NOTHING",
      [org],
    );
    return (
      await c.query(
        "SELECT * FROM lg_usage_daily WHERE org_id=$1 AND day=CURRENT_DATE FOR UPDATE",
        [org],
      )
    ).rows[0];
  }
  async createRun(i: Identity, brief: LeadRunInput, idempotency: string) {
    return this.tx(async (c) => {
      await this.global(c);
      await this.tenant(c, i.orgId);
      const hash = fingerprint(brief);
      const prior = (
        await c.query(
          "SELECT * FROM lg_runs WHERE workspace_id=$1 AND org_id=$2 AND idempotency_key=$3 AND execution_mode=$4",
          [i.workspaceId, i.orgId, idempotency, this.mode],
        )
      ).rows[0];
      if (prior) {
        if (prior.request_hash !== hash)
          fail("Idempotency-Key reused with different request", ErrorCode.CONFLICT);
        return { run: prior, deduplicated: true };
      }
      const { policy: p, version } = await this.effective(c, i.orgId);
      if (!p.enabled) fail("Lead generation disabled", ErrorCode.FORBIDDEN);
      if (brief.categories.length > p.max_categories || brief.target_count > p.max_target_count)
        fail("Run exceeds category or target safety limit", ErrorCode.RATE_LIMITED);
      const active = Number(
        (
          await c.query(
            "SELECT count(*) FROM lg_runs WHERE org_id=$1 AND status IN ('queued','running')",
            [i.orgId],
          )
        ).rows[0].count,
      );
      if (active >= p.max_queued_runs) fail("Tenant run backlog full", ErrorCode.RATE_LIMITED);
      const usage = await this.daily(c, i.orgId);
      if (p.subscription_limits_enabled && usage.runs >= p.daily_runs)
        fail("Daily run quota reached", ErrorCode.RATE_LIMITED);
      const profile = (
        await c.query(
          "SELECT * FROM lg_profiles WHERE workspace_id=$1 AND org_id=$2 AND execution_mode=$3 ORDER BY version DESC LIMIT 1",
          [i.workspaceId, i.orgId, this.mode],
        )
      ).rows[0];
      if (!profile) fail("Create a business profile before starting research", ErrorCode.CONFLICT);
      const run = (
        await c.query(
          "INSERT INTO lg_runs(org_id,workspace_id,profile_id,brief,policy_snapshot,policy_version,idempotency_key,request_hash,request_id,deadline_at,execution_mode,profile_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+$10*interval '1 second',$11,$12) RETURNING *",
          [
            i.orgId,
            i.workspaceId,
            profile.id,
            brief,
            p,
            version,
            idempotency,
            hash,
            i.requestId,
            p.run_deadline_seconds,
            this.mode,
            { supplied: profile.supplied, researched: profile.researched },
          ],
        )
      ).rows[0];
      await c.query("UPDATE lg_usage_daily SET runs=runs+1 WHERE org_id=$1 AND day=CURRENT_DATE", [
        i.orgId,
      ]);
      for (const category of brief.categories)
        await this.task(
          c,
          i,
          "search",
          { category, round: 0 },
          `search:${run.id}:${category}:0`,
          run.id,
        );
      await this.audit(
        c,
        i,
        "run.created",
        null,
        { run_id: run.id, brief },
        "User requested lead generation",
      );
      return { run, deduplicated: false };
    });
  }
  async run(i: Identity, id: string): Promise<Run> {
    const row = (
      await this.pool.query(
        "SELECT * FROM lg_runs WHERE workspace_id=$1 AND org_id=$2 AND id=$3 AND execution_mode=$4",
        [i.workspaceId, i.orgId, id, this.mode],
      )
    ).rows[0];
    if (!row) fail("Run not found", ErrorCode.NOT_FOUND);
    const progress = (
      await this.pool.query(
        "SELECT status,count(*)::int AS count FROM lg_candidates WHERE run_id=$1 GROUP BY status",
        [id],
      )
    ).rows;
    return { ...row, progress };
  }
  async list(
    i: Identity,
    resource: "runs" | "leads" | "audit",
    after: string | null,
    limit: number,
  ) {
    if (resource === "audit")
      return (
        await this.pool.query(
          "SELECT id,action,reason,actor_id,created_at FROM lg_audit WHERE workspace_id=$1 AND org_id=$2 AND id>$3 ORDER BY id LIMIT $4",
          [i.workspaceId, i.orgId, after ?? "0", limit],
        )
      ).rows;
    const table = resource === "runs" ? "lg_runs" : "lg_leads";
    const modeFilter = ` AND execution_mode='${this.mode}'`;
    return (
      await this.pool.query(
        `SELECT * FROM ${table} WHERE workspace_id=$1 AND org_id=$2${modeFilter} AND ($3::uuid IS NULL OR id>$3::uuid) ORDER BY id LIMIT $4`,
        [i.workspaceId, i.orgId, after, limit],
      )
    ).rows;
  }
  async results(i: Identity, id: string, after: string | null, limit: number) {
    await this.run(i, id);
    return (
      await this.pool.query(
        "SELECT c.id,c.url,c.category,c.status,c.assessment FROM lg_candidates c WHERE run_id=$1 AND workspace_id=$2 AND ($3::uuid IS NULL OR c.id>$3::uuid) ORDER BY c.id LIMIT $4",
        [id, i.workspaceId, after, limit],
      )
    ).rows;
  }
  async deliveries(i: Identity, id: string) {
    await this.run(i, id);
    return (
      await this.pool.query(
        "SELECT id,state,attempts,error_code,available_at,result FROM lg_tasks WHERE run_id=$1 AND workspace_id=$2 AND kind='delivery' ORDER BY created_at LIMIT 1000",
        [id, i.workspaceId],
      )
    ).rows;
  }
  async cancel(i: Identity, id: string) {
    return this.tx(async (c) => {
      await this.global(c);
      const run = (
        await c.query(
          "SELECT * FROM lg_runs WHERE id=$1 AND workspace_id=$2 AND org_id=$3 AND execution_mode=$4 FOR UPDATE",
          [id, i.workspaceId, i.orgId, this.mode],
        )
      ).rows[0] as Run;
      if (!run) fail("Run not found", ErrorCode.NOT_FOUND);
      if (["completed", "completed_with_errors", "failed", "cancelled"].includes(run.status))
        return run;
      await c.query(
        "UPDATE lg_runs SET status='cancelled',stop_reason='user_cancelled' WHERE id=$1",
        [id],
      );
      await c.query(
        "UPDATE lg_tasks SET state='cancelled',lease_token=NULL,lease_until=NULL WHERE run_id=$1 AND kind!='delivery' AND state IN ('queued','running')",
        [id],
      );
      await c.query(
        "UPDATE lg_candidates SET status='cancelled' WHERE run_id=$1 AND status='queued'",
        [id],
      );
      await this.audit(
        c,
        i,
        "run.cancelled",
        { status: run.status },
        { status: "cancelled" },
        "User cancelled research",
      );
      return { ...run, status: "cancelled", stop_reason: "user_cancelled" };
    });
  }
  /** One DB lock coordinates all replicas. Caps aggregate all workspaces within an organization. */
  async claim(leaseSeconds: number): Promise<Task | null> {
    return this.tx(async (c) => {
      const g = await this.global(c);
      await c.query(
        "UPDATE lg_tasks SET state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'queued' END,available_at=now(),lease_token=NULL,lease_until=NULL,error_code='LEASE_EXPIRED' WHERE state='running' AND lease_until<now()",
      );
      await c.query(
        "UPDATE lg_runs SET status='completed_with_errors',stop_reason='deadline_reached' WHERE status IN ('queued','running') AND deadline_at<now()",
      );
      await c.query(
        "UPDATE lg_tasks t SET state='cancelled',lease_token=NULL,lease_until=NULL FROM lg_runs r WHERE t.run_id=r.id AND t.kind!='delivery' AND t.state IN ('queued','running') AND r.status NOT IN ('queued','running')",
      );
      await c.query(
        "UPDATE lg_candidates c SET status='cancelled' WHERE c.status='queued' AND EXISTS(SELECT 1 FROM lg_tasks t WHERE t.kind='candidate' AND t.state='cancelled' AND t.payload->>'candidate_id'=c.id::text)",
      );
      await c.query(
        "UPDATE lg_profiles p SET research_status='failed' WHERE EXISTS(SELECT 1 FROM lg_tasks t WHERE t.kind='profile' AND t.state='failed' AND t.payload->>'profile_id'=p.id::text)",
      );
      await c.query(
        "UPDATE lg_candidates c SET status='failed' WHERE c.status='queued' AND EXISTS(SELECT 1 FROM lg_tasks t WHERE t.kind='candidate' AND t.state='failed' AND t.payload->>'candidate_id'=c.id::text)",
      );
      const active = Number(
        (await c.query("SELECT count(*) FROM lg_tasks WHERE state='running'")).rows[0].count,
      );
      if (active >= g.global_active_limit) return null;
      const tenants = (
        await c.query(
          "SELECT t.* FROM lg_tenants t WHERE EXISTS(SELECT 1 FROM lg_tasks j WHERE j.org_id=t.org_id AND j.state='queued' AND j.available_at<=now() AND j.execution_mode=$1) ORDER BY t.virtual_finish,t.org_id",
          [this.mode],
        )
      ).rows;
      for (const t of tenants) {
        const { policy: p } = await this.effective(c, t.org_id);
        if (!p.enabled) continue;
        const count = Number(
          (
            await c.query("SELECT count(*) FROM lg_tasks WHERE org_id=$1 AND state='running'", [
              t.org_id,
            ])
          ).rows[0].count,
        );
        if (count >= p.max_active_tasks) continue;
        const task = (
          await c.query(
            "SELECT * FROM lg_tasks WHERE org_id=$1 AND state='queued' AND available_at<=now() AND execution_mode=$2 ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1",
            [t.org_id, this.mode],
          )
        ).rows[0];
        if (!task) continue;
        const token = randomUUID();
        const claimed = (
          await c.query(
            "UPDATE lg_tasks SET state='running',attempts=attempts+1,lease_token=$2,lease_until=now()+$3*interval '1 second' WHERE id=$1 RETURNING *",
            [task.id, token, leaseSeconds],
          )
        ).rows[0];
        // Charge expensive kinds more; cap catch-up credit for previously idle tenants.
        const cost = task.kind === "candidate" ? 3 : 1;
        const min = Number(tenants[0].virtual_finish);
        await c.query(
          "UPDATE lg_tenants SET virtual_finish=GREATEST(virtual_finish,$2)+$3 WHERE org_id=$1",
          [t.org_id, min - 10, cost / p.scheduling_weight],
        );
        if (task.run_id && task.kind !== "delivery")
          await c.query("UPDATE lg_runs SET status='running' WHERE id=$1 AND status='queued'", [
            task.run_id,
          ]);
        return claimed;
      }
      return null;
    });
  }
  private async live(c: PoolClient, t: Task) {
    const row = (
      await c.query(
        "SELECT * FROM lg_tasks WHERE id=$1 AND state='running' AND lease_token=$2 AND lease_until>now() FOR UPDATE",
        [t.id, t.lease_token],
      )
    ).rows[0];
    if (!row) fail("Task lease lost", ErrorCode.CONFLICT);
    return row;
  }
  async heartbeat(t: Task, seconds: number): Promise<boolean> {
    return (
      (
        await this.pool.query(
          "UPDATE lg_tasks SET lease_until=now()+$3*interval '1 second' WHERE id=$1 AND lease_token=$2 AND state='running' AND lease_until>now()",
          [t.id, t.lease_token, seconds],
        )
      ).rowCount === 1
    );
  }
  async context(t: Task) {
    const i = {
      orgId: t.org_id,
      workspaceId: t.workspace_id,
      actorId: "worker",
      requestId: t.request_id,
    };
    const run = t.run_id ? await this.run(i, t.run_id) : null;
    if (run) return { run, profile: run.profile_snapshot };
    const profile = (
      await this.pool.query("SELECT * FROM lg_profiles WHERE id=$1 AND workspace_id=$2", [
        t.payload.profile_id,
        t.workspace_id,
      ])
    ).rows[0];
    return { run, profile };
  }
  async reserve(t: Task, action: string, tokens: number) {
    return this.tx(async (c) => {
      await this.global(c);
      await this.live(c, t);
      await this.tenant(c, t.org_id);
      const { policy: p, version } = await this.effective(c, t.org_id);
      const daily = await this.daily(c, t.org_id);
      if (!p.enabled) fail("Research disabled", ErrorCode.RATE_LIMITED);
      // These daily provider safeguards apply even when commercial subscription limits are off.
      if (Number(daily.units) + 1 > p.daily_units || Number(daily.tokens) + tokens > p.daily_tokens)
        fail("Provider usage safety budget reached", ErrorCode.RATE_LIMITED);
      await c.query(
        "UPDATE lg_usage_daily SET units=units+1,tokens=tokens+$2 WHERE org_id=$1 AND day=CURRENT_DATE",
        [t.org_id, tokens],
      );
      const row = (
        await c.query(
          "INSERT INTO lg_usage_events(task_id,org_id,day,action,policy_version,reserved_tokens) VALUES($1,$2,CURRENT_DATE,$3,$4,$5) RETURNING id",
          [t.id, t.org_id, action, version, tokens],
        )
      ).rows[0];
      return row.id as string;
    });
  }
  async settle(eventId: string, actualTokens: number): Promise<void> {
    await this.tx(async (c) => {
      const e = (await c.query("SELECT * FROM lg_usage_events WHERE id=$1 FOR UPDATE", [eventId]))
        .rows[0];
      if (!e || e.state !== "reserved") return;
      await c.query("UPDATE lg_usage_events SET state='settled',actual_tokens=$2 WHERE id=$1", [
        eventId,
        actualTokens,
      ]);
      await c.query(
        "UPDATE lg_usage_daily SET tokens=GREATEST(0,tokens+$3) WHERE org_id=$1 AND day=$2",
        [e.org_id, e.day, actualTokens - e.reserved_tokens],
      );
    });
  }
  async finishProfile(t: Task, researched: Json) {
    await this.tx(async (c) => {
      await this.global(c);
      await this.live(c, t);
      await c.query(
        "UPDATE lg_profiles SET researched=$2,research_status='ready' WHERE id=$1 AND workspace_id=$3",
        [t.payload.profile_id, researched, t.workspace_id],
      );
      await this.done(c, t);
    });
  }
  private async done(c: PoolClient, t: Task, result: unknown = null) {
    await c.query(
      "UPDATE lg_tasks SET state='done',result=$2,lease_until=NULL,lease_token=NULL WHERE id=$1",
      [t.id, result],
    );
  }
  async discovered(t: Task, urls: Array<{ url: string; category: string }>) {
    await this.tx(async (c) => {
      await this.global(c);
      await this.live(c, t);
      const run = (await c.query("SELECT * FROM lg_runs WHERE id=$1 FOR UPDATE", [t.run_id]))
        .rows[0] as Run;
      if (!["queued", "running"].includes(run.status)) return;
      let n = Number(
        (await c.query("SELECT count(*) FROM lg_candidates WHERE run_id=$1", [run.id])).rows[0]
          .count,
      );
      const { policy: current } = await this.effective(c, t.org_id);
      const cap = Math.min(run.policy_snapshot.max_candidates, current.max_candidates);
      for (const u of urls) {
        if (n >= cap) break;
        const host = new URL(u.url).hostname.toLowerCase().replace(/^www\./, "");
        const ownDomain = domain(run.profile_snapshot.supplied.website);
        if (host === ownDomain || host.endsWith(`.${ownDomain}`)) continue;
        if (run.brief.excluded_domains.some((d) => host === d || host.endsWith(`.${d}`))) continue;
        const rows = (
          await c.query(
            "INSERT INTO lg_candidates(run_id,workspace_id,domain,url,category) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id",
            [run.id, t.workspace_id, host, u.url, u.category],
          )
        ).rows;
        if (rows.length) {
          n++;
          await this.task(
            c,
            {
              orgId: t.org_id,
              workspaceId: t.workspace_id,
              actorId: "worker",
              requestId: t.request_id,
            },
            "candidate",
            { candidate_id: rows[0].id, url: u.url, category: u.category },
            `candidate:${rows[0].id}`,
            run.id,
          );
        }
      }
      const round = Number(t.payload.round);
      if (round + 1 < Math.min(run.policy_snapshot.max_rounds, current.max_rounds) && n < cap) {
        const category = String(t.payload.category);
        await this.task(
          c,
          {
            orgId: t.org_id,
            workspaceId: t.workspace_id,
            actorId: "worker",
            requestId: t.request_id,
          },
          "search",
          { category, round: round + 1 },
          `search:${run.id}:${category}:${round + 1}`,
          run.id,
        );
      }
      await c.query("UPDATE lg_runs SET rounds=GREATEST(rounds,$2) WHERE id=$1", [
        run.id,
        round + 1,
      ]);
      await this.done(c, t, { discovered: urls.length });
    });
    await this.finalizeRuns();
  }
  async assessed(t: Task, data: CampaignLeadDelivery["lead"], accepted: boolean) {
    data = { ...data, data_origin: this.mode };
    await this.tx(async (c) => {
      await this.global(c);
      await this.live(c, t);
      const run = (await c.query("SELECT * FROM lg_runs WHERE id=$1 FOR UPDATE", [t.run_id]))
        .rows[0] as Run;
      if (!["queued", "running"].includes(run.status)) return;
      const host = domain(data.website);
      const ownDomain = domain(run.profile_snapshot.supplied.website);
      const excluded =
        host === ownDomain ||
        host.endsWith(`.${ownDomain}`) ||
        run.brief.excluded_domains.some((d) => host === d || host.endsWith(`.${d}`));
      const isAccepted = accepted && !excluded && run.accepted < run.brief.target_count;
      let added = false;
      await c.query(
        "UPDATE lg_candidates SET status=$2,assessment=$3 WHERE id=$1 AND workspace_id=$4",
        [t.payload.candidate_id, isAccepted ? "accepted" : "rejected", data, t.workspace_id],
      );
      if (isAccepted) {
        const lead = (
          await c.query(
            "INSERT INTO lg_leads(org_id,workspace_id,domain,data,execution_mode) VALUES($1,$2,$3,$4,$5) ON CONFLICT(workspace_id,domain,execution_mode) DO UPDATE SET data=$4,checked_at=now() RETURNING *",
            [t.org_id, t.workspace_id, host, { ...data, data_origin: this.mode }, this.mode],
          )
        ).rows[0];
        const inserted = await c.query(
          "INSERT INTO lg_run_leads(run_id,lead_id,data_snapshot) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
          [run.id, lead.id, data],
        );
        if (inserted.rowCount) {
          added = true;
          await c.query("UPDATE lg_runs SET accepted=accepted+1 WHERE id=$1", [run.id]);
          if (run.brief.campaign_id) {
            const delivery: CampaignLeadDelivery = {
              schema_version: 1,
              idempotency_key: `lead:${t.workspace_id}:${run.brief.campaign_id}:${lead.id}`,
              workspace_id: t.workspace_id,
              campaign_id: run.brief.campaign_id,
              run_id: run.id,
              lead_id: lead.id,
              lead: data,
            };
            await this.task(
              c,
              {
                orgId: t.org_id,
                workspaceId: t.workspace_id,
                actorId: "worker",
                requestId: t.request_id,
              },
              "delivery",
              delivery,
              `delivery:${this.mode}:${run.brief.campaign_id}:${lead.id}`,
              run.id,
            );
          }
        } else {
          await c.query("UPDATE lg_candidates SET status='duplicate' WHERE id=$1", [
            t.payload.candidate_id,
          ]);
        }
      }
      await this.done(c, t);
      if (added && run.accepted + 1 >= run.brief.target_count) {
        await c.query(
          "UPDATE lg_runs SET status=CASE WHEN errors>0 THEN 'completed_with_errors' ELSE 'completed' END,stop_reason='target_reached' WHERE id=$1",
          [run.id],
        );
        await c.query(
          "UPDATE lg_candidates SET status='cancelled' WHERE run_id=$1 AND status='queued'",
          [run.id],
        );
        await c.query(
          "UPDATE lg_tasks SET state='cancelled',lease_token=NULL,lease_until=NULL WHERE run_id=$1 AND kind IN ('search','candidate') AND state IN ('queued','running')",
          [run.id],
        );
      }
    });
    await this.finalizeRuns();
  }
  async delivered(t: Task, result: unknown) {
    await this.tx(async (c) => {
      await this.global(c);
      await this.live(c, t);
      await this.done(c, t, result);
    });
  }
  async failed(t: Task, code: string, retryable: boolean, delaySeconds = 0) {
    await this.tx(async (c) => {
      await this.global(c);
      const live = (
        await c.query(
          "SELECT * FROM lg_tasks WHERE id=$1 AND state='running' AND lease_token=$2 AND lease_until>now() FOR UPDATE",
          [t.id, t.lease_token],
        )
      ).rows[0];
      if (!live) return;
      const retry = retryable && t.attempts < 5;
      const delay = Math.max(delaySeconds, Math.min(120, 2 ** t.attempts) + Math.random() * 2);
      await c.query(
        "UPDATE lg_tasks SET state=$2,error_code=$3,available_at=now()+$4*interval '1 second',lease_token=NULL,lease_until=NULL WHERE id=$1",
        [t.id, retry ? "queued" : "failed", code, delay],
      );
      if (!retry && t.run_id && t.kind !== "delivery") {
        await c.query("UPDATE lg_runs SET errors=errors+1 WHERE id=$1", [t.run_id]);
        if (t.kind === "candidate")
          await c.query("UPDATE lg_candidates SET status='failed' WHERE id=$1", [
            t.payload.candidate_id,
          ]);
      }
      if (!retry && t.kind === "profile")
        await c.query("UPDATE lg_profiles SET research_status='failed' WHERE id=$1", [
          t.payload.profile_id,
        ]);
      if (code === "BUDGET_REACHED" && t.run_id && t.kind !== "delivery") {
        await c.query(
          "UPDATE lg_runs SET status='completed_with_errors',stop_reason='budget_reached' WHERE id=$1 AND status IN ('queued','running')",
          [t.run_id],
        );
        await c.query(
          "UPDATE lg_tasks SET state='cancelled',lease_token=NULL,lease_until=NULL WHERE run_id=$1 AND kind!='delivery' AND state IN ('queued','running')",
          [t.run_id],
        );
        await c.query(
          "UPDATE lg_candidates SET status='cancelled' WHERE run_id=$1 AND status='queued'",
          [t.run_id],
        );
      }
    });
    await this.finalizeRuns();
  }
  async finalizeRuns() {
    await this.pool.query(
      "UPDATE lg_runs r SET status=CASE WHEN errors>0 OR EXISTS(SELECT 1 FROM lg_tasks t WHERE t.run_id=r.id AND t.kind!='delivery' AND t.state='failed') THEN 'completed_with_errors' ELSE 'completed' END,stop_reason='sources_exhausted' WHERE r.status IN ('queued','running') AND NOT EXISTS(SELECT 1 FROM lg_tasks t WHERE t.run_id=r.id AND t.kind!='delivery' AND t.state IN ('queued','running'))",
    );
  }
  async retryFailed(i: Identity, id: string) {
    return this.tx(async (c) => {
      await this.global(c);
      const task = (
        await c.query(
          "SELECT * FROM lg_tasks WHERE id=$1 AND workspace_id=$2 AND org_id=$3 AND execution_mode=$4 FOR UPDATE",
          [id, i.workspaceId, i.orgId, this.mode],
        )
      ).rows[0];
      if (!task) fail("Task not found", ErrorCode.NOT_FOUND);
      if (task.state !== "failed") fail("Only failed tasks can be replayed", ErrorCode.CONFLICT);
      if (task.kind !== "delivery")
        fail(
          "Start a new research run to retry research; only delivery replay is supported",
          ErrorCode.CONFLICT,
        );
      await c.query(
        "UPDATE lg_tasks SET state='queued',attempts=0,available_at=now(),error_code=NULL WHERE id=$1",
        [id],
      );
      await this.audit(
        c,
        i,
        "delivery.replayed",
        { task_id: id },
        null,
        "User requested failed delivery retry",
      );
      return { queued: true };
    });
  }
  async metrics() {
    const tasks = (
      await this.pool.query(
        "SELECT kind,state,count(*)::int AS count FROM lg_tasks GROUP BY kind,state",
      )
    ).rows;
    const runs = (
      await this.pool.query("SELECT status,count(*)::int AS count FROM lg_runs GROUP BY status")
    ).rows;
    const queue = (
      await this.pool.query(
        "SELECT COALESCE(EXTRACT(EPOCH FROM now()-MIN(created_at)),0)::float AS age FROM lg_tasks WHERE state='queued'",
      )
    ).rows[0].age;
    return { tasks, runs, oldest_queue_seconds: queue };
  }
}
