import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { CampaignRecord, CampaignTarget } from "../domain/types.js";
import { VoiceDialAdapter } from "./voice-dial-adapter.js";

const WS = "11111111-1111-4111-8111-111111111111";
const AGENT = "33333333-3333-4333-8333-333333333333";

function fakeCampaign(): CampaignRecord {
  return {
    id: randomUUID(),
    workspaceId: WS,
    name: "Test",
    description: null,
    agentId: AGENT,
    agentName: "Agent",
    status: "running",
    audienceSchema: [],
    schedule: {
      startDate: "2026-01-01",
      startTime: "09:00",
      timezone: "UTC",
      dailyWindowFrom: "09:00",
      dailyWindowTo: "17:00",
    },
    pacing: { maxConcurrentCalls: 5, maxCallStartsPerMinute: 30 },
    retryPolicy: {
      maxRetries: 0,
      retryIntervalMinutes: 30,
      eligibleOutcomes: [],
    },
    idempotencyKey: null,
    version: 1,
    scheduledStart: null,
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fakeTarget(campaignId: string): CampaignTarget {
  return {
    id: randomUUID(),
    workspaceId: WS,
    campaignId,
    dialAddress: "+15551212",
    dialNormalized: "+15551212",
    displayName: null,
    email: null,
    attributes: {},
    sourceKind: "api",
    sourceRef: null,
    status: "calling",
    attemptsCount: 0,
    lastAttemptAt: null,
    nextAttemptAt: null,
    outcome: null,
    claimedAt: new Date(),
    claimedBy: "worker-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("VoiceDialAdapter creates conversation and returns real call_id from simulate", async () => {
  const convId = randomUUID();
  const callId = randomUUID();
  const urls: string[] = [];
  const adapter = new VoiceDialAdapter({
    voiceUrl: "http://voice.test",
    conversationUrl: "http://conversation.test",
    internalToken: "a".repeat(32),
    fetchImpl: async (input, init) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/widget/conversations")) {
        assert.equal(init?.method, "POST");
        return new Response(JSON.stringify({ conversation: { id: convId } }), { status: 201 });
      }
      if (url.includes("/voice/simulate")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          conversation_id: string;
          direction: string;
        };
        assert.equal(body.conversation_id, convId);
        assert.equal(body.direction, "outbound");
        return new Response(
          JSON.stringify({
            result: {
              call_id: callId,
              state: "completed",
              timings: { total_ms: 1200 },
            },
          }),
          { status: 201 },
        );
      }
      return new Response("not found", { status: 404 });
    },
  });

  const campaign = fakeCampaign();
  const result = await adapter.dial(fakeTarget(campaign.id), campaign);
  assert.equal(result.status, "answered");
  assert.equal(result.callId, callId);
  assert.ok(!String(result.callId).startsWith("stub-"));
  assert.ok(urls.some((u) => u.includes("conversation.test")));
  assert.ok(urls.some((u) => u.includes("voice.test")));
});

test("VoiceDialAdapter maps voice failure to dial_error", async () => {
  const adapter = new VoiceDialAdapter({
    voiceUrl: "http://voice.test",
    conversationUrl: "http://conversation.test",
    internalToken: "a".repeat(32),
    fetchImpl: async (input) => {
      const url = String(input);
      if (url.includes("/widget/conversations")) {
        return new Response(JSON.stringify({ conversation: { id: randomUUID() } }), {
          status: 201,
        });
      }
      return new Response("upstream down", { status: 503 });
    },
  });
  const campaign = fakeCampaign();
  const result = await adapter.dial(fakeTarget(campaign.id), campaign);
  assert.equal(result.status, "failed");
  assert.equal(result.outcome, "dial_error");
  assert.equal(result.callId, null);
});
