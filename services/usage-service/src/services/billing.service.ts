import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  BillingInvoice,
  BillingPlan,
  BillingPlanInterval,
  BillingPlanTier,
  BillingSubscription,
  BillingSubscriptionStatus,
  BillingSummaryResponse,
  CancelSubscriptionRequest,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionRequest,
  CreateCustomerPortalSessionResponse,
  OrganizationEntitlements,
} from "@quickstart/contracts";
import type { BillingRepository } from "../repository/billing.repository.js";

export const DEFAULT_PLANS: BillingPlan[] = [
  {
    id: "plan_free",
    tier: "free",
    name: "Free Community",
    description: "Essential tools to explore conversational AI and test agents.",
    priceCents: 0,
    currency: "usd",
    interval: "month",
    features: [
      { key: "tokens", name: "10,000 Monthly Tokens", included: true, limit: 10_000, unit: "tokens" },
      { key: "voice", name: "30 Voice Telephony Minutes", included: true, limit: 30, unit: "minutes" },
      { key: "agents", name: "Up to 2 Active Agents", included: true, limit: 2, unit: "agents" },
      { key: "workspaces", name: "1 Workspace", included: true, limit: 1, unit: "workspaces" },
      { key: "custom_tools", name: "Custom Tool Definitions", included: false },
      { key: "priority_support", name: "Priority SLA Support", included: false },
    ],
    limits: {
      monthlyTurns: 200,
      monthlyTokens: 10_000,
      voiceMinutes: 30,
      maxAgents: 2,
      maxWorkspaces: 1,
      maxSeats: 2,
    },
    isActive: true,
  },
  {
    id: "plan_starter",
    tier: "starter",
    name: "Starter Pro",
    description: "For small teams scaling active outreach and automated service.",
    priceCents: 4900,
    currency: "usd",
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "price_starter_monthly",
    features: [
      { key: "tokens", name: "500,000 Monthly Tokens", included: true, limit: 500_000, unit: "tokens" },
      { key: "voice", name: "200 Voice Telephony Minutes", included: true, limit: 200, unit: "minutes" },
      { key: "agents", name: "Up to 5 Active Agents", included: true, limit: 5, unit: "agents" },
      { key: "workspaces", name: "Up to 3 Workspaces", included: true, limit: 3, unit: "workspaces" },
      { key: "custom_tools", name: "Custom Tool Definitions", included: true },
      { key: "priority_support", name: "Email Support (24h)", included: true },
    ],
    limits: {
      monthlyTurns: 5_000,
      monthlyTokens: 500_000,
      voiceMinutes: 200,
      maxAgents: 5,
      maxWorkspaces: 3,
      maxSeats: 5,
    },
    isActive: true,
  },
  {
    id: "plan_growth",
    tier: "growth",
    name: "Growth Enterprise",
    description: "High-volume multichannel workflows with advanced telephony and integrations.",
    priceCents: 19900,
    currency: "usd",
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? "price_growth_monthly",
    features: [
      { key: "tokens", name: "3,000,000 Monthly Tokens", included: true, limit: 3_000_000, unit: "tokens" },
      { key: "voice", name: "1,000 Voice Telephony Minutes", included: true, limit: 1_000, unit: "minutes" },
      { key: "agents", name: "Up to 20 Active Agents", included: true, limit: 20, unit: "agents" },
      { key: "workspaces", name: "Up to 10 Workspaces", included: true, limit: 10, unit: "workspaces" },
      { key: "custom_tools", name: "Custom Tool Definitions", included: true },
      { key: "priority_support", name: "Priority Support (4h SLA)", included: true },
    ],
    limits: {
      monthlyTurns: 30_000,
      monthlyTokens: 3_000_000,
      voiceMinutes: 1_000,
      maxAgents: 20,
      maxWorkspaces: 10,
      maxSeats: 25,
    },
    highlighted: true,
    isActive: true,
  },
  {
    id: "plan_enterprise",
    tier: "enterprise",
    name: "Custom Enterprise",
    description: "Dedicated infrastructure, custom SLAs, and high-concurrency SIP trunking.",
    priceCents: 99900,
    currency: "usd",
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? "price_enterprise_monthly",
    features: [
      { key: "tokens", name: "Unlimited / Custom Quota", included: true, limit: null },
      { key: "voice", name: "10,000+ Voice Telephony Minutes", included: true, limit: 10_000, unit: "minutes" },
      { key: "agents", name: "Unlimited Agents", included: true, limit: null },
      { key: "workspaces", name: "Unlimited Workspaces", included: true, limit: null },
      { key: "custom_tools", name: "Private Custom Tool VPC", included: true },
      { key: "priority_support", name: "Dedicated Account Manager & 99.9% SLA", included: true },
    ],
    limits: {
      monthlyTurns: 200_000,
      monthlyTokens: 25_000_000,
      voiceMinutes: 10_000,
      maxAgents: 100,
      maxWorkspaces: 50,
      maxSeats: 100,
    },
    isActive: true,
  },
];

