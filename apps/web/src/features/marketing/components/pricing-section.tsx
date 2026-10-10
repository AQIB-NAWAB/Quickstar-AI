"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { X, Check, Minus, Info, ChevronDown } from "lucide-react";

interface FeatureItem {
  text: string;
  isIncluded: boolean;
}

interface PlanTier {
  id: "free" | "starter" | "scale" | "enterprise";
  name: string;
  desc: string;
  price: string;
  period?: string;
  features: FeatureItem[];
  detailsTitle: string;
  detailsSummary: string;
  detailsItems: string[];
}

export function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [activePlanId, setActivePlanId] = useState<PlanTier["id"]>("starter");
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const triggerButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveTriggerId = useRef<string | null>(null);
  const previousOverflow = useRef<string>("");

  // Modal accessibility: Escape key, scroll locking, focus management
  const closeModal = useCallback(() => {
    setSelectedPlan(null);
    document.body.style.overflow = previousOverflow.current;
    // Return focus to trigger button
    if (lastActiveTriggerId.current && triggerButtonRefs.current[lastActiveTriggerId.current]) {
      triggerButtonRefs.current[lastActiveTriggerId.current]?.focus();
    }
  }, []);

  const openModal = useCallback((plan: PlanTier) => {
    lastActiveTriggerId.current = plan.id;
    previousOverflow.current = document.body.style.overflow;
    setSelectedPlan(plan);
    document.body.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    if (!selectedPlan) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "Tab" && modalRef.current) {
        // Focus trap
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Initial focus into modal close button
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const closeBtn = modalRef.current.querySelector<HTMLElement>(
          'button[aria-label="Close plan details"]',
        );
        closeBtn?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow.current;
    };
  }, [selectedPlan, closeModal]);

  const plans: PlanTier[] = [
    {
      id: "free",
      name: "Free",
      desc: "For exploring your first agent",
      price: "$0",
      period: "/ month",
      features: [
        { text: "Set up an agent", isIncluded: true },
        { text: "Publish a version", isIncluded: true },
        { text: "Conversation history", isIncluded: true },
        { text: "Example company information", isIncluded: true },
      ],
      detailsTitle: "Free Tier Scope (Proposed)",
      detailsSummary:
        "Designed for prototype validation and local exploration. Build and test published agents with standard workspace boundaries.",
      detailsItems: [
        "Single workspace sandbox with RBAC role defaults",
        "Agent draft editing and version publishing",
        "Conversation turns via runtime API",
        "Example company documentation sources",
        "Standard community discussions and tracking",
      ],
    },
    {
      id: "starter",
      name: "Starter",
      desc: "For a growing project",
      price: "$49",
      period: "/ month",
      features: [
        { text: "Company information & tools", isIncluded: true },
        { text: "Team roles", isIncluded: true },
        { text: "Stored tool credentials", isIncluded: true },
        { text: "Usage limits to be confirmed", isIncluded: false },
      ],
      detailsTitle: "Starter Tier Scope (Proposed)",
      detailsSummary:
        "For teams integrating published agents into production applications with authenticated API tools and secrets vaulting.",
      detailsItems: [
        "Connected company knowledge and API tools",
        "Multi-member workspace roles (Owner, Admin, Analyst)",
        "Envelope-encrypted external API tool credentials",
        "Standard turn limits and automated retry policies",
        "Platform notices and email updates",
      ],
    },
    {
      id: "scale",
      name: "Scale",
      desc: "For larger agent workloads",
      price: "$199",
      period: "/ month",
      features: [
        { text: "Multiple agents", isIncluded: true },
        { text: "Workspace controls", isIncluded: true },
        { text: "Model routing options", isIncluded: true },
        { text: "Capacity to be confirmed", isIncluded: false },
      ],
      detailsTitle: "Scale Tier Scope (Proposed)",
      detailsSummary:
        "For high-volume multi-agent environments needing resilient model gateway routing and customized workspace quotas.",
      detailsItems: [
        "Multiple concurrent agent versions across workspaces",
        "Configured fallback and circuit-breaker model routing",
        "Extended knowledge collection quotas",
        "Increased inflight request concurrency limits",
        "Priority configuration guidance",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      desc: "For specific business needs",
      price: "Custom",
      features: [
        { text: "Deployment requirements", isIncluded: false },
        { text: "Security requirements", isIncluded: false },
        { text: "Support requirements", isIncluded: false },
        { text: "Terms to be agreed", isIncluded: false },
      ],
      detailsTitle: "Enterprise Inquiry & Requirements",
      detailsSummary:
        "Custom configurations for organizations with strict compliance, tenancy, or dedicated infrastructure requirements.",
      detailsItems: [
        "Dedicated workspace partition and VPC routing discussion",
        "Custom SAML / SSO and directory role mapping",
        "Custom provider credential injection and audit logging",
        "Tailored turn volume and model routing policies",
        "Direct architecture review and engineering coordination",
      ],
    },
  ];

  const comparisonRows = [
    {
      feature: "Agent Configuration & Releases",
      free: "Single agent (draft + published)",
      starter: "Multiple versions",
      scale: "Multiple concurrent agents",
      enterprise: "Custom organization scope",
    },
    {
      feature: "Company Knowledge Ingestion",
      free: "Example docs",
      starter: "Standard sources (hybrid search)",
      scale: "High-volume collections",
      enterprise: "Custom data sources",
    },
    {
      feature: "Connected API Tools & Secrets",
      free: "Simulated tools",
      starter: "Vaulted credentials",
      scale: "Vaulted credentials",
      enterprise: "Dedicated secure connectors",
    },
    {
      feature: "Team Access & Workspaces",
      free: "Single workspace sandbox",
      starter: "Roles (Owner, Admin, Analyst)",
      scale: "Granular workspace controls",
      enterprise: "Custom SSO & directory sync",
    },
    {
      feature: "Model Routing & Resilience",
      free: "Standard routing",
      starter: "Timeouts & basic retries",
      scale: "Fallback & circuit breaker",
      enterprise: "Custom provider failover",
    },
    {
      feature: "Concurrency & Throughput",
      free: "Standard limits",
      starter: "Standard limits",
      scale: "Higher capacity (to be confirmed)",
      enterprise: "Dedicated throughput to agree",
    },
    {
      feature: "Commercial Status",
      free: "Proposed $0/mo",
      starter: "Proposed $49/mo",
      scale: "Proposed $199/mo",
      enterprise: "Terms to be agreed",
    },
  ];

  return (
    <section id="pricing" className="quickstart-pricing-section landing-section" aria-label="Plans and pricing">
      <div className="quickstart-pricing-container landing-container">
        {/* ============================================================== */}
        {/* 1. CENTERED COMPACT HEADER GROUP */}
        {/* ============================================================== */}
        <div className="quickstart-pricing-header">
          {/* Eyebrow */}
          <span className="landing-eyebrow select-none">
            PLANS &amp; PRICING
          </span>

          {/* Heading */}
          <h2 className="quickstart-pricing-title landing-title">Start small. Plan for what’s next.</h2>

          {/* Description */}
          <p className="quickstart-pricing-description landing-description landing-description-spaced">
            Explore the options for your project or team.
          </p>

          {/* Single Understated Disclosure */}
          <div className="quickstart-pricing-disclosure">
            <Info
              className="w-3.5 h-3.5 text-[#858585] stroke-[1.75] shrink-0"
              aria-hidden="true"
            />
            <span>
              Proposed pricing. Prices, included usage, and availability are not yet final.
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. FOUR ALIGNED PRICING CARDS */}
        {/* ============================================================== */}
        <div
          className="quickstart-pricing-grid"
          role="radiogroup"
          aria-label="Choose a proposed plan"
        >
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="quickstart-pricing-card"
              data-selected={activePlanId === plan.id}
            >
              <label className="quickstart-pricing-select">
                <input
                  type="radio"
                  name="quickstart-pricing-plan"
                  value={plan.id}
                  checked={activePlanId === plan.id}
                  onChange={() => setActivePlanId(plan.id)}
                  aria-label={`Select ${plan.name} plan`}
                />
              </label>
              <div className="quickstart-pricing-card-content">
                <h3>{plan.name}</h3>
                <p className="quickstart-pricing-plan-description">{plan.desc}</p>
                <div className="quickstart-pricing-price">
                  <span>{plan.price}</span>
                  {plan.period && <span>{plan.period}</span>}
                </div>
                <button
                  ref={(element) => {
                    triggerButtonRefs.current[plan.id] = element;
                  }}
                  type="button"
                  aria-label={`View ${plan.name} plan details`}
                  onClick={() => {
                    setActivePlanId(plan.id);
                    openModal(plan);
                  }}
                  className="quickstart-pricing-details"
                >
                  View plan details
                </button>
                <div className="quickstart-pricing-divider" aria-hidden="true" />
                <p className="quickstart-pricing-feature-label">PROPOSED FEATURES</p>
                <ul className="quickstart-pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature.text} data-included={feature.isIncluded}>
                      {feature.isIncluded ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <Minus aria-hidden="true" />
                      )}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        {/* ============================================================== */}
        {/* 3. CENTERED COMPARISON TOGGLE & QUIET USAGE NOTE */}
        {/* ============================================================== */}
        <div className="quickstart-pricing-footer">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            aria-expanded={showComparison}
            aria-controls="pricing-comparison-table"
            className="quickstart-pricing-compare"
          >
            <span>Compare plan details</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                showComparison ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Quiet usage note */}
          <p className="quickstart-pricing-usage">
            Model and tool usage may affect your requirements.
          </p>
        </div>

        {/* ============================================================== */}
        {/* 4. EXPANDABLE TECHNICAL COMPARISON TABLE */}
        {/* ============================================================== */}
        {showComparison && (
          <div
            id="pricing-comparison-table"
            className="mt-6 rounded-[12px] border border-[#E8E8E5] bg-white p-4.5 sm:p-6 shadow-xs animate-in fade-in duration-200 overflow-x-auto"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[#FF571A] mb-1 select-none">
              PROPOSED SPECIFICATIONS
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-[#262626] mb-5">
              Compare Proposed Platform Dimensions
            </h3>

            <table className="w-full text-left text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[#E8E8E5] text-xs font-medium text-[#858585] uppercase tracking-wider">
                  <th scope="col" className="py-3 pr-4">
                    Capability
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Free ($0)
                  </th>
                  <th scope="col" className="py-3 px-4 text-[#FF571A]">
                    Starter ($49)
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Scale ($199)
                  </th>
                  <th scope="col" className="py-3 pl-4">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E5]">
                {comparisonRows.map((r) => (
                  <tr key={r.feature} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="py-3 pr-4 font-medium text-[#262626]">{r.feature}</td>
                    <td className="py-3 px-4 text-[#666666]">{r.free}</td>
                    <td className="py-3 px-4 text-[#262626] font-medium">{r.starter}</td>
                    <td className="py-3 px-4 text-[#666666]">{r.scale}</td>
                    <td className="py-3 pl-4 text-[#262626] font-medium">{r.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. ACCESSIBLE PLAN DETAILS MODAL */}
      {/* ============================================================== */}
      {selectedPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            ref={modalRef}
            className="w-full max-w-lg rounded-[14px] bg-white border border-[#E8E8E5] shadow-xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E8E8E5]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#FF571A] mb-1 select-none">
                  PROPOSED PLAN DETAILS
                </div>
                <h3 id="plan-modal-title" className="text-2xl font-semibold text-[#262626]">
                  {selectedPlan.name} Tier (Proposed)
                </h3>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[#262626]">{selectedPlan.price}</span>
                  {selectedPlan.period && (
                    <span className="text-xs text-[#858585]">{selectedPlan.period}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-[#858585] hover:text-[#262626] transition-colors rounded-[6px] hover:bg-[#F5F5F3] focus-visible:outline-2 focus-visible:outline-[#FF571A]"
                aria-label="Close plan details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="mt-5 space-y-4 text-sm text-[#404040]">
              <p className="leading-relaxed text-[#666666]">{selectedPlan.detailsSummary}</p>

              <div className="pt-2">
                <div className="text-xs font-medium uppercase tracking-wider text-[#858585] mb-3 select-none">
                  Proposed Scope &amp; Capabilities
                </div>
                <ul className="space-y-2.5">
                  {selectedPlan.detailsItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        className="w-4 h-4 text-[#FF571A] stroke-[2.2] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="text-[#262626] leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Informational notice */}
              <div className="mt-5 p-3.5 rounded-[8px] bg-[#FFF5EF] border border-[#FFD8C7] text-xs text-[#262626] leading-relaxed">
                These plan details and pricing represent proposed specifications. Final usage
                allowances and commercial availability are not yet confirmed.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-[#E8E8E5] flex items-center justify-between">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-[#666666] hover:text-[#262626] transition-colors font-medium rounded-[6px] hover:bg-[#F5F5F3]"
              >
                Close
              </button>
              <Link
                href="/register"
                onClick={closeModal}
                className="px-4 py-2.5 bg-[#FF571A] text-white hover:bg-[#E04810] transition-colors rounded-[8px] text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
              >
                <span>Create account</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
