#!/usr/bin/env node
/**
 * Inbound numbers proof (no external credentials required).
 *
 * Covers: Telnyx inventory search → purchase → LiveKit provisioning →
 * workspace list → agent assignment → inbound route resolution → release to
 * pool → re-claim → release at provider, plus the number-order webhook.
 *
 * Usage:
 *   pnpm --filter @quickstart/service-voice build
 *   node scripts/check-voice-inbound-numbers-proof.mjs
 */
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import console from "node:console";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "services/voice-service/dist");

const logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return logger;
  },
};

async function load(relative) {
  return import(pathToFileURL(path.join(dist, relative)).href);
}

async function main() {
  const { MemoryPhoneNumbersRepository } = await load(
    "repository/phone-numbers.repository.js",
  );
  const { PhoneNumbersService } = await load("services/phone-numbers.service.js");
  const { FakeTelnyxClient } = await load("telephony/telnyx/fake-client.js");
  const { FakeSipProvisioner, numberIdFromRoomName } = await load(
    "telephony/livekit/sip-provisioner.js",
  );

  const WS = "11111111-1111-4111-8111-111111111111";
  const repo = new MemoryPhoneNumbersRepository();
  const telnyx = new FakeTelnyxClient();
  const provisioner = new FakeSipProvisioner();
  const service = new PhoneNumbersService({
    repo,
    telnyx,
    provisioner,
    connectionName: "Proof Inbound",
    logger,
    orderPollAttempts: 1,
    orderPollIntervalMs: 0,
  });

  const report = {
    search: false,
    sync_pool: false,
    purchase: false,
    provisioned: false,
    list: false,
    assign: false,
    resolve_inbound: false,
    room_name: false,
    release_pool: false,
    re_claim: false,
    release_provider: false,
    webhook: false,
    ok: false,
  };

  const search = await service.searchAvailable(WS, { area_code: "415", limit: 4 });
  assert.ok(search.numbers.length > 0);
  report.search = true;
  console.log("PASS: Telnyx inventory search");

  await service.syncOwnedNumbers();
  const pool = await service.listPool();
  assert.equal(pool.length, 3);
  report.sync_pool = true;
  console.log("PASS: platform pool sync");

  const number = await service.purchase(WS, {
    e164: search.numbers[0].phone_number,
    agent_id: "agent-proof",
    friendly_name: "Proof line",
  });
  assert.equal(number.workspace_id, WS);
  assert.equal(number.status, "active");
  assert.equal(number.assigned_agent_id, "agent-proof");
  report.purchase = true;
  console.log("PASS: purchase");

  assert.ok(number.livekit_trunk_id);
  assert.ok(number.livekit_dispatch_rule_id);
  assert.equal(number.provisioning_error, null);
  report.provisioned = true;
  console.log("PASS: LiveKit trunk + dispatch rule provisioned");

  const list = await service.list(WS);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, number.id);
  report.list = true;
  console.log("PASS: workspace number list");

  const assigned = await service.assign(WS, number.id, {
    assigned_agent_id: "agent-proof-2",
  });
  assert.equal(assigned.assigned_agent_id, "agent-proof-2");
  report.assign = true;
  console.log("PASS: agent assignment");

  const route = await service.resolveInbound(number.phone_number);
  assert.equal(route?.workspaceId, WS);
  assert.equal(route?.agentId, "agent-proof-2");
  report.resolve_inbound = true;
  console.log("PASS: inbound number resolution");

  const roomName = `${route.roomPrefix}proof123`;
  assert.equal(numberIdFromRoomName(roomName), number.id);
  report.room_name = true;
  console.log("PASS: room name → number id");

  const pooled = await service.release(WS, number.id, "pool");
  assert.equal(pooled.workspace_id, null);
  assert.equal(pooled.livekit_trunk_id, null);
  assert.equal(await service.resolveInbound(number.phone_number), null);
  report.release_pool = true;
  console.log("PASS: release to platform pool");

  const reclaimed = await service.purchase(WS, {
    e164: number.phone_number,
    agent_id: "agent-proof-3",
  });
  assert.equal(reclaimed.workspace_id, WS);
  assert.equal(reclaimed.status, "active");
  report.re_claim = true;
  console.log("PASS: re-claim pooled number");

  const released = await service.release(WS, number.id, "provider");
  assert.equal(released.status, "released");
  assert.equal(released.released_at === null, false);
  report.release_provider = true;
  console.log("PASS: release at provider");

  await repo.create({
    workspaceId: WS,
    phoneNumber: "+14155550999",
    provider: "telnyx",
    status: "provisioning",
    inboundStatus: "provisioning",
  });
  const handled = await service.handleTelnyxEvent({
    data: {
      event_type: "number_order.completed",
      payload: { phone_numbers: [{ phone_number: "+14155550999" }] },
    },
  });
  const webhookRow = await repo.getByE164("+14155550999");
  assert.equal(handled.handled, true);
  assert.equal(webhookRow?.status, "active");
  report.webhook = true;
  console.log("PASS: Telnyx number-order webhook reconciliation");

  report.ok = Object.entries(report)
    .filter(([key]) => key !== "ok")
    .every(([, value]) => value === true);
  console.log(JSON.stringify(report));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
