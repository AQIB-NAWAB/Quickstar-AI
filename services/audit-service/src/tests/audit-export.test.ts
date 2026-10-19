import assert from "node:assert/strict";
import test from "node:test";
import { AppError, ErrorCode } from "@quickstart/errors";
import { AuditService } from "../services/audit.service.js";
import type { AuditRepository } from "../repository/audit.repository.js";
import type { AuditEntryRow } from "../domain/types.js";

const VALID_WORKSPACE = "a0000000-0000-4000-a000-000000000001";
const OTHER_WORKSPACE = "b0000000-0000-4000-a000-000000000002";

function createMockRepository(rows: AuditEntryRow[] = []): AuditRepository {
  return {
    listByWorkspace: async (_wsId: string, _opts: any) => ({
      rows: rows.filter((r) => r.workspace_id === _wsId),
      total: rows.filter((r) => r.workspace_id === _wsId).length,
    }),
    findById: async (wsId: string, entryId: string) => {
      return rows.find((r) => r.workspace_id === wsId && r.id === entryId) ?? null;
    },
    exportByWorkspace: async (wsId: string, _opts: any) => {
      return rows.filter((r) => r.workspace_id === wsId);
    },
  } as unknown as AuditRepository;
}

test("AuditService rejects invalid workspace UUID", async () => {
  const service = new AuditService(createMockRepository(), {
    defaultListDays: 7,
    maxListDays: 90,
  });

  await assert.rejects(
    async () => service.list("invalid-uuid", {}),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.VALIDATION_FAILED);
      return true;
    },
  );

  await assert.rejects(
    async () => service.getById("invalid-uuid", "some-id"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.VALIDATION_FAILED);
      return true;
    },
  );
});

test("AuditService enforces date boundaries (from < to, max 90 days)", async () => {
  const service = new AuditService(createMockRepository(), {
    defaultListDays: 7,
    maxListDays: 90,
  });

  // from >= to
  await assert.rejects(
    async () =>
      service.list(VALID_WORKSPACE, {
        from: "2026-05-10T00:00:00Z",
        to: "2026-05-01T00:00:00Z",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.VALIDATION_FAILED);
      assert.match(err.message, /from must be before to/);
      return true;
    },
  );

  // range > 90 days
  await assert.rejects(
    async () =>
      service.list(VALID_WORKSPACE, {
        from: "2026-01-01T00:00:00Z",
        to: "2026-06-01T00:00:00Z",
      }),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.VALIDATION_FAILED);
      assert.match(err.message, /Time range cannot exceed 90 days/);
      return true;
    },
  );
});

test("AuditService getById returns entry or throws NOT_FOUND", async () => {
  const mockRow: AuditEntryRow = {
    id: "entry-123",
    workspace_id: VALID_WORKSPACE,
    org_id: "org-1",
    actor_user_id: "user-1",
    actor_name: "Sarah Chen",
    actor_email: "sarah@example.com",
    actor_role: "Workspace Admin",
    action: "agent.update",
    target_type: "agent",
    target_id: "agent-1",
    request_id: "req-1",
    origin_ip: "192.0.2.1",
    country_code: "US",
    city: "San Francisco",
    user_agent: "Mozilla/5.0",
    changes: { before: { model: "gpt-3.5" }, after: { model: "claude-3-5" } },
    metadata: { env: "prod" },
    created_at: new Date("2026-05-01T12:00:00Z"),
  };

  const service = new AuditService(createMockRepository([mockRow]), {
    defaultListDays: 7,
    maxListDays: 90,
  });

  const entry = await service.getById(VALID_WORKSPACE, "entry-123");
  assert.equal(entry.id, "entry-123");
  assert.equal(entry.actor_name, "Sarah Chen");
  assert.equal(entry.action, "agent.update");
  assert.deepEqual(entry.changes, { before: { model: "gpt-3.5" }, after: { model: "claude-3-5" } });

  // Cross-workspace isolation (requesting entry from a different workspace)
  await assert.rejects(
    async () => service.getById(OTHER_WORKSPACE, "entry-123"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, ErrorCode.NOT_FOUND);
      return true;
    },
  );
});

test("AuditService exportCsv sanitizes formula injection attacks and applies UTF-8 BOM", async () => {
  const maliciousRows: AuditEntryRow[] = [
    {
      id: "entry-malicious-1",
      workspace_id: VALID_WORKSPACE,
      org_id: "org-1",
      actor_user_id: "user-attacker",
      actor_name: "=cmd|' /C calc'!A0",
      actor_email: "+1234567890",
      actor_role: "-minusRole",
      action: "@SUM(A1:A10)",
      target_type: "\ttabPrefix",
      target_id: "\rcarriageReturn",
      request_id: "req-with,comma",
      origin_ip: 'quoted"ip',
      country_code: "US",
      city: "New, York",
      user_agent: "Safe UA",
      changes: null,
      metadata: {},
      created_at: new Date("2026-05-01T12:00:00Z"),
    },
  ];

  const service = new AuditService(createMockRepository(maliciousRows), {
    defaultListDays: 7,
    maxListDays: 90,
  });

  const csv = await service.exportCsv(VALID_WORKSPACE, {
    from: "2026-05-01T00:00:00Z",
    to: "2026-05-02T00:00:00Z",
  });

  // 1. Starts with UTF-8 BOM
  assert.ok(csv.startsWith("\uFEFF"), "CSV output must start with UTF-8 BOM");

  // 2. Contains RFC-4180 headers
  const content = csv.slice(1);
  const [headerLine, dataLine] = content.split("\r\n");
  assert.ok(headerLine.includes("timestamp_utc"));
  assert.ok(headerLine.includes("actor_name"));
  assert.ok(headerLine.includes("action"));

  // 3. Formula injection cells escaped with leading single quote:
  // =cmd -> '=cmd
  assert.ok(dataLine.includes("'=cmd"), "Equal formula prefix must be neutralized with leading quote");
  // +1234 -> '+1234
  assert.ok(dataLine.includes("'+1234567890"), "Plus formula prefix must be neutralized with leading quote");
  // -minusRole -> '-minusRole
  assert.ok(dataLine.includes("'-minusRole"), "Minus formula prefix must be neutralized with leading quote");
  // @SUM -> '@SUM
  assert.ok(dataLine.includes("'@SUM"), "At sign formula prefix must be neutralized with leading quote");
  // \ttab -> '\ttab
  assert.ok(dataLine.includes("'\ttab"), "Tab formula prefix must be neutralized with leading quote");
  // \r -> '\r
  assert.ok(dataLine.includes("'\r"), "Carriage return formula prefix must be neutralized with leading quote");

  // 4. RFC-4180 commas and double quotes escaped
  assert.ok(dataLine.includes('"req-with,comma"'), "Comma field must be quoted");
  assert.ok(dataLine.includes('"quoted""ip"'), "Double quotes inside field must be doubled");
  assert.ok(dataLine.includes('"New, York"'), "City with comma must be quoted");
});
