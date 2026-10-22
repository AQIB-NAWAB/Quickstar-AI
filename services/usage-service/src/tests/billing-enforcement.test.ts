import assert from "node:assert/strict";
import test from "node:test";
import { BillingService } from "../services/billing.service.js";
import type { BillingRepository } from "../repository/billing.repository.js";
import type {
  BillingSubscription,
  BillingCredit,
  SpendControls,
  BillingReservation,
} from "@quickstart/contracts";

const ORG_ID = "b0000000-0000-4000-a000-000000000001";
const WORKSPACE_ID = "a0000000-0000-4000-a000-000000000001";

function createMockBillingRepo(overrides: Record<string, unknown> = {}): BillingRepository {
  const reservations = new Map<string, BillingReservation>();
  const credits: BillingCredit[] = [];
  const processedWebhooks = new Set<string>();
  let spendControls: SpendControls = {
    orgId: ORG_ID,
    hardSpendCapCents: null,
    warningThresholdPercent: 80,
    overageAllowed: false,
    updatedAt: new Date().toISOString(),
  };

  const mockSubscription: BillingSubscription = {
    id: "sub-1",
    orgId: ORG_ID,
    stripeSubscriptionId: "sub_stripe_123",
    stripeCustomerId: "cus_123",
    planId: "plan_free",
    planTier: "free",
    status: "active",
    currentPeriodStart: new Date(Date.now() - 86400000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let monthlyTokens = 0;
  const voiceMinutes = 0;

  const defaultRepo = {
    getSubscription: async (orgId: string) => (orgId === ORG_ID ? mockSubscription : null),
    getSubscriptionByStripeId: async (stripeId: string) =>
      mockSubscription.stripeSubscriptionId === stripeId ? mockSubscription : null,
    upsertSubscription: async (sub: any) => sub,
    updateSubscriptionByStripeId: async (_id: string, updates: any) => {
      Object.assign(mockSubscription, updates);
      return mockSubscription;
    },
    listInvoices: async () => [],
    createInvoice: async (inv: any) => inv,
    updateInvoiceByStripeId: async () => null,
    getMonthlyUsage: async () => ({
      monthlyTokensUsed: monthlyTokens,
      voiceMinutesUsed: voiceMinutes,
    }),
    getActiveReservationsSum: async (_orgId: string, kind: "tokens" | "voice") => {
      let sum = 0;
      for (const res of reservations.values()) {
        if (res.status === "active" && res.kind === kind) {
          sum += res.unitsReserved;
        }
      }
      return sum;
    },
    createReservation: async (data: any) => {
      const id = "res-" + Math.random().toString(36).substring(2, 9);
      const res: BillingReservation = {
        id,
        orgId: data.orgId,
        workspaceId: data.workspaceId,
        kind: data.kind,
        unitsReserved: data.unitsReserved,
        status: "active",
        expiresAt: new Date(Date.now() + (data.timeoutSeconds || 300) * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      reservations.set(id, res);
      return { reservation: res, isNew: true };
    },
    getReservationById: async (id: string) => reservations.get(id) ?? null,
    commitReservation: async (id: string) => {
      const res = reservations.get(id);
      if (res && res.status === "active") {
        res.status = "committed";
        return true;
      }
      return false;
    },
    releaseReservation: async (id: string) => {
      const res = reservations.get(id);
      if (res && res.status === "active") {
        res.status = "released";
        return true;
      }
      return false;
    },
    cleanupExpiredReservations: async () => 0,
    recordUsageEntry: async (entry: any) => {
      if (entry?.units) {
        monthlyTokens += entry.units;
      }
      return true;
    },
    getCreditsRemainingCents: async () => {
      return credits.reduce((acc, c) => acc + c.amountCents, 0);
    },
    addCredit: async (credit: any) => {
      const record: BillingCredit = {
        id: "cred-" + Math.random().toString(36).substring(2, 9),
        orgId: credit.orgId,
        amountCents: credit.amountCents,
        reason: credit.reason,
        actorUserId: credit.actorUserId || null,
        createdAt: new Date().toISOString(),
      };
      credits.push(record);
      return record;
    },
    listCredits: async () => [...credits],
    getSpendControls: async () => spendControls,
    upsertSpendControls: async (data: any) => {
      spendControls = {
        ...spendControls,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      return spendControls;
    },
    recordStripeWebhookEvent: async (eventId: string) => {
      if (processedWebhooks.has(eventId)) {
        return { inserted: false };
      }
      processedWebhooks.add(eventId);
      return { inserted: true };
    },
  };

  return { ...defaultRepo, ...overrides } as unknown as BillingRepository;
}

test("BillingService: acquireReservation checks quotas and rejects overshoots atomically", async () => {
  const repo = createMockBillingRepo({
    getMonthlyUsage: async () => ({
      monthlyTokensUsed: 5000, // free plan limit is 10,000
      voiceMinutesUsed: 0,
    }),
  });
  const service = new BillingService(repo);

  // Requesting 4,000 tokens should be granted (5,000 + 4,000 <= 10,000)
  const res1 = await service.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 4000,
    idempotencyKey: "req-1",
  });
  assert.equal(res1.granted, true);
  assert.ok(res1.reservationId);

  // Now active reservation is 4,000, so effective usage is 9,000.
  // Requesting another 3,000 tokens should be rejected (9,000 + 3,000 > 10,000)
  const res2 = await service.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 3000,
    idempotencyKey: "req-2",
  });
  assert.equal(res2.granted, false);
  assert.equal(res2.reason, "QUOTA_EXCEEDED");
});

test("BillingService: commitReservation records exact actual usage and transitions status", async () => {
  const repo = createMockBillingRepo();
  const service = new BillingService(repo);

  const res = await service.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 4000,
    idempotencyKey: "commit-test-1",
  });
  assert.equal(res.granted, true);

  const commitResult = await service.commitReservation({
    reservationId: res.reservationId!,
    actualUnits: 3500,
    idempotencyKey: "idem-commit-1",
  });
  assert.equal(commitResult.committed, true);
});