export class BillingService {
  private readonly stripeSecretKey?: string;
  private readonly stripeWebhookSecret?: string;

  constructor(
    private readonly repo: BillingRepository,
    options?: {
      stripeSecretKey?: string;
      stripeWebhookSecret?: string;
    },
  ) {
    this.stripeSecretKey = options?.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
    this.stripeWebhookSecret = options?.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
  }

  isStripeConfigured(): boolean {
    return Boolean(this.stripeSecretKey && this.stripeSecretKey.startsWith("sk_"));
  }

  async getBillingSummary(orgId: string): Promise<BillingSummaryResponse> {
    let sub = await this.repo.getSubscription(orgId);
    if (!sub) {
      // Default initial subscription on free tier
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      sub = await this.repo.upsertSubscription({
        orgId,
        planId: "plan_free",
        planTier: "free",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: end,
      });
    }

    const currentPlan =
      DEFAULT_PLANS.find((p) => p.id === sub?.planId || p.tier === sub?.planTier) ??
      DEFAULT_PLANS[0];

    const periodStart = new Date(sub.currentPeriodStart);
    const usage = await this.repo.getMonthlyUsage(orgId, periodStart);
    const invoices = await this.repo.listInvoices(orgId, 5);

    const isDelinquent = sub.status === "past_due" || sub.status === "unpaid";

    const entitlements: OrganizationEntitlements = {
      orgId,
      planTier: sub.planTier,
      status: sub.status,
      canCreateAgent: sub.status === "active" || sub.status === "trialing",
      canCreateWorkspace: sub.planTier !== "free",
      canMakeOutboundCalls: sub.status === "active" && !isDelinquent,
      canUseCustomTools: sub.planTier === "growth" || sub.planTier === "enterprise",
      canExportData: sub.status === "active",
      maxAgents: currentPlan.limits.maxAgents,
      currentAgentsCount: 1, // baseline
      monthlyTokensQuota: currentPlan.limits.monthlyTokens,
      monthlyTokensUsed: usage.monthlyTokensUsed,
      voiceMinutesQuota: currentPlan.limits.voiceMinutes,
      voiceMinutesUsed: usage.voiceMinutesUsed,
      isDelinquent,
      gracePeriodEndsAt: isDelinquent ? sub.currentPeriodEnd : null,
    };

    return {
      orgId,
      subscription: sub,
      currentPlan,
      availablePlans: DEFAULT_PLANS,
      entitlements,
      recentInvoices: invoices,
      stripeConfigured: this.isStripeConfigured(),
      setupRequiredMessage: !this.isStripeConfigured()
        ? "Stripe API keys are not configured. Running in sandbox simulated billing mode."
        : undefined,
    };
  }

  async createCheckoutSession(
    req: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    const plan = DEFAULT_PLANS.find((p) => p.id === req.planId);
    if (!plan) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Selected plan not found" });
    }

