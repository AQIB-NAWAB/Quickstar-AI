import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { EmailCampaignsRepository } from "../repository/email-campaigns.repository.js";
import { runWorkspaceMigrations } from "../repository/migrate.js";
import { EmailCampaignsService } from "./email-campaigns.service.js";
import type { SecretsClient } from "../clients/secrets.client.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";

let pool: pg.Pool | null = null;
let repo: EmailCampaignsRepository;
let service: EmailCampaignsService;
const workspaceId = "00000000-0000-0000-0000-0000000000ed";
let mailboxId = "";

/** Stub secrets client: never reaches the secrets-service in tests. */
const stubSecrets = {
  async getNamedSecret() {
    return "abcdefghijklmnop";
  },
  async storeNamedSecret() {},
  async deleteNamedSecret() {},
} as unknown as SecretsClient;

before(async () => {
  pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await pool.query("SELECT 1");
  } catch {
    pool = null;
    return;
  }
  await runWorkspaceMigrations(pool);
  repo = new EmailCampaignsRepository(pool);
  service = new EmailCampaignsService(repo, stubSecrets);
  await pool.query(`DELETE FROM smtp_email_campaigns WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_mailboxes WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_suppressions WHERE workspace_id = $1`, [workspaceId]);

  const mailbox = await repo.createMailbox({
    id: "33333333-3333-4333-8333-333333333333",
    workspaceId,
    email: "journey@example.com",
    firstName: "Journey",
    lastName: "Test",
    secretReferenceId: "smtp_mailbox_33333333-3333-4333-8333-333333333333",
    dailyLimit: 50,
  });
  mailboxId = mailbox.id;
  await repo.upsertSuppression(workspaceId, "blocked@example.com", "opted_out");
});

after(async () => {
  if (!pool) return;
  await pool.query(`DELETE FROM smtp_email_campaigns WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_mailboxes WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_suppressions WHERE workspace_id = $1`, [workspaceId]);
  await pool.end();
});

describe("EmailCampaignsService journey (integration, skipped without a database)", () => {
  it("draft → activate → pause → resume → cancel → delete", async () => {
    if (!pool) return;

    // Draft with a suppressed recipient mixed in.
    const created = await service.createCampaign(
      workspaceId,
      {
        name: "Journey campaign",
        mailboxId,
        mode: "generic",
        fromName: "Journey Sender",
        subject: "Hello there",
        html: "<p>Hello</p>",
        recipients: [
          { email: "lead1@example.com", company: "Acme" },
          { email: "blocked@example.com", company: "Blocked" },
        ],
        consentConfirmed: true,
      },
      "44444444-4444-4444-4444-444444444444",
    );
    assert.equal(created.status, "draft");
    assert.equal(created.counts.total, 2);

    // Drafts are editable; activation fixes the recipient list.
    const updated = await service.updateCampaignDraft(workspaceId, created.id, {
      subject: "Hello (edited)",
    });
    assert.equal(updated.subject, "Hello (edited)");

    const activated = await service.activateCampaign(workspaceId, created.id);
    assert.equal(activated.status, "sending");
    assert.equal(activated.recipientsFixed, true);
    assert.equal(
      activated.recipients.filter((recipient) => recipient.status === "suppressed").length,
      1,
      "suppressed recipient is flagged at activation",
    );

    const paused = await service.pauseCampaign(workspaceId, created.id);
    assert.equal(paused.status, "paused");

    const resumed = await service.resumeCampaign(workspaceId, created.id);
    assert.equal(resumed.status, "sending");

    const cancelled = await service.cancelCampaign(workspaceId, created.id, "44444444-4444-4444-4444-444444444444");
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.counts.pending, 0);
    assert.equal(cancelled.counts.skipped, 1);

    const deleted = await service.deleteCampaign(workspaceId, created.id);
    assert.equal(deleted.deleted, true);
    const gone = await repo.getCampaign(workspaceId, created.id);
    assert.equal(gone, null);
  });

  it("rejects creation without consent and activation without recipients", async () => {
    if (!pool) return;
    await assert.rejects(
      () =>
        service.createCampaign(
          workspaceId,
          {
            name: "No consent",
            mailboxId,
            mode: "generic",
            fromName: "Sender",
            subject: "Hi",
            html: "<p>Hi</p>",
            recipients: [{ email: "lead1@example.com" }],
            consentConfirmed: false,
          },
          "44444444-4444-4444-4444-444444444444",
        ),
      /consent/,
    );

    await assert.rejects(
      () =>
        service.createCampaign(
          workspaceId,
          {
            name: "No recipients",
            mailboxId,
            mode: "generic",
            fromName: "Sender",
            subject: "Hi",
            html: "<p>Hi</p>",
            recipients: [],
            consentConfirmed: true,
          },
          "44444444-4444-4444-4444-444444444444",
        ),
      /recipient/,
    );
  });

  it("schedules future starts as 'scheduled'", async () => {
    if (!pool) return;
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const created = await service.createCampaign(
      workspaceId,
      {
        name: "Scheduled campaign",
        mailboxId,
        mode: "generic",
        fromName: "Sender",
        subject: "Later",
        html: "<p>Later</p>",
        recipients: [{ email: "lead1@example.com" }],
        schedule: { sendAt: future.toISOString() },
        consentConfirmed: true,
      },
      "44444444-4444-4444-4444-444444444444",
    );
    assert.equal(created.scheduledStartAt !== null, true);
    const activated = await service.activateCampaign(workspaceId, created.id);
    assert.equal(activated.status, "scheduled");

    // The worker's promotion query picks it up when the time passes.
    const promoted = await repo.activateScheduledCampaigns();
    assert.equal(promoted.length, 0, "not due yet");
    await pool!.query(
      `UPDATE smtp_email_campaigns SET scheduled_start_at = now() - interval '1 minute' WHERE id = $1`,
      [created.id],
    );
    const promotedNow = await repo.activateScheduledCampaigns();
    assert.equal(promotedNow.some((row) => row.id === created.id), true);

    await service.cancelCampaign(workspaceId, created.id);
    await service.deleteCampaign(workspaceId, created.id);
  });
});