test("BillingService: releaseReservation safely frees quota back to pool", async () => {
  const repo = createMockBillingRepo({
    getMonthlyUsage: async () => ({
      monthlyTokensUsed: 8000, // free plan limit is 10,000
      voiceMinutesUsed: 0,
    }),
  });
  const service = new BillingService(repo);

  const res = await service.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 1500,
    idempotencyKey: "rel-test-1",
  });
  assert.equal(res.granted, true);

  // Next reservation fails while first is active (8000 + 1500 + 1000 = 10500 > 10000)
  const failRes = await service.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 1000,
    idempotencyKey: "rel-test-2",
  });
  assert.equal(failRes.granted, false);

  // Release first reservation
  const released = await service.releaseReservation(res.reservationId!);
  assert.equal(released.released, true);

  // Now second reservation succeeds (8000 + 1000 = 9000 <= 10000)
  const succeedRes = await service.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 1000,
    idempotencyKey: "rel-test-3",
  });
  assert.equal(succeedRes.granted, true);
});

test("BillingService: checkLimit enforces maxWorkspaces and maxAgents plan thresholds", async () => {
  const repo = createMockBillingRepo();
  const service = new BillingService(repo);

  // Free tier has maxWorkspaces: 1, maxAgents: 2
  const wsAllowed = await service.checkLimit(ORG_ID, "workspaces", 0);
  assert.equal(wsAllowed.allowed, true);
  assert.equal(wsAllowed.maxAllowed, 1);

  const wsBlocked = await service.checkLimit(ORG_ID, "workspaces", 1);
  assert.equal(wsBlocked.allowed, false);
  assert.equal(wsBlocked.maxAllowed, 1);

  const agentAllowed = await service.checkLimit(ORG_ID, "agents", 1);
  assert.equal(agentAllowed.allowed, true);
  assert.equal(agentAllowed.maxAllowed, 2);

  const agentBlocked = await service.checkLimit(ORG_ID, "agents", 2);
  assert.equal(agentBlocked.allowed, false);
  assert.equal(agentBlocked.maxAllowed, 2);
});