    if (!this.isStripeConfigured()) {
      // Sandbox mode: immediately activate subscription and return test success URL
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await this.repo.upsertSubscription({
        orgId: req.orgId,
        planId: plan.id,
        planTier: plan.tier,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: end,
        stripeCustomerId: `cus_simulated_${req.orgId.slice(0, 8)}`,
        stripeSubscriptionId: `sub_simulated_${Date.now()}`,
      });

      return {
        sessionId: `cs_test_${Date.now()}`,
        checkoutUrl: `${req.successUrl}?session_id=cs_test_${Date.now()}`,
      };
    }

    // Real Stripe Checkout API invocation
    const priceId = plan.stripePriceId;
    if (!priceId) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Plan ${plan.name} has no configured Stripe Price ID`,
      });
    }

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", req.successUrl);
    params.append("cancel_url", req.cancelUrl);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("client_reference_id", req.orgId);
    params.append("metadata[org_id]", req.orgId);
    params.append("metadata[plan_id]", plan.id);
    params.append("metadata[plan_tier]", plan.tier);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.stripeSecretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const body = (await stripeRes.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!stripeRes.ok || !body.url || !body.id) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Stripe checkout error: ${body.error?.message ?? "unknown error"}`,
      });
    }

    return {
      sessionId: body.id,
      checkoutUrl: body.url,
    };
  }

  async createCustomerPortalSession(
    req: CreateCustomerPortalSessionRequest,
  ): Promise<CreateCustomerPortalSessionResponse> {
    const sub = await this.repo.getSubscription(req.orgId);
    if (!sub?.stripeCustomerId) {
      if (!this.isStripeConfigured()) {
        return { portalUrl: req.returnUrl };
      }
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "No active Stripe customer found for organization",
      });
    }

    if (!this.isStripeConfigured()) {
      return { portalUrl: `${req.returnUrl}?simulated_portal=true` };
    }

    const params = new URLSearchParams();
    params.append("customer", sub.stripeCustomerId);
    params.append("return_url", req.returnUrl);

    const stripeRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.stripeSecretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const body = (await stripeRes.json()) as { url?: string; error?: { message?: string } };
    if (!stripeRes.ok || !body.url) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Stripe portal error: ${body.error?.message ?? "unknown error"}`,
      });
    }

    return { portalUrl: body.url };
  }

  async cancelSubscription(req: CancelSubscriptionRequest): Promise<BillingSubscription> {
    const sub = await this.repo.getSubscription(req.orgId);
    if (!sub) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Subscription not found" });
    }

    if (sub.stripeSubscriptionId && this.isStripeConfigured()) {
      const url = `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripeSubscriptionId)}`;
      if (req.immediately) {
        await fetch(url, {
          method: "DELETE",
          headers: { authorization: `Bearer ${this.stripeSecretKey}` },
        });
      } else {
        const params = new URLSearchParams();
        params.append("cancel_at_period_end", "true");
        await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.stripeSecretKey}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
      }
    }

    const updated = await this.repo.upsertSubscription({
      orgId: req.orgId,
      planId: req.immediately ? "plan_free" : sub.planId,
      planTier: req.immediately ? "free" : sub.planTier,
      status: req.immediately ? "canceled" : sub.status,
      currentPeriodStart: new Date(sub.currentPeriodStart),
      currentPeriodEnd: new Date(sub.currentPeriodEnd),
      cancelAtPeriodEnd: !req.immediately,
      canceledAt: new Date(),
    });

    return updated;
  }

  /**
   * Timing-safe verification of Stripe webhook signature.
   * Format: t=1492774577,v1=5257a869e7ecebeda32affa62cd4...
   */
  verifyWebhookSignature(signatureHeader: string | undefined, rawPayload: string): boolean {
    if (!this.stripeWebhookSecret) {
      // In dev sandbox when webhook secret is omitted, accept
      return true;
    }
    if (!signatureHeader) return false;

    const parts = signatureHeader.split(",");
    let timestamp = "";
    let signature = "";
    for (const part of parts) {
      const [k, v] = part.split("=");
      if (k === "t") timestamp = v;
      if (k === "v1") signature = v;
    }

    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${rawPayload}`;
    const expected = createHmac("sha256", this.stripeWebhookSecret)
      .update(signedPayload, "utf8")
      .digest("hex");

    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  }

  async handleStripeWebhook(event: Record<string, unknown>): Promise<{ handled: boolean; event: string }> {
    const eventType = String(event.type ?? "");
    const data = (event.data as { object?: Record<string, unknown> })?.object ?? {};

    switch (eventType) {
      case "checkout.session.completed": {
        const orgId = String(
          (data.metadata as Record<string, unknown>)?.org_id ??
          data.client_reference_id ??
          "",
        );
        const planId = String((data.metadata as Record<string, unknown>)?.plan_id ?? "plan_starter");
        const planTier = (data.metadata as Record<string, unknown>)?.plan_tier as BillingPlanTier ?? "starter";
        const stripeCustomerId = String(data.customer ?? "");
        const stripeSubId = String(data.subscription ?? "");

        if (orgId) {
          const now = new Date();
          const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await this.repo.upsertSubscription({
            orgId,
            planId,
            planTier,
            status: "active",
            stripeCustomerId,
            stripeSubscriptionId: stripeSubId,
            currentPeriodStart: now,
            currentPeriodEnd: end,
          });
        }
        return { handled: true, event: eventType };
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const stripeSubId = String(data.id ?? "");
        const status = String(data.status ?? "active") as BillingSubscriptionStatus;
        const currentPeriodStart = data.current_period_start
          ? new Date(Number(data.current_period_start) * 1000)
          : new Date();
        const currentPeriodEnd = data.current_period_end
          ? new Date(Number(data.current_period_end) * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const cancelAtPeriodEnd = Boolean(data.cancel_at_period_end);

        await this.repo.updateSubscriptionByStripeId(stripeSubId, {
          status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        });
        return { handled: true, event: eventType };
      }

      case "customer.subscription.deleted": {
        const stripeSubId = String(data.id ?? "");
        await this.repo.updateSubscriptionByStripeId(stripeSubId, {
          status: "canceled",
          planId: "plan_free",
          planTier: "free",
          canceledAt: new Date(),
        });
        return { handled: true, event: eventType };
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const stripeInvoiceId = String(data.id ?? "");
        const stripeCustomerId = String(data.customer ?? "");
        const sub = await this.repo.getSubscriptionByCustomerId(stripeCustomerId);
        if (sub) {
          const amountDue = Number(data.amount_due ?? 0);
          const amountPaid = Number(data.amount_paid ?? 0);
          const currency = String(data.currency ?? "usd");
          const status = eventType === "invoice.paid" ? "paid" : "open";

          await this.repo.recordInvoice({
            orgId: sub.orgId,
            stripeInvoiceId,
            number: data.number ? String(data.number) : null,
            amountDueCents: amountDue,
            amountPaidCents: amountPaid,
            currency,
            status,
            invoicePdfUrl: data.invoice_pdf ? String(data.invoice_pdf) : null,
            hostedInvoiceUrl: data.hosted_invoice_url ? String(data.hosted_invoice_url) : null,
            periodStart: data.period_start ? new Date(Number(data.period_start) * 1000) : new Date(),
            periodEnd: data.period_end ? new Date(Number(data.period_end) * 1000) : new Date(),
            paidAt: eventType === "invoice.paid" ? new Date() : null,
          });

          if (eventType === "invoice.payment_failed") {
            await this.repo.upsertSubscription({
              ...sub,
              currentPeriodStart: new Date(sub.currentPeriodStart),
              currentPeriodEnd: new Date(sub.currentPeriodEnd),
              status: "past_due",
            });
          }
        }
        return { handled: true, event: eventType };
      }

      default:
        return { handled: false, event: eventType };
    }
  }
}
