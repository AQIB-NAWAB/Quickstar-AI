import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { EmailCampaignsRepository } from "./email-campaigns.repository.js";
import { runWorkspaceMigrations } from "./migrate.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";

let pool: pg.Pool | null = null;
let repo: EmailCampaignsRepository;
const workspaceId = "00000000-0000-0000-0000-0000000000ec";
let mailboxId = "";
let campaignId = "";

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
  await pool.query(`DELETE FROM smtp_email_campaigns WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_mailboxes WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_suppressions WHERE workspace_id = $1`, [workspaceId]);

  const mailbox = await repo.createMailbox({
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId,
    email: "sender@example.com",
    firstName: "Sender",
    lastName: "Test",
    secretReferenceId: "smtp_mailbox_11111111-1111-4111-8111-111111111111",
    dailyLimit: 2,
  });
  mailboxId = mailbox.id;

  const campaign = await repo.createCampaign({
    id: "22222222-2222-4222-8222-222222222222",
    workspaceId,
    name: "Integration test campaign",
    mode: "generic",
    mailboxId,
    fromName: "Sender Test",
    subject: "Hello",
    html: "<p>Hi</p>",
    schedule: {},
    consentConfirmed: true,
  });
  campaignId = campaign.id;

  await repo.replaceRecipients(campaignId, [
    { email: "lead1@example.com", company: "Acme" },
    { email: "lead2@example.com", company: "Beta" },
    { email: "lead3@example.com", company: "Gamma" },
  ]);
  await repo.transitionStatus({
    workspaceId,
    campaignId,
    from: ["draft"],
    to: "sending",
    extra: { recipients_fixed: true },
  });
  await repo.setRecipientsPendingWithStart(campaignId, new Date(Date.now() - 1000));
});

after(async () => {
  if (!pool) return;
  await pool.query(`DELETE FROM smtp_email_campaigns WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_mailboxes WHERE workspace_id = $1`, [workspaceId]);
  await pool.query(`DELETE FROM smtp_suppressions WHERE workspace_id = $1`, [workspaceId]);
  await pool.end();
});

describe("EmailCampaignsRepository (integration, skipped without a database)", () => {
  it("claims only up to the batch size and respects leases", async () => {
    if (!pool) return;
    const first = await repo.claimRecipients(campaignId, 2, "worker-a", 60);
    assert.equal(first.length, 2);
    const second = await repo.claimRecipients(campaignId, 10, "worker-b", 60);
    assert.equal(second.length, 1, "the third recipient is still claimable");
    const firstIds = new Set(first.map((recipient) => recipient.id));
    assert.ok(
      second.every((recipient) => !firstIds.has(recipient.id)),
      "leased recipients must not be claimed by another worker",
    );
  });

  it("recovers stale leases (crash recovery)", async () => {
    if (!pool) return;
    const recipients = await repo.listRecipients(campaignId);
    const claimed = recipients.find((recipient) => recipient.claimed_by === "worker-a");
    assert.ok(claimed);
    await pool!.query(
      `UPDATE smtp_email_recipients SET lease_expires_at = now() - interval '1 minute' WHERE id = $1`,
      [claimed.id],
    );
    const recovered = await repo.claimRecipients(campaignId, 10, "worker-c", 60);
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].id, claimed.id);
  });

  it("records a send and schedules the next follow-up step", async () => {
    if (!pool) return;
    const recipients = await repo.listRecipients(campaignId);
    const target = recipients.find((recipient) => recipient.status === "pending") ?? recipients[0];
    await repo.markRecipientSent({
      recipientId: target.id,
      messageId: "msg-1",
      sentSubject: "Hello",
      sentHtml: "<p>Hi</p>",
      nextStep: 1,
      nextSendAt: new Date(Date.now() + 60_000),
    });
    const afterSend = (await repo.listRecipients(campaignId)).find((r) => r.id === target.id);
    assert.equal(afterSend?.followup_step, 1);
    assert.equal(afterSend?.status, "pending");
    assert.equal(afterSend?.sent_subject, "Hello");
    assert.ok(afterSend?.next_send_at && afterSend.next_send_at > new Date());
  });

  it("enforces the mailbox daily limit at claim time", async () => {
    if (!pool) return;
    await pool!.query(
      `UPDATE smtp_mailboxes SET sent_date = CURRENT_DATE, sent_today = 2 WHERE id = $1`,
      [mailboxId],
    );
    const claims = await repo.claimRecipients(campaignId, 10, "worker-d", 60);
    assert.equal(claims.length, 0);
    await pool!.query(`UPDATE smtp_mailboxes SET sent_date = NULL, sent_today = 0 WHERE id = $1`, [
      mailboxId,
    ]);
  });

  it("suppression list flags recipients as suppressed", async () => {
    if (!pool) return;
    const recipients = await repo.listRecipients(campaignId);
    const target = recipients.find((recipient) => recipient.status === "pending") ?? recipients[0];
    await repo.upsertSuppression(workspaceId, target.email, "opted_out");
    assert.equal(await repo.isSuppressed(workspaceId, target.email), true);
    await repo.markRecipientSuppressed(target.id, "On the workspace suppression list");
    const updated = (await repo.listRecipients(campaignId)).find((r) => r.id === target.id);
    assert.equal(updated?.status, "suppressed");
    await repo.deleteSuppression(workspaceId, target.email);
  });

  it("cancellation skips pending recipients", async () => {
    if (!pool) return;
    const skipped = await repo.skipPendingRecipients(campaignId, "Campaign cancelled");
    assert.ok(skipped >= 0);
    const counts = await repo.countRecipients(campaignId);
    assert.equal(counts.pending, 0);
    assert.equal(counts.retrying, 0);
  });
});
