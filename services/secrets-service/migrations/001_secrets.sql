-- Feature 16: Secrets Vault
-- Plaintext values never land in this table; only AES-256-GCM ciphertext.
-- key_version tracks which ENCRYPTION_KEY generation encrypted each row.
-- Rotation writes a new ciphertext + increments key_version atomically.

CREATE TABLE IF NOT EXISTS secrets (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID        NOT NULL,
  name          VARCHAR(128) NOT NULL,
  ciphertext    TEXT        NOT NULL,  -- base64(iv || authTag || ciphertext)
  key_version   INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT secrets_workspace_name_unique UNIQUE (workspace_id, name),
  CONSTRAINT secrets_name_nonempty CHECK (char_length(name) > 0),
  CONSTRAINT secrets_name_length CHECK (char_length(name) <= 128)
);

CREATE INDEX IF NOT EXISTS secrets_workspace_id_idx ON secrets (workspace_id);
