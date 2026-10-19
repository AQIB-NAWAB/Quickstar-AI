"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { BillingPlan, BillingSummaryResponse } from "@quickstart/contracts";
import {
  cancelSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
  getBillingSummary,
} from "../lib/client";

interface BillingSettingsProps {
  workspaceId: string;
  orgId: string;
  canManage?: boolean;
}

export function BillingSettings({ workspaceId, orgId, canManage = true }: BillingSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummaryResponse | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSummary() {
    setError(null);
    const res = await getBillingSummary(orgId);
    if (res.error) {
      setError(res.error.message);
    } else if (res.data) {
      setSummary(res.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadSummary();
  }, [orgId]);

  async function handleUpgrade(plan: BillingPlan) {
    if (!canManage) return;
    setActionLoading(plan.id);
    setMessage(null);
    setError(null);
    try {
      const res = await createCheckoutSession(orgId, plan.id, interval);
      if (res.error) {
        setError(res.error.message);
      } else if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout initialization failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleOpenPortal() {
    if (!canManage) return;
    setActionLoading("portal");
    setMessage(null);
    setError(null);
    try {
      const res = await createCustomerPortalSession(orgId);
      if (res.error) {
        setError(res.error.message);
      } else if (res.data?.portalUrl) {
        window.location.href = res.data.portalUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Portal session failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelSubscription() {
    if (!canManage) return;
    if (!confirm("Are you sure you want to cancel your subscription at the end of the current billing cycle?")) {
      return;
    }
    setActionLoading("cancel");
    setMessage(null);
    try {
      const res = await cancelSubscription(orgId, false);
      if (res.error) {
        setError(res.error.message);
      } else {
        setMessage("Subscription canceled. Access will remain active until the end of your billing cycle.");
        await loadSummary();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-16 border border-border-faint bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const sub = summary?.subscription;
  const currentPlan = summary?.currentPlan;
  const entitlements = summary?.entitlements;
  const isPaid = sub && sub.planTier !== "free";
  const isDelinquent = entitlements?.isDelinquent;

  return (
    <div className="space-y-6">
      {/* Notifications / Alerts */}
      {summary?.setupRequiredMessage && (
        <div className="flex items-center gap-2 rounded-12 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800 border border-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{summary.setupRequiredMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-12 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-12 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800 border border-emerald-200">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Subscription Status Header */}
      <section className="rounded-16 border border-border-faint bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold tracking-tight text-accent-black">
                {currentPlan?.name ?? "Community Plan"}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  isDelinquent
                    ? "bg-rose-100 text-rose-700"
                    : sub?.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {sub?.status ?? "active"}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-neutral-500">
              {sub?.cancelAtPeriodEnd
                ? `Cancels at end of billing period: ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                : `Next billing date: ${new Date(sub?.currentPeriodEnd ?? Date.now() + 30 * 86400000).toLocaleDateString()}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isPaid && (
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={Boolean(actionLoading) || !canManage}
                className="flex items-center gap-1.5 rounded-10 border border-neutral-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {actionLoading === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 text-neutral-500" />
                )}
                <span>Payment & Invoices</span>
              </button>
            )}

            {isPaid && !sub?.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={Boolean(actionLoading) || !canManage}
                className="rounded-10 px-3 py-2 text-[13px] font-semibold text-neutral-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                Cancel plan
              </button>
            )}
          </div>
        </div>

        {/* Quota meters */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border-faint pt-6 sm:grid-cols-3">
          <div className="rounded-12 bg-neutral-50/70 p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Monthly Tokens
            </span>
            <div className="mt-2 flex items-baseline justify-between text-[14px]">
              <span className="font-bold text-accent-black">
                {entitlements?.monthlyTokensUsed.toLocaleString() ?? 0}
              </span>
              <span className="text-[12px] font-medium text-neutral-400">
                / {entitlements?.monthlyTokensQuota.toLocaleString() ?? "Unlimited"}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-heat-100 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    entitlements?.monthlyTokensQuota
                      ? ((entitlements.monthlyTokensUsed ?? 0) / entitlements.monthlyTokensQuota) * 100
                      : 0,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-12 bg-neutral-50/70 p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Voice Telephony
            </span>
            <div className="mt-2 flex items-baseline justify-between text-[14px]">
              <span className="font-bold text-accent-black">
                {entitlements?.voiceMinutesUsed ?? 0} min
              </span>
              <span className="text-[12px] font-medium text-neutral-400">
                / {entitlements?.voiceMinutesQuota ?? "Unlimited"} min
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    entitlements?.voiceMinutesQuota
                      ? ((entitlements.voiceMinutesUsed ?? 0) / entitlements.voiceMinutesQuota) * 100
                      : 0,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-12 bg-neutral-50/70 p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Active Agents
            </span>
            <div className="mt-2 flex items-baseline justify-between text-[14px]">
              <span className="font-bold text-accent-black">
                {entitlements?.currentAgentsCount ?? 1}
              </span>
              <span className="text-[12px] font-medium text-neutral-400">
                / {entitlements?.maxAgents ?? "Unlimited"} max
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    entitlements?.maxAgents
                      ? ((entitlements.currentAgentsCount ?? 1) / entitlements.maxAgents) * 100
                      : 10,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Available Plans Catalog */}
      <section className="rounded-16 border border-border-faint bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-accent-black">Plans & Tiers</h2>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              Upgrade your organization to expand quota limits, custom integrations, and team seats.
            </p>
          </div>

          <div className="flex items-center rounded-10 bg-neutral-100 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={`rounded-8 px-3 py-1.5 text-[12px] font-bold transition-colors ${
                interval === "month"
                  ? "bg-white text-accent-black shadow-xs"
                  : "text-neutral-500 hover:text-accent-black"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={`rounded-8 px-3 py-1.5 text-[12px] font-bold transition-colors ${
                interval === "year"
                  ? "bg-white text-accent-black shadow-xs"
                  : "text-neutral-500 hover:text-accent-black"
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summary?.availablePlans.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id;
            const price =
              interval === "year"
                ? Math.round((plan.priceCents * 0.8) / 100)
                : Math.round(plan.priceCents / 100);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-16 border p-5 transition-all ${
                  plan.highlighted
                    ? "border-heat-100 shadow-md ring-1 ring-heat-100"
                    : isCurrent
                      ? "border-neutral-400 bg-neutral-50/40"
                      : "border-border-faint bg-white hover:border-neutral-300"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-heat-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-accent-black">{plan.name}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-neutral-500 leading-snug">{plan.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-accent-black">${price}</span>
                    <span className="text-[12px] text-neutral-500">/ month</span>
                  </div>

                  <ul className="mt-5 space-y-2.5 border-t border-border-faint pt-4 text-[12px]">
                    {plan.features.map((feat) => (
                      <li key={feat.key} className="flex items-center gap-2">
                        {feat.included ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0 text-neutral-300 text-center font-bold">
                            –
                          </span>
                        )}
                        <span className={feat.included ? "text-neutral-700 font-medium" : "text-neutral-400"}>
                          {feat.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-10 bg-neutral-100 py-2.5 text-[13px] font-bold text-neutral-400 cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(plan)}
                      disabled={Boolean(actionLoading) || !canManage}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-10 py-2.5 text-[13px] font-bold transition-colors disabled:opacity-50 ${
                        plan.highlighted
                          ? "bg-heat-100 text-white hover:bg-heat-100/90 shadow-sm"
                          : "border border-neutral-300 bg-white text-accent-black hover:bg-neutral-50"
                      }`}
                    >
                      {actionLoading === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Select {plan.tier}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Invoices History Table */}
      {summary && summary.recentInvoices.length > 0 && (
        <section className="rounded-16 border border-border-faint bg-white p-6 shadow-xs">
          <h2 className="text-lg font-bold tracking-tight text-accent-black">Recent Invoices</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border-faint text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Billing Period</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint font-medium">
                {summary.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="text-neutral-700">
                    <td className="py-3 font-semibold text-accent-black">
                      {inv.number ?? inv.stripeInvoiceId.slice(0, 14)}
                    </td>
                    <td className="py-3 text-neutral-500">
                      {new Date(inv.periodStart).toLocaleDateString()} -{" "}
                      {new Date(inv.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-accent-black">
                      ${(inv.amountPaidCents / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 capitalize">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {inv.hostedInvoiceUrl ? (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-heat-100 hover:underline"
                        >
                          <span>View</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-neutral-400">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
