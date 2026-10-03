"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FreePlanIllustration,
  StarterPlanIllustration,
  ScalePlanIllustration,
  EnterprisePlanIllustration,
} from "./pricing-illustrations";
import { X, Check, Minus } from "lucide-react";

interface PlanTier {
  id: string;
  name: string;
  desc: string;
  price: string;
  period?: string;
  features: string[];
  ctaText: string;
  ctaType: "outlined" | "primary" | "link";
  detailsTitle: string;
  detailsSummary: string;
  detailsItems: string[];
}

export function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const plans: PlanTier[] = [
    {
      id: "free",
      name: "Free",
      desc: "Explore a first agent",
      price: "$0",
      period: "/ month",
      features: [
        "Agent configuration",
        "Published versions",
        "Conversation history",
        "Knowledge examples",
      ],
      ctaText: "Explore Free",
      ctaType: "outlined",
      detailsTitle: "Free Tier Scope (Proposed)",
      detailsSummary:
        "Designed for prototype validation and local development. Build and test published agents with standard workspace boundaries.",
      detailsItems: [
        "Draft and published agent release pointers",
        "Conversation turns via runtime API",
        "Single workspace sandbox with RBAC role defaults",
        "Local knowledge source testing",
        "Standard community discussion & issue tracking",
      ],
    },
    {
      id: "starter",
      name: "Starter",
      desc: "For a growing project",
      price: "$49",
      period: "/ month",
      features: [
        "Knowledge + API tools",
        "Workspace roles",
        "Secrets management",
        "Usage options to confirm",
      ],
      ctaText: "Explore Starter",
      ctaType: "primary",
      detailsTitle: "Starter Tier Scope (Proposed)",
      detailsSummary:
        "For teams integrating published agents into production applications with authenticated API tools and secrets vaulting.",
      detailsItems: [
        "Hybrid BM25 + vector search knowledge retrieval",
        "Envelope-encrypted external API tool credentials",
        "Multi-member workspace roles (Owner, Admin, Analyst)",
        "Standard turn limits and automated retry policies",
        "Email support and platform change notices",
      ],
    },
    {
      id: "scale",
      name: "Scale",
      desc: "For larger agent workloads",
      price: "$199",
      period: "/ month",
      features: [
        "Multiple agents",
        "Workspace controls",
        "Model routing",
        "Capacity options to confirm",
      ],
      ctaText: "Explore Scale",
      ctaType: "outlined",
      detailsTitle: "Scale Tier Scope (Proposed)",
      detailsSummary:
        "For high-volume multi-agent environments needing resilient model gateway routing and customized workspace quotas.",
      detailsItems: [
        "Concurrent agent versions across workspaces",
        "Configured fallback and circuit-breaker model routing",
        "Extended knowledge collection quotas",
        "Increased inflight request concurrency limits",
        "Priority technical support & configuration guidance",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      desc: "Discuss your requirements",
      price: "Custom",
      features: [
        "Deployment discussion",
        "Security requirements",
        "Support requirements",
        "Commercial terms to confirm",
      ],
      ctaText: "Discuss Enterprise ↗",
      ctaType: "link",
      detailsTitle: "Enterprise Inquiry & Requirements",
      detailsSummary:
        "Custom configurations for organizations with strict compliance, tenancy, or infrastructure hosting requirements.",
      detailsItems: [
        "Dedicated workspace partition & VPC routing discussion",
        "Custom SAML / SSO and role mapping requirements",
        "Custom provider credential injection & audit logging",
        "Tailored turn volume and model routing policies",
        "Direct engineering coordination & architecture review",
      ],
    },
  ];

  const comparisonRows = [
    {
      feature: "Agent Configuration & Releases",
      free: "Included",
      starter: "Included",
      scale: "Included",
      enterprise: "Custom",
    },
    {
      feature: "Immutable Version Snapshots (v1, v2...)",
      free: "Standard",
      starter: "Extended",
      scale: "Extended",
      enterprise: "Custom policy",
    },
    {
      feature: "Knowledge Ingestion & Hybrid Search",
      free: "Sample docs",
      starter: "Standard sources",
      scale: "High-volume sources",
      enterprise: "Custom collections",
    },
    {
      feature: "External API Tools Execution",
      free: "Simulated",
      starter: "Vaulted credentials",
      scale: "Vaulted credentials",
      enterprise: "Dedicated connectors",
    },
    {
      feature: "Workspace RBAC Roles & Membership",
      free: "Default roles",
      starter: "Owner / Admin / Analyst",
      scale: "Fine-grained roles",
      enterprise: "SSO & custom mapping",
    },
    {
      feature: "Model Gateway Routing & Fallback",
      free: "Single model",
      starter: "Standard timeout",
      scale: "Configured fallback",
      enterprise: "Custom failover",
    },
    {
      feature: "Message Idempotency & Persistence",
      free: "Included",
      starter: "Included",
      scale: "Included",
      enterprise: "Custom retention",
    },
    {
      feature: "Commercial Terms & Allowances",
      free: "Free tier ($0)",
      starter: "Proposed $49/mo",
      scale: "Proposed $199/mo",
      enterprise: "Custom scope",
    },
  ];

  return (
    <section
      id="pricing"
      className="w-full bg-[#f9f9f9] text-[#262626] border-t border-[#dedede] pt-12 pb-20 sm:pt-16 sm:pb-24 overflow-hidden"
    >
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Monospace Section Label */}
        <div className="flex items-center justify-between pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          <span>07 / PLANS</span>
          <span className="hidden sm:inline opacity-60">&middot;&nbsp;&middot;&nbsp;&middot;&nbsp;+</span>
        </div>

        {/* Top Thin Horizontal Rule */}
        <div className="w-full h-px bg-[#dedede]" />

        {/* Section Heading Row */}
        <div className="pt-8 pb-10 sm:pb-14 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <h2 className="text-4xl sm:text-5xl lg:text-[58px] font-medium tracking-tight text-[#262626] leading-[1.08]">
            Start small.
            <br />
            Choose what comes next.
          </h2>

          <div className="text-lg sm:text-xl text-[#666666] leading-relaxed font-normal max-w-md pt-2 lg:pt-3">
            <div>Explore the plan options for your team.</div>
            <div className="text-xs sm:text-sm text-[#737373] mt-1 font-mono">
              Plan details shown are proposed.
            </div>
          </div>
        </div>

        {/* Main 4-Column Open Grid with Shared Dividers */}
        <div className="border-t border-[#dedede] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#dedede]">
          {plans.map((t) => (
            <div
              key={t.id}
              className="p-6 sm:p-7 xl:p-8 flex flex-col justify-between"
            >
              <div>
                {/* Plan Custom SVG Illustration (Common Height Alignment) */}
                <div className="h-[120px] flex items-center justify-center mb-6">
                  {t.id === "free" && <FreePlanIllustration />}
                  {t.id === "starter" && <StarterPlanIllustration />}
                  {t.id === "scale" && <ScalePlanIllustration />}
                  {t.id === "enterprise" && <EnterprisePlanIllustration />}
                </div>

                {/* Plan Name & Description */}
                <h3 className="text-2xl sm:text-[28px] font-medium text-[#262626] tracking-tight">
                  {t.name}
                </h3>
                <p className="text-sm sm:text-[15px] text-[#666666] mt-1 min-h-[44px] leading-relaxed">
                  {t.desc}
                </p>

                {/* Price Display */}
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-5xl sm:text-[56px] font-medium text-[#262626] tracking-tight leading-none">
                    {t.price}
                  </span>
                  {t.period && (
                    <span className="text-sm sm:text-base text-[#737373] font-normal">
                      {t.period}
                    </span>
                  )}
                </div>

                {/* Proposed Plan Label & Divider */}
                <div className="mt-6 pt-4 border-t border-[#dedede] text-xs font-mono text-[#737373] uppercase tracking-wider">
                  Proposed plan
                </div>

                {/* Feature List with Orange Horizontal Dashes */}
                <ul className="mt-4 space-y-3 text-sm sm:text-[15px] text-[#262626]">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className="text-[#fa5d19] font-medium shrink-0 leading-tight">
                        —
                      </span>
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button (Aligned Baseline) */}
              <div className="mt-8 sm:mt-10 pt-2">
                {t.ctaType === "primary" ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(t)}
                    className="w-full h-[46px] bg-[#fa5d19] text-white hover:bg-[#e04d0f] transition-colors rounded-[5px] font-medium text-sm sm:text-[15px] flex items-center justify-center"
                  >
                    {t.ctaText}
                  </button>
                ) : t.ctaType === "outlined" ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(t)}
                    className="w-full h-[46px] border border-[#262626] text-[#262626] hover:bg-[#262626] hover:text-white transition-colors rounded-[5px] font-medium text-sm sm:text-[15px] flex items-center justify-center"
                  >
                    {t.ctaText}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(t)}
                    className="w-full h-[46px] text-[#262626] hover:text-[#fa5d19] underline underline-offset-4 font-medium text-sm sm:text-[15px] flex items-center justify-center transition-colors group"
                  >
                    <span>{t.ctaText}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Full-Width Footer & Interactive Comparison Toggle */}
        <div className="border-t border-[#dedede] pt-6 mt-12 sm:mt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm font-mono text-[#737373]">
          <div>
            <div>Model and tool usage can affect your requirements.</div>
            <div className="text-[11px] sm:text-xs text-[#8c8c8c] mt-0.5">
              Illustrative pricing &middot; final allowances and availability to be confirmed.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-1.5 text-[#fa5d19] hover:underline underline-offset-4 transition-all font-medium self-start sm:self-auto"
          >
            <span>{showComparison ? "Hide plan details ↑" : "Compare plan details ↓"}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* EXPANDABLE DETAILED COMPARISON TABLE */}
        {/* ========================================================================= */}
        {showComparison && (
          <div className="mt-8 border border-[#dedede] bg-white p-6 sm:p-8 animate-in fade-in duration-200 overflow-x-auto">
            <div className="text-xs font-mono uppercase tracking-wider text-[#fa5d19] mb-2">
              TECHNICAL COMPARISON MATRIX
            </div>
            <h3 className="text-2xl font-medium text-[#262626] mb-6">
              Compare Platform Dimensions &amp; Capabilities
            </h3>

            <table className="w-full text-left text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[#dedede] font-mono text-xs text-[#737373] uppercase">
                  <th className="py-3 pr-4 font-medium">Capability</th>
                  <th className="py-3 px-4 font-medium">Free ($0)</th>
                  <th className="py-3 px-4 font-medium">Starter ($49)</th>
                  <th className="py-3 px-4 font-medium">Scale ($199)</th>
                  <th className="py-3 pl-4 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dedede]">
                {comparisonRows.map((r) => (
                  <tr key={r.feature} className="hover:bg-[#fafafa] transition-colors">
                    <td className="py-3.5 pr-4 font-medium text-[#262626]">{r.feature}</td>
                    <td className="py-3.5 px-4 text-[#666666]">{r.free}</td>
                    <td className="py-3.5 px-4 text-[#666666]">{r.starter}</td>
                    <td className="py-3.5 px-4 text-[#666666]">{r.scale}</td>
                    <td className="py-3.5 pl-4 text-[#262626] font-medium">{r.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PLAN DETAILS DIALOG / MODAL */}
      {/* ========================================================================= */}
      {selectedPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedPlan(null)}
        >
          <div
            className="w-full max-w-xl bg-white border border-[#dedede] shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#dedede]">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#fa5d19] mb-1">
                  PROPOSED PLAN DETAILS
                </div>
                <h3 id="plan-modal-title" className="text-2xl font-medium text-[#262626]">
                  {selectedPlan.detailsTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 text-[#737373] hover:text-[#262626] transition-colors rounded hover:bg-[#f0f0f0]"
                aria-label="Close plan details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="mt-5 space-y-4 text-sm text-[#404040]">
              <p className="leading-relaxed text-[#666666]">
                {selectedPlan.detailsSummary}
              </p>

              <div className="pt-2">
                <div className="text-xs font-mono uppercase tracking-wider text-[#737373] mb-3">
                  Scope &amp; Proposed Features
                </div>
                <ul className="space-y-2.5">
                  {selectedPlan.detailsItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-[#fa5d19] font-medium shrink-0">—</span>
                      <span className="text-[#262626] leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 p-3.5 bg-[#fafafa] border border-[#dedede] text-xs font-mono text-[#737373] leading-relaxed">
                Billing infrastructure is currently in proposed status. Account registration provides full sandbox access to current published services.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-[#dedede] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="text-xs font-mono text-[#737373] hover:text-[#262626]"
              >
                Close
              </button>
              <Link
                href="/register"
                className="px-5 py-2 bg-[#262626] text-white hover:bg-[#fa5d19] transition-colors rounded text-xs font-medium font-sans inline-flex items-center gap-1"
              >
                <span>Create Sandbox Account</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
