"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Check, ChevronRight, ChevronDown, X, UserRound, Plug, Layers, Building2 } from "lucide-react";
import "@/features/marketing/styles/pricing.css";

interface PlanTier {
  id: "free" | "starter" | "scale" | "enterprise";
  name: string;
  desc: string;
  price: string;
  period?: string;
  actionText: string;
  actionHref?: string;
  features: string[];
  isDiscussionTopic?: boolean;
  detailsTitle: string;
  detailsSummary: string;
  detailsItems: string[];
}

const PLANS: PlanTier[] = [
  {
    id: "free",
    name: "Free",
    desc: "Try your first agent.",
    price: "$0",
    period: "/ month",
    actionText: "Start free",
    actionHref: "/register",
    features: [
      "Build an agent",
      "Publish your agent",
      "Review conversations",
    ],
    detailsTitle: "What’s in Free",
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
    desc: "Connect your business tools.",
    price: "$49",
    period: "/ month",
    actionText: "Choose Starter",
    actionHref: "/register",
    features: [
      "Add your business information",
      "Connect tools",
      "Give your team access",
    ],
    detailsTitle: "What’s in Starter",
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
    desc: "Manage more agents.",
    price: "$199",
    period: "/ month",
    actionText: "Choose Scale",
    actionHref: "/register",
    features: [
      "Create multiple agents",
      "Manage workspace access",
      "Choose how models are used",
    ],
    detailsTitle: "What’s in Scale",
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
    desc: "Plan a custom setup.",
    price: "Custom",
    actionText: "Talk to us",
    features: [
      "Discuss deployment",
      "Review security needs",
      "Arrange support",
    ],
    isDiscussionTopic: true,
    detailsTitle: "Enterprise requirements",
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

const COMPARISON_ROWS = [
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

export function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  const closeModal = useCallback(() => setSelectedPlan(null), []);
  const openModal = useCallback((plan: PlanTier, trigger: HTMLElement) => {
    activeTriggerRef.current = trigger;
    setSelectedPlan(plan);
  }, []);



  useEffect(() => {
    if (!selectedPlan) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = Array.from(document.body.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement &&
        !node.contains(modalRef.current) && !node.hasAttribute("inert")
    );
    background.forEach(node => node.setAttribute("inert", ""));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      } else if (e.key === "Tab" && modalRef.current) {
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
      document.body.style.overflow = originalOverflow;
      background.forEach(node => node.removeAttribute("inert"));
      activeTriggerRef.current?.focus({ preventScroll: true });
    };
  }, [selectedPlan, closeModal]);

  return (
    <section

      id="pricing"
      className="marketing-pricing-section"
      aria-labelledby="pricing-heading"
    >
      <div className="marketing-pricing-container">
        {/* ============================================================== */}
        {/* 1. CENTERED HEADER                                             */}
        {/* ============================================================== */}
        <div className="marketing-pricing-header">
          <div className="marketing-pricing-eyebrow">
            <span>PRICING</span>
          </div>

          <h2 id="pricing-heading" className="marketing-pricing-title">
            Choose where <em>to start.</em>
          </h2>

          <p className="marketing-pricing-description">Start small. Choose the setup that fits your team.</p>
        </div>

        {/* ============================================================== */}
        {/* 2. FOUR EQUAL-HEIGHT CARDS                                     */}
        {/* ============================================================== */}
        <div className="marketing-pricing-grid" role="list" aria-label="Available pricing plans">
          {PLANS.map((plan) => {
            const isStarter = plan.id === "starter";
            const PlanIcon = {free:UserRound,starter:Plug,scale:Layers,enterprise:Building2}[plan.id];
            return (
              <article
                key={plan.id}
                role="listitem"
                className={`marketing-pricing-card ${
                  isStarter ? "marketing-pricing-card--starter" : ""
                }`}
              >
                {/* Plan Name */}
                <h3 className="marketing-pricing-card-name"><PlanIcon size={20} aria-hidden="true" />{plan.name}</h3>

                {/* Audience Description */}
                <p className="marketing-pricing-card-desc">{plan.desc}</p>

                {/* Price block */}
                <div className="marketing-pricing-card-price-block">
                  <span
                    className={`marketing-pricing-card-price ${
                      plan.price === "Custom" ? "marketing-pricing-card-price--custom" : ""
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="marketing-pricing-card-period">{plan.period}</span>
                  )}
                </div>

                {/* Primary Action Button */}
                {plan.actionHref ? (
                  <Link
                    href={plan.actionHref}
                    className={`marketing-pricing-card-btn ${
                      isStarter
                        ? "marketing-pricing-card-btn--solid"
                        : "marketing-pricing-card-btn--outline"
                    }`}
                  >
                    {plan.actionText}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => openModal(plan, event.currentTarget)}
                    className="marketing-pricing-card-btn marketing-pricing-card-btn--outline"
                  >
                    {plan.actionText}
                  </button>
                )}

                {/* Card Divider */}
                <hr className="marketing-pricing-card-divider" aria-hidden="true" />

                {/* Features List */}
                <ul className="marketing-pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="marketing-pricing-feature-item">
                      <Check className="marketing-pricing-feature-icon" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Pinned View Details Control */}
                <button
                  type="button"
                  onClick={(event) => openModal(plan, event.currentTarget)}
                  aria-label={`View ${plan.name} plan details`}
                  className="marketing-pricing-details-btn"
                >
                  <span>Plan details</span>
                  <ChevronRight
                    className="marketing-pricing-details-chevron"
                    aria-hidden="true"
                  />
                </button>
              </article>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* 3. SHARED USAGE NOTE & DISCLOSURE TRIGGER                     */}
        {/* ============================================================== */}
        <div className="marketing-pricing-footer">

          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            aria-expanded={showComparison}
            aria-controls="pricing-comparison-table"
            className="marketing-pricing-compare-btn"
          >
            <span>Compare all plans</span>
            <ChevronDown
              className={`marketing-pricing-compare-chevron ${
                showComparison ? "marketing-pricing-compare-chevron--rotated" : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* ============================================================== */}
        {/* 4. EXPANDABLE TECHNICAL COMPARISON TABLE                       */}
        {/* ============================================================== */}
        {showComparison && (
          <div
            id="pricing-comparison-table"
            className="marketing-pricing-comparison-wrap"
            role="region"
            aria-label="Proposed plan comparison"
            tabIndex={0}
          >
            <table className="marketing-pricing-table">
              <caption className="sr-only">Proposed features and prices by plan. Final allowances are not confirmed.</caption>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Free ($0)</th>
                  <th scope="col" className="marketing-pricing-table-th--starter">
                    Starter ($49)
                  </th>
                  <th scope="col">Scale ($199)</th>
                  <th scope="col">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <td className="text-[#666666]">{row.free}</td>
                    <td className="marketing-pricing-table-td--starter">{row.starter}</td>
                    <td className="text-[#666666]">{row.scale}</td>
                    <td className="font-medium text-[#262626]">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. ACCESSIBLE PLAN DETAILS MODAL                               */}
      {/* ============================================================== */}
      {selectedPlan && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
          className="marketing-pricing-modal-backdrop"
          onClick={closeModal}
        >
          <div
            ref={modalRef}
            className="marketing-pricing-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="marketing-pricing-modal-header">
              <div>
                <div className="marketing-pricing-modal-eyebrow">
                  PROPOSED PLAN DETAILS
                </div>
                <h3 id="pricing-modal-title" className="marketing-pricing-modal-title">
                  {selectedPlan.detailsTitle}
                </h3>
                <div className="marketing-pricing-modal-price">
                  <span>{selectedPlan.price}</span>
                  {selectedPlan.period && (
                    <span className="marketing-pricing-modal-period">
                      {selectedPlan.period}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="marketing-pricing-modal-close-btn"
                aria-label="Close plan details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="marketing-pricing-modal-body">
              <p className="marketing-pricing-modal-summary">
                {selectedPlan.detailsSummary}
              </p>

              <div>
                <div className="marketing-pricing-modal-scope-title">
                  Proposed Scope &amp; Capabilities
                </div>
                <ul className="marketing-pricing-modal-items">
                  {selectedPlan.detailsItems.map((item) => (
                    <li key={item} className="marketing-pricing-modal-item">
                      <Check
                        className="marketing-pricing-modal-check"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Informational notice */}
              <div className="marketing-pricing-modal-notice">
                These plan details and pricing represent proposed specifications. Final usage
                allowances and commercial availability are not yet confirmed.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="marketing-pricing-modal-footer">
              <button
                type="button"
                onClick={closeModal}
                className="marketing-pricing-modal-dismiss-btn"
              >
                Close
              </button>
              <Link
                href="/register"
                onClick={closeModal}
                className="marketing-pricing-modal-action-btn"
              >
                <span>Create account</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
