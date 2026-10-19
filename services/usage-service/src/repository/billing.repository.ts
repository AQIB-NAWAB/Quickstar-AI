import type { Pool } from "pg";
import type {
  BillingInvoice,
  BillingPlanTier,
  BillingSubscription,
  BillingSubscriptionStatus,
} from "@quickstart/contracts";

type SubscriptionRow = {
  id: string;
  org_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: string;
  plan_tier: string;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at: Date | null;
  trial_end: Date | null;
  default_payment_method_last4: string | null;
  default_payment_method_brand: string | null;
  created_at: Date;
  updated_at: Date;
};

type InvoiceRow = {
  id: string;
  org_id: string;
  stripe_invoice_id: string;
  number: string | null;
  amount_due_cents: number;
  amount_paid_cents: number;
  currency: string;
  status: string;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
  period_start: Date;
  period_end: Date;
  paid_at: Date | null;
  created_at: Date;
};

function mapSubscription(row: SubscriptionRow): BillingSubscription {
  return {
    id: row.id,
    orgId: row.org_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    planId: row.plan_id,
    planTier: row.plan_tier as BillingPlanTier,
    status: row.status as BillingSubscriptionStatus,
    currentPeriodStart: row.current_period_start.toISOString(),
    currentPeriodEnd: row.current_period_end.toISOString(),
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at?.toISOString() ?? null,
    trialEnd: row.trial_end?.toISOString() ?? null,
    defaultPaymentMethodLast4: row.default_payment_method_last4,
    defaultPaymentMethodBrand: row.default_payment_method_brand,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapInvoice(row: InvoiceRow): BillingInvoice {
  return {
    id: row.id,
    orgId: row.org_id,
    stripeInvoiceId: row.stripe_invoice_id,
    number: row.number,
    amountDueCents: row.amount_due_cents,
    amountPaidCents: row.amount_paid_cents,
    currency: row.currency,
    status: row.status as BillingInvoice["status"],
    invoicePdfUrl: row.invoice_pdf_url,
    hostedInvoiceUrl: row.hosted_invoice_url,
    periodStart: row.period_start.toISOString(),
    periodEnd: row.period_end.toISOString(),
    paidAt: row.paid_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export class BillingRepository {
  constructor(private readonly pool: Pool) {}

  async getSubscription(orgId: string): Promise<BillingSubscription | null> {
    const res = await this.pool.query<SubscriptionRow>(
      `SELECT * FROM organization_subscriptions WHERE org_id = $1 LIMIT 1`,
      [orgId],
    );
    return res.rows[0] ? mapSubscription(res.rows[0]) : null;
  }

  async getSubscriptionByStripeId(stripeSubId: string): Promise<BillingSubscription | null> {
    const res = await this.pool.query<SubscriptionRow>(
      `SELECT * FROM organization_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
      [stripeSubId],
    );
    return res.rows[0] ? mapSubscription(res.rows[0]) : null;
  }

  async getSubscriptionByCustomerId(stripeCustomerId: string): Promise<BillingSubscription | null> {
    const res = await this.pool.query<SubscriptionRow>(
      `SELECT * FROM organization_subscriptions WHERE stripe_customer_id = $1 LIMIT 1`,
      [stripeCustomerId],
    );
    return res.rows[0] ? mapSubscription(res.rows[0]) : null;
  }

  async upsertSubscription(sub: {
    orgId: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    planId: string;
    planTier: BillingPlanTier;
    status: BillingSubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    trialEnd?: Date | null;
    defaultPaymentMethodLast4?: string | null;
    defaultPaymentMethodBrand?: string | null;
  }): Promise<BillingSubscription> {
    const res = await this.pool.query<SubscriptionRow>(
      `INSERT INTO organization_subscriptions (
         org_id, stripe_customer_id, stripe_subscription_id, plan_id, plan_tier,
         status, current_period_start, current_period_end, cancel_at_period_end,
         canceled_at, trial_end, default_payment_method_last4, default_payment_method_brand, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       ON CONFLICT (org_id) DO UPDATE SET
         stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, organization_subscriptions.stripe_customer_id),
         stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, organization_subscriptions.stripe_subscription_id),
         plan_id = EXCLUDED.plan_id,
         plan_tier = EXCLUDED.plan_tier,
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         canceled_at = EXCLUDED.canceled_at,
         trial_end = EXCLUDED.trial_end,
         default_payment_method_last4 = COALESCE(EXCLUDED.default_payment_method_last4, organization_subscriptions.default_payment_method_last4),
         default_payment_method_brand = COALESCE(EXCLUDED.default_payment_method_brand, organization_subscriptions.default_payment_method_brand),
         updated_at = NOW()
       RETURNING *`,
      [
        sub.orgId,
        sub.stripeCustomerId ?? null,
        sub.stripeSubscriptionId ?? null,
        sub.planId,
        sub.planTier,
        sub.status,
        sub.currentPeriodStart,
        sub.currentPeriodEnd,
        Boolean(sub.cancelAtPeriodEnd),
        sub.canceledAt ?? null,
        sub.trialEnd ?? null,
        sub.defaultPaymentMethodLast4 ?? null,
        sub.defaultPaymentMethodBrand ?? null,
      ],
    );
    return mapSubscription(res.rows[0]);
  }

  async updateSubscriptionByStripeId(
    stripeSubId: string,
    updates: {
      status?: BillingSubscriptionStatus;
      planId?: string;
      planTier?: BillingPlanTier;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date | null;
      defaultPaymentMethodLast4?: string | null;
      defaultPaymentMethodBrand?: string | null;
    },
  ): Promise<BillingSubscription | null> {
    const res = await this.pool.query<SubscriptionRow>(
      `UPDATE organization_subscriptions
       SET status = COALESCE($2, status),
           plan_id = COALESCE($3, plan_id),
           plan_tier = COALESCE($4, plan_tier),
           current_period_start = COALESCE($5, current_period_start),
           current_period_end = COALESCE($6, current_period_end),
           cancel_at_period_end = COALESCE($7, cancel_at_period_end),
           canceled_at = COALESCE($8, canceled_at),
           default_payment_method_last4 = COALESCE($9, default_payment_method_last4),
           default_payment_method_brand = COALESCE($10, default_payment_method_brand),
           updated_at = NOW()
       WHERE stripe_subscription_id = $1
       RETURNING *`,
      [
        stripeSubId,
        updates.status ?? null,
        updates.planId ?? null,
        updates.planTier ?? null,
        updates.currentPeriodStart ?? null,
        updates.currentPeriodEnd ?? null,
        updates.cancelAtPeriodEnd ?? null,
        updates.canceledAt ?? null,
        updates.defaultPaymentMethodLast4 ?? null,
        updates.defaultPaymentMethodBrand ?? null,
      ],
    );
    return res.rows[0] ? mapSubscription(res.rows[0]) : null;
  }

  async recordInvoice(invoice: {
    orgId: string;
    stripeInvoiceId: string;
    number?: string | null;
    amountDueCents: number;
    amountPaidCents: number;
    currency: string;
    status: BillingInvoice["status"];
    invoicePdfUrl?: string | null;
    hostedInvoiceUrl?: string | null;
    periodStart: Date;
    periodEnd: Date;
    paidAt?: Date | null;
  }): Promise<BillingInvoice> {
    const res = await this.pool.query<InvoiceRow>(
      `INSERT INTO billing_invoices (
         org_id, stripe_invoice_id, number, amount_due_cents, amount_paid_cents,
         currency, status, invoice_pdf_url, hosted_invoice_url, period_start, period_end, paid_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (stripe_invoice_id) DO UPDATE SET
         number = EXCLUDED.number,
         amount_due_cents = EXCLUDED.amount_due_cents,
         amount_paid_cents = EXCLUDED.amount_paid_cents,
         currency = EXCLUDED.currency,
         status = EXCLUDED.status,
         invoice_pdf_url = EXCLUDED.invoice_pdf_url,
         hosted_invoice_url = EXCLUDED.hosted_invoice_url,
         paid_at = EXCLUDED.paid_at
       RETURNING *`,
      [
        invoice.orgId,
        invoice.stripeInvoiceId,
        invoice.number ?? null,
        invoice.amountDueCents,
        invoice.amountPaidCents,
        invoice.currency,
        invoice.status,
        invoice.invoicePdfUrl ?? null,
        invoice.hostedInvoiceUrl ?? null,
        invoice.periodStart,
        invoice.periodEnd,
        invoice.paidAt ?? null,
      ],
    );
    return mapInvoice(res.rows[0]);
  }

  async listInvoices(orgId: string, limit = 10): Promise<BillingInvoice[]> {
    const res = await this.pool.query<InvoiceRow>(
      `SELECT * FROM billing_invoices
       WHERE org_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [orgId, limit],
    );
    return res.rows.map(mapInvoice);
  }

  async getMonthlyUsage(
    orgId: string,
    since: Date,
  ): Promise<{ monthlyTokensUsed: number; voiceMinutesUsed: number }> {
    const res = await this.pool.query<{ tokens: string | null; minutes: string | null }>(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = 'model' THEN units ELSE 0 END), 0)::text AS tokens,
         COALESCE(SUM(CASE WHEN kind = 'voice' THEN units ELSE 0 END), 0)::text AS minutes
       FROM usage_entries
       WHERE org_id = $1
         AND created_at >= $2`,
      [orgId, since.toISOString()],
    );
    const row = res.rows[0];
    return {
      monthlyTokensUsed: Math.round(Number(row?.tokens ?? 0)),
      voiceMinutesUsed: Math.round(Number(row?.minutes ?? 0)),
    };
  }
}
