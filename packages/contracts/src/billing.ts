/**
 * Organization Billing and Payment Lifecycle Contracts
 */

export type BillingPlanInterval = "month" | "year";

export type BillingPlanTier = "free" | "starter" | "growth" | "enterprise";

export type BillingSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type BillingPlanFeature = {
  key: string;
  name: string;
  included: boolean;
  limit?: number | null;
  unit?: string;
};

export type BillingPlan = {
  id: string;
  tier: BillingPlanTier;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: BillingPlanInterval;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  features: BillingPlanFeature[];
  limits: {
    monthlyTurns: number;
    monthlyTokens: number;
    voiceMinutes: number;
    maxAgents: number;
    maxWorkspaces: number;
    maxSeats: number;
  };
  highlighted?: boolean;
  isActive: boolean;
};

export type BillingSubscription = {
  id: string;
  orgId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  planId: string;
  planTier: BillingPlanTier;
  status: BillingSubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  trialEnd?: string | null;
  defaultPaymentMethodLast4?: string | null;
  defaultPaymentMethodBrand?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingInvoice = {
  id: string;
  orgId: string;
  stripeInvoiceId: string;
  number?: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  invoicePdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
  periodStart: string;
  periodEnd: string;
  paidAt?: string | null;
  createdAt: string;
};

export type OrganizationEntitlements = {
  orgId: string;
  planTier: BillingPlanTier;
  status: BillingSubscriptionStatus;
  canCreateAgent: boolean;
  canCreateWorkspace: boolean;
  canMakeOutboundCalls: boolean;
  canUseCustomTools: boolean;
  canExportData: boolean;
  maxAgents: number;
  currentAgentsCount: number;
  monthlyTokensQuota: number;
  monthlyTokensUsed: number;
  voiceMinutesQuota: number;
  voiceMinutesUsed: number;
  isDelinquent: boolean;
  gracePeriodEndsAt?: string | null;
};

export type BillingSummaryResponse = {
  orgId: string;
  subscription: BillingSubscription | null;
  currentPlan: BillingPlan;
  availablePlans: BillingPlan[];
  entitlements: OrganizationEntitlements;
  recentInvoices: BillingInvoice[];
  stripeConfigured: boolean;
  setupRequiredMessage?: string;
};

export type CreateCheckoutSessionRequest = {
  orgId: string;
  planId: string;
  interval: BillingPlanInterval;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutSessionResponse = {
  sessionId: string;
  checkoutUrl: string;
};

export type CreateCustomerPortalSessionRequest = {
  orgId: string;
  returnUrl: string;
};

export type CreateCustomerPortalSessionResponse = {
  portalUrl: string;
};

export type CancelSubscriptionRequest = {
  orgId: string;
  immediately?: boolean;
};