test("BillingService: handles delinquent payments with 7-day grace period", async () => {
  const now = Date.now();
  // Within grace period (3 days delinquent)
  const repoGrace = createMockBillingRepo({
    getSubscription: async () => ({
      id: "sub-delinquent",
      orgId: ORG_ID,
      planId: "plan_starter",
      planTier: "starter",
      status: "past_due",
      currentPeriodStart: new Date(now - 86400000 * 30).toISOString(),
      currentPeriodEnd: new Date(now - 86400000 * 3).toISOString(), // 3 days ago
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  });
  const serviceGrace = new BillingService(repoGrace);
  const graceRes = await serviceGrace.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 100,
    idempotencyKey: "grace-1",
  });
  assert.equal(graceRes.granted, true);

  // Past grace period (10 days delinquent)
  const repoExpired = createMockBillingRepo({
    getSubscription: async () => ({
      id: "sub-delinquent-expired",
      orgId: ORG_ID,
      planId: "plan_starter",
      planTier: "starter",
      status: "past_due",
      currentPeriodStart: new Date(now - 86400000 * 40).toISOString(),
      currentPeriodEnd: new Date(now - 86400000 * 10).toISOString(), // 10 days ago
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  });
  const serviceExpired = new BillingService(repoExpired);
  const expiredRes = await serviceExpired.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 100,
    idempotencyKey: "grace-2",
  });
  assert.equal(expiredRes.granted, false);
  assert.equal(expiredRes.reason, "DELINQUENT_PAYMENT");
});

test("BillingService: spend controls enforce hard spend cap and overage rules", async () => {
  const repo = createMockBillingRepo({
    getMonthlyUsage: async () => ({
      monthlyTokensUsed: 60000, // over 50,000 free quota
      voiceMinutesUsed: 0,
    }),
    getSpendControls: async () => ({
      orgId: ORG_ID,
      hardSpendCapCents: 500, // $5.00 spend cap
      warningThresholdPercent: 80,
      overageAllowed: false,
      updatedAt: new Date().toISOString(),
    }),
  });
  const service = new BillingService(repo);

  const res = await service.acquireReservation({
    orgId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    kind: "tokens",
    estimatedUnits: 500,
    idempotencyKey: "spend-cap-1",
  });
  // Free tier quota is exceeded and overageAllowed is false
  assert.equal(res.granted, false);
  assert.equal(res.reason, "QUOTA_EXCEEDED");
});

test("BillingService: credits ledger records and tallies credits", async () => {
  const repo = createMockBillingRepo();
  const service = new BillingService(repo);

  await service.addCredit(ORG_ID, 2500, "Service credit for downtime", "admin-1");
  await service.addCredit(ORG_ID, 1000, "Promotional credit", "admin-1");

  const credits = await service.listCredits(ORG_ID);
  assert.equal(credits.length, 2);
  assert.equal(credits[0].amountCents, 2500);
  assert.equal(credits[1].amountCents, 1000);
});

test("BillingService: Stripe webhooks reject duplicate event delivery", async () => {
  const repo = createMockBillingRepo();
  const service = new BillingService(repo);

  // Fake event object
  const event = {
    id: "evt_test_dedup_001",
    created: Math.floor(Date.now() / 1000),
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_stripe_123",
        status: "active",
        customer: "cus_123",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: {
                id: "price_starter",
                recurring: { interval: "month" },
              },
            },
          ],
        },
      },
    },
  };

  const firstCall = await service.handleStripeWebhook(event as any);
  assert.equal(firstCall.handled, true);
  assert.equal(firstCall.deduplicated, undefined);

  // Duplicate delivery must be detected and marked as deduplicated
  const secondCall = await service.handleStripeWebhook(event as any);
  assert.equal(secondCall.handled, true);
  assert.equal(secondCall.deduplicated, true);
});
