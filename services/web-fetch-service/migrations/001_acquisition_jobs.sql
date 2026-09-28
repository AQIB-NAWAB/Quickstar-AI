CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS acquisition_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'crawl',
    status TEXT NOT NULL DEFAULT 'queued',
    seed_url TEXT NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    pages_fetched INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    artifact_text TEXT,
    idempotency_key TEXT NOT NULL,
    request_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_acquisition_jobs_workspace_idempotency UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_jobs_status_created
    ON acquisition_jobs (status, created_at)
    WHERE status IN ('queued', 'running');
