CREATE TABLE IF NOT EXISTS lg_control (
 id integer PRIMARY KEY CHECK(id=1), version integer NOT NULL DEFAULT 1,
 global_active_limit integer NOT NULL DEFAULT 16 CHECK(global_active_limit BETWEEN 1 AND 100),
 default_policy jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS lg_tiers (
 name text PRIMARY KEY, version integer NOT NULL DEFAULT 1, policy jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS lg_tenants (
 org_id uuid PRIMARY KEY, policy jsonb, policy_version integer NOT NULL DEFAULT 1,
 tier_name text REFERENCES lg_tiers(name),
 virtual_finish double precision NOT NULL DEFAULT 0,
 api_minute timestamptz, api_count integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lg_audit (
 id bigserial PRIMARY KEY, org_id uuid, workspace_id uuid, actor_id text NOT NULL,
 action text NOT NULL, previous jsonb, next jsonb, reason text NOT NULL,
 request_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lg_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES lg_tenants(org_id),
 workspace_id uuid NOT NULL, version integer NOT NULL, supplied jsonb NOT NULL,
 execution_mode text NOT NULL CHECK(execution_mode IN ('live','demo')),
 researched jsonb, research_status text NOT NULL DEFAULT 'queued', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,execution_mode,version)
);
CREATE TABLE IF NOT EXISTS lg_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES lg_tenants(org_id),
 workspace_id uuid NOT NULL, profile_id uuid NOT NULL REFERENCES lg_profiles(id),
 brief jsonb NOT NULL, profile_snapshot jsonb NOT NULL, policy_snapshot jsonb NOT NULL, policy_version text NOT NULL,
 status text NOT NULL DEFAULT 'queued', stop_reason text,
 execution_mode text NOT NULL CHECK(execution_mode IN ('live','demo')),
 idempotency_key text NOT NULL, request_hash text NOT NULL, request_id text NOT NULL,
 rounds integer NOT NULL DEFAULT 0, accepted integer NOT NULL DEFAULT 0, errors integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), deadline_at timestamptz NOT NULL,
 UNIQUE(workspace_id,execution_mode,idempotency_key)
);
CREATE TABLE IF NOT EXISTS lg_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES lg_runs(id),
 workspace_id uuid NOT NULL, domain text NOT NULL, url text NOT NULL, category text NOT NULL,
 status text NOT NULL DEFAULT 'queued', assessment jsonb, UNIQUE(run_id,domain)
);
CREATE TABLE IF NOT EXISTS lg_leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL, workspace_id uuid NOT NULL,
 domain text NOT NULL, execution_mode text NOT NULL CHECK(execution_mode IN ('live','demo')), data jsonb NOT NULL, checked_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,domain,execution_mode)
);
CREATE TABLE IF NOT EXISTS lg_run_leads (
 run_id uuid NOT NULL REFERENCES lg_runs(id), lead_id uuid NOT NULL REFERENCES lg_leads(id),
 data_snapshot jsonb NOT NULL, PRIMARY KEY(run_id,lead_id)
);
CREATE TABLE IF NOT EXISTS lg_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES lg_tenants(org_id),
 workspace_id uuid NOT NULL, run_id uuid REFERENCES lg_runs(id),
 kind text NOT NULL CHECK(kind IN ('profile','search','candidate','delivery')),
 execution_mode text NOT NULL CHECK(execution_mode IN ('live','demo')),
 payload jsonb NOT NULL, dedup_key text NOT NULL, request_id text NOT NULL,
 state text NOT NULL DEFAULT 'queued', attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
 error_code text, result jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,dedup_key)
);
CREATE INDEX IF NOT EXISTS lg_tasks_dispatch ON lg_tasks(org_id,available_at,created_at) WHERE state IN ('queued','running');
CREATE INDEX IF NOT EXISTS lg_runs_workspace ON lg_runs(workspace_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS lg_candidates_run ON lg_candidates(run_id,id);
CREATE INDEX IF NOT EXISTS lg_leads_workspace ON lg_leads(workspace_id,id);
CREATE TABLE IF NOT EXISTS lg_usage_daily (
 org_id uuid NOT NULL, day date NOT NULL, runs integer NOT NULL DEFAULT 0,
 units bigint NOT NULL DEFAULT 0, tokens bigint NOT NULL DEFAULT 0,
 PRIMARY KEY(org_id,day)
);
CREATE TABLE IF NOT EXISTS lg_usage_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES lg_tasks(id),
 org_id uuid NOT NULL, day date NOT NULL, action text NOT NULL,
 policy_version text NOT NULL, reserved_tokens integer NOT NULL, actual_tokens integer,
 state text NOT NULL DEFAULT 'reserved', created_at timestamptz NOT NULL DEFAULT now()
);
