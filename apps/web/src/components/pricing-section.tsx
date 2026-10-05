"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FreePlanIcon,
  StarterPlanIcon,
  ScalePlanIcon,
  EnterprisePlanIcon,
} from "./pricing-illustrations";
import { X, Check, Info, ChevronDown } from "lucide-react";

interface PlanTier {
  id: string;
  name: string;
  desc: string;
  price: string;
  period?: string;
  features: string[];
  isHighlighted?: boolean;
  detailsTitle: string;
  detailsSummary: string;
  detailsItems: string[];
}

export function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  const sectionRef = useRef<HTMLElement>(null);
  const triggerButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveTriggerId = useRef<string | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Viewport intersection observer for single entrance animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Modal accessibility: Escape key and focus management
  const closeModal = useCallback(() => {
    setSelectedPlan(null);
    document.body.style.overflow = "";
    // Return focus to the trigger button that opened this dialog
    if (lastActiveTriggerId.current && triggerButtonRefs.current[lastActiveTriggerId.current]) {
      triggerButtonRefs.current[lastActiveTriggerId.current]?.focus();
    }
  }, []);

  const openModal = useCallback((plan: PlanTier) => {
    lastActiveTriggerId.current = plan.id;
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
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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

    // Initial focus into modal
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const closeBtn = modalRef.current.querySelector<HTMLElement>('button[aria-label="Close plan details"]');
        closeBtn?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      document.body.style.overflow = "";
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
        "Set up an agent",
        "Publish a version",
        "Conversation history",
        "Example company information",
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
      isHighlighted: true,
      features: [
        "Company information & tools",
        "Team roles",
        "Stored tool credentials",
        "Usage limits to be confirmed",
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
        "Multiple agents",
        "Workspace controls",
        "Model routing options",
        "Capacity to be confirmed",
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
        "Deployment requirements",
        "Security requirements",
        "Support requirements",
        "Terms to be agreed",
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
    <section
      id="pricing"
      ref={sectionRef}
      className="w-full bg-[#FAFAF8] text-[#262626] border-t border-[#E8E8E5] py-16 sm:py-20 lg:py-24 overflow-hidden scroll-mt-24 lg:scroll-mt-28"
      aria-label="Plans and pricing"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================== */}
        {/* 1. HEADER GROUP WITH UPPER-RIGHT BADGE */}
        {/* ============================================================== */}
        <div
          className={`flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-6 transition-all duration-500 ${
            isInView || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
        >
          <div>
            {/* Eyebrow */}
            <div className="text-xs sm:text-[13px] font-semibold text-[#FF571A] tracking-wider uppercase select-none">
              PLANS &amp; PRICING
            </div>

            {/* Heading */}
            <h2 className="mt-3.5 sm:mt-4 text-3xl sm:text-4xl lg:text-[48px] font-semibold text-[#262626] tracking-[-0.035em] leading-[1.1]">
              Start small. Plan for what’s next.
            </h2>

            {/* Supporting sentence */}
            <p className="mt-2.5 sm:mt-3 text-base sm:text-lg text-[#666666] font-normal leading-normal">
              Explore the options for your project or team.
            </p>
          </div>

          {/* Upper-right badge: Pricing preview */}
          <div
            className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-[#E8E8E5] bg-white text-xs sm:text-[13px] text-[#262626] font-medium shadow-2xs select-none shrink-0"
            aria-label="Pricing preview status"
          >
            <Info className="w-4 h-4 text-[#666666] stroke-[1.75]" aria-hidden="true" />
            <span>Pricing preview</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. FULL-WIDTH PROPOSED-PRICING NOTICE STRIP */}
        {/* ============================================================== */}
        <div
          role="note"
          aria-label="Proposed pricing notice"
          className={`mt-7 sm:mt-8 w-full rounded-[10px] bg-[#FFF5EF] border border-[#FFD8C7] px-4 sm:px-5 py-3.5 flex items-center gap-3 text-sm sm:text-[14px] text-[#262626] leading-normal transition-all duration-500 delay-75 ${
            isInView || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
        >
          <div
            className="w-5 h-5 rounded-full border border-[#FF571A] flex items-center justify-center shrink-0 text-[#FF571A] text-xs font-semibold select-none"
            aria-hidden="true"
          >
            i
          </div>
          <span>
            These plans are proposed. Prices, included usage, and availability are not yet final.
          </span>
        </div>

        {/* ============================================================== */}
        {/* 3. FOUR ALIGNED PRICING CARDS */}
        {/* ============================================================== */}
        <div className="mt-6 sm:mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
          {plans.map((t, idx) => (
            <div
              key={t.id}
              className={`rounded-[14px] p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                t.isHighlighted
                  ? "bg-white border-2 border-[#FF571A] shadow-xs"
                  : "bg-white border border-[#E8E8E5] hover:border-[#D0D0CC]"
              } ${
                isInView || isReducedMotion
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
              style={{
                transitionDelay: isReducedMotion ? "0ms" : `${150 + idx * 80}ms`,
              }}
            >
              <div>
                {/* Plan Icon */}
                <div className="w-8 h-8 flex items-center justify-start">
                  {t.id === "free" && <FreePlanIcon className="w-7 h-7 text-[#FF571A]" />}
                  {t.id === "starter" && <StarterPlanIcon className="w-7 h-7 text-[#FF571A]" />}
                  {t.id === "scale" && <ScalePlanIcon className="w-7 h-7 text-[#FF571A]" />}
                  {t.id === "enterprise" && <EnterprisePlanIcon className="w-7 h-7 text-[#FF571A]" />}
                </div>

                {/* Plan Name */}
                <h3 className="mt-4 text-2xl sm:text-[25px] font-semibold text-[#262626] tracking-tight leading-tight">
                  {t.name}
                </h3>

                {/* Description (Consistent height for perfect price alignment across cards) */}
                <p className="mt-1 text-sm sm:text-[14.5px] text-[#666666] leading-snug min-h-[42px] flex items-start">
                  {t.desc}
                </p>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline gap-1.5 h-[52px]">
                  <span className="text-4xl sm:text-[46px] font-semibold text-[#262626] tracking-tight leading-none">
                    {t.price}
                  </span>
                  {t.period && (
                    <span className="text-sm text-[#858585] font-normal select-none">
                      {t.period}
                    </span>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-6">
                  {t.isHighlighted ? (
                    <button
                      ref={(el) => {
                        triggerButtonRefs.current[t.id] = el;
                      }}
                      type="button"
                      onClick={() => openModal(t)}
                      className="w-full h-11 bg-[#FF571A] text-white hover:bg-[#E04D14] active:bg-[#CC4410] transition-colors duration-150 rounded-[8px] font-semibold text-sm flex items-center justify-center shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
                    >
                      View plan details
                    </button>
                  ) : (
                    <button
                      ref={(el) => {
                        triggerButtonRefs.current[t.id] = el;
                      }}
                      type="button"
                      onClick={() => openModal(t)}
                      className="w-full h-11 border border-[#262626] bg-white text-[#262626] hover:bg-[#F5F5F3] active:bg-[#ECECE9] transition-colors duration-150 rounded-[8px] font-semibold text-sm flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#262626]"
                    >
                      View plan details
                    </button>
                  )}
                </div>

                {/* Fine Divider */}
                <div className="w-full h-px bg-[#E8E8E5] my-6" />

                {/* Proposed Features Label */}
                <div className="text-[11px] sm:text-[12px] font-medium tracking-wider text-[#858585] uppercase select-none">
                  PROPOSED FEATURES
                </div>

                {/* Feature List */}
                <ul className="mt-4 space-y-3 text-sm sm:text-[14.5px] text-[#262626]">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        className="w-4 h-4 text-[#FF571A] stroke-[2.2] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* ============================================================== */}
        {/* 4. CENTERED COMPARISON TOGGLE & QUIET USAGE NOTE */}
        {/* ============================================================== */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center text-center">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            aria-expanded={showComparison}
            aria-controls="pricing-comparison-table"
            className="inline-flex items-center gap-1.5 text-sm sm:text-[14.5px] font-medium text-[#262626] hover:text-[#FF571A] underline underline-offset-4 decoration-[#B0B0B0] hover:decoration-[#FF571A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-xs"
          >
            <span>{showComparison ? "Hide plan details" : "Compare plan details"}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                showComparison ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Quiet usage note */}
          <p className="mt-3.5 sm:mt-4 text-xs sm:text-[13px] text-[#858585] font-normal leading-normal max-w-xl">
            Model and tool usage may affect your requirements.
          </p>
        </div>

        {/* ============================================================== */}
        {/* 5. EXPANDABLE TECHNICAL COMPARISON TABLE */}
        {/* ============================================================== */}
        {showComparison && (
          <div
            id="pricing-comparison-table"
            className="mt-8 rounded-[12px] border border-[#E8E8E5] bg-white p-5 sm:p-7 shadow-xs animate-in fade-in duration-200 overflow-x-auto"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[#FF571A] mb-1 select-none">
              PROPOSED SPECIFICATIONS
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-[#262626] mb-6">
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
                    <td className="py-3.5 pr-4 font-medium text-[#262626]">{r.feature}</td>
                    <td className="py-3.5 px-4 text-[#666666]">{r.free}</td>
                    <td className="py-3.5 px-4 text-[#262626] font-medium">{r.starter}</td>
                    <td className="py-3.5 px-4 text-[#666666]">{r.scale}</td>
                    <td className="py-3.5 pl-4 text-[#262626] font-medium">{r.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 6. ACCESSIBLE PLAN DETAILS MODAL */}
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
                  <span className="text-2xl font-bold text-[#262626]">
                    {selectedPlan.price}
                  </span>
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
              <p className="leading-relaxed text-[#666666]">
                {selectedPlan.detailsSummary}
              </p>

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
                These plan details and pricing represent proposed specifications. Final usage allowances and commercial availability are not yet confirmed.
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
                href="/coming-soon"
                onClick={closeModal}
                className="px-4 py-2.5 bg-[#FF571A] text-white hover:bg-[#E04D14] transition-colors rounded-[8px] text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
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
