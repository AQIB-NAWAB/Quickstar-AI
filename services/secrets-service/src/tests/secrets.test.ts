/**
 * Feature 16 — Secrets Vault: unit tests
 *
 * Tests run without a real Postgres or Redis instance.
 * They verify the critical security invariants:
 *   1. encrypt/decrypt roundtrip correctness
 *   2. API list response never contains a 'value' or 'ciphertext' field
 *   3. Cross-workspace access returns 404 (fail-closed)
 *   4. Oversize name or value is rejected before encryption
 *   5. Wrong auth tag during decrypt throws (tamper detection)
 */
import assert from "node:assert/strict";
import test from "node:test";
import { encrypt, decrypt } from "../lib/encrypt.js";
import { SecretsService } from "../services/secrets.service.js";

// ---------- In-memory fake repository ----------
const FAKE_KEY = "a".repeat(64); // 32 zero bytes as hex — dev-only test key
const FAKE_KEY_V2 = "b".repeat(64);

type FakeRow = {
  id: string;
  workspace_id: string;
  name: string;
  ciphertext: string;
  key_version: number;
  created_at: string;
  updated_at: string;
};

function makeFakeRepo() {
  const store = new Map<string, FakeRow>();
  function key(wid: string, name: string) { return `${wid}:${name}`; }
  return {
    store,
    async listNames(workspaceId: string) {
      return [...store.values()]
        .filter((r) => r.workspace_id === workspaceId)
        .map(({ id, workspace_id, name, key_version, created_at, updated_at }) => ({
          id, workspace_id, name, key_version, created_at, updated_at,
        }));
    },
    async getByName(workspaceId: string, name: string) {
      return store.get(key(workspaceId, name)) ?? null;
    },
    async upsert(input: { workspaceId: string; name: string; ciphertext: string; keyVersion: number }) {
      const id = crypto.randomUUID();
      const row: FakeRow = {
        id,
        workspace_id: input.workspaceId,
        name: input.name,
        ciphertext: input.ciphertext,
        key_version: input.keyVersion,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.set(key(input.workspaceId, input.name), row);
      const { ciphertext: _ct, ...summary } = row;
      return summary;
    },
    async rotate(input: { workspaceId: string; name: string; newCiphertext: string; newKeyVersion: number }) {
      const existing = store.get(key(input.workspaceId, input.name));
      if (!existing) return null;
      existing.ciphertext = input.newCiphertext;
      existing.key_version = input.newKeyVersion;
      existing.updated_at = new Date().toISOString();
      const { ciphertext: _ct, ...summary } = existing;
      return summary;
    },
    async deleteByName(workspaceId: string, name: string) {
      return store.delete(key(workspaceId, name));
    },
  };
}

// ---------- AES-256-GCM encrypt/decrypt ----------

test("encrypt then decrypt returns original plaintext", () => {
  const original = "sk-live-supersecretapikey12345";
  const envelope = encrypt(original, FAKE_KEY);
  assert.notEqual(envelope, original, "envelope must not equal plaintext");
  const decrypted = decrypt(envelope, FAKE_KEY);
  assert.equal(decrypted, original);
});

test("each encrypt call produces a different IV (non-deterministic)", () => {
  const value = "same-value";
  const e1 = encrypt(value, FAKE_KEY);
  const e2 = encrypt(value, FAKE_KEY);
  assert.notEqual(e1, e2, "two encryptions must produce different envelopes due to random IV");
});

test("decrypt with wrong key throws (auth tag mismatch)", () => {
  const envelope = encrypt("secret", FAKE_KEY);
  assert.throws(() => decrypt(envelope, FAKE_KEY_V2), /Unsupported state|authentication/i);
});

test("decrypt with truncated envelope throws", () => {
  assert.throws(() => decrypt(Buffer.from("tooshort").toString("base64"), FAKE_KEY));
});

// ---------- SecretsService ----------

test("create stores ciphertext; revealValue returns original plaintext", async () => {
  const repo = makeFakeRepo();
  const svc = new SecretsService(repo as never, FAKE_KEY, 1);
  const ws = "00000000-0000-4000-8000-000000000001";

  await svc.create(ws, { name: "OPENAI_KEY", value: "sk-live-abc123" });
  const revealed = await svc.revealValue(ws, "OPENAI_KEY");
  assert.equal(revealed, "sk-live-abc123");
});

test("listNames response contains no ciphertext or value field", async () => {
  const repo = makeFakeRepo();
  const svc = new SecretsService(repo as never, FAKE_KEY, 1);
  const ws = "00000000-0000-4000-8000-000000000001";

  await svc.create(ws, { name: "STRIPE_KEY", value: "sk_live_xxx" });
  const list = await svc.listNames(ws);
  assert.equal(list.length, 1);
  const item = list[0]!;
  assert.ok(!("value" in item), "list item must not contain 'value' field");
  assert.ok(!("ciphertext" in item), "list item must not contain 'ciphertext' field");
  assert.equal(item.name, "STRIPE_KEY");
});

test("cross-workspace access returns NOT_FOUND (fail-closed)", async () => {
  const repo = makeFakeRepo();
  const svc = new SecretsService(repo as never, FAKE_KEY, 1);
  const wsA = "00000000-0000-4000-8000-0000000000a1";
  const wsB = "00000000-0000-4000-8000-0000000000b2";

  await svc.create(wsA, { name: "MY_KEY", value: "value-a" });

  await assert.rejects(
    () => svc.revealValue(wsB, "MY_KEY"),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /not found/i);
      return true;
    },
  );
});

test("oversize name is rejected before encryption", async () => {
  const repo = makeFakeRepo();
  const svc = new SecretsService(repo as never, FAKE_KEY, 1);
  const ws = "00000000-0000-4000-8000-000000000001";
  const longName = "x".repeat(129);

  await assert.rejects(
    () => svc.create(ws, { name: longName, value: "val" }),
    /must not exceed 128/i,
  );
});

test("oversize value is rejected before encryption", async () => {
  const repo = makeFakeRepo();
  const svc = new SecretsService(repo as never, FAKE_KEY, 1);
  const ws = "00000000-0000-4000-8000-000000000001";
  const bigValue = "v".repeat(8193);

  await assert.rejects(
    () => svc.create(ws, { name: "BIG", value: bigValue }),
    /must not exceed 8192 bytes/i,
  );
});

test("rotate re-encrypts with new key; reveal with new key succeeds", async () => {
  const repo = makeFakeRepo();
  const svc = new SecretsService(repo as never, FAKE_KEY, 1);
  const ws = "00000000-0000-4000-8000-000000000001";

  await svc.create(ws, { name: "API_KEY", value: "original-value" });

  // Simulate rotation: service re-created with new key
  const svcV2 = new SecretsService(repo as never, FAKE_KEY_V2, 2);

  // Use the old-key service to rotate (reads with old key, writes with new key)
  await svc.rotate(ws, "API_KEY", FAKE_KEY_V2, 2);

  // Reveal with new-key service
  const revealed = await svcV2.revealValue(ws, "API_KEY");
  assert.equal(revealed, "original-value");
});
