-- 008_conversation_operator_queues.sql
-- Operator queues for human agent handoff and routing

CREATE TABLE IF NOT EXISTS conversation_operator_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT NULL,
  routing_strategy VARCHAR(32) NOT NULL DEFAULT 'manual_claim',
  max_wait_time_seconds INT NOT NULL DEFAULT 300,
  pause_ai_on_handoff BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_queues_workspace
  ON conversation_operator_queues (workspace_id, is_active);

CREATE TABLE IF NOT EXISTS conversation_operator_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  queue_id UUID NOT NULL REFERENCES conversation_operator_queues(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  assigned_operator_id UUID NULL,
  handoff_reason TEXT NULL,
  workflow_run_id VARCHAR(255) NULL,
  internal_note TEXT NULL,
  visitor_message TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at TIMESTAMPTZ NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_queue_items_pending
  ON conversation_operator_queue_items (queue_id, status, queued_at ASC);

CREATE INDEX IF NOT EXISTS idx_operator_queue_items_workspace_status
  ON conversation_operator_queue_items (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_queue_items_conv
  ON conversation_operator_queue_items (conversation_id);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bot_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_queue_id UUID NULL REFERENCES conversation_operator_queues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_tags
  ON conversations USING GIN (tags);
