"use client";

import { useEffect, useState, useRef } from "react";
import { ModelResilienceIllustration } from "./model-resilience-illustration";
import { X, Cpu, Clock, RefreshCw, GitFork, ShieldAlert } from "lucide-react";

export function ArchitectureSection() {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  return (
    <section
      id="architecture"
      ref={sectionRef}
      className="w-full bg-[#f9f9f9] text-[#262626] border-t border-[#dedede] pt-12 pb-20 sm:pt-16 sm:pb-24 overflow-hidden"
    >
      {/* Anchor for direct model resilience links */}
      <div id="model-resilience" className="sr-only" />

      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Monospace Section Label */}
        <div className="flex items-center justify-between pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          <span>06 / MODEL RESILIENCE</span>
          <span className="hidden sm:inline opacity-60">&middot;&nbsp;&middot;&nbsp;&middot;&nbsp;+</span>
        </div>

        {/* Top Thin Horizontal Rule */}
        <div className="w-full h-px bg-[#dedede]" />

        {/* Section Heading Row */}
        <div className="pt-8 pb-10 sm:pb-14 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <h2 className="text-4xl sm:text-5xl lg:text-[58px] font-medium tracking-tight text-[#262626] leading-[1.08]">
            When a provider fails,
            <br />
            the request has a plan.
          </h2>

          <p className="text-lg sm:text-xl text-[#666666] leading-relaxed font-normal max-w-md pt-2 lg:pt-3">
            Timeouts, limited retries, and configured fallback keep model requests bounded.
          </p>
        </div>

        {/* Main 2-Column Split: Left Custom Illustration (~62%) vs Right Explanations (~38%) */}
        <div className="border-t border-[#dedede] pt-8 sm:pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ================= LEFT COLUMN: Custom Failure Path Illustration (~62%) ================= */}
          <div className="lg:col-span-7 flex flex-col justify-start">
            {/* Header Above Drawing */}
            <div className="pb-3 mb-2 text-xs font-mono uppercase tracking-wider text-[#737373] font-medium">
              ILLUSTRATIVE FAILURE PATH
            </div>

            {/* Custom SVG Drawing (Directly on Page Background) */}
            <div className="w-full flex items-center justify-center">
              <ModelResilienceIllustration isAnimating={isIntersecting} />
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Open Explanatory Rows (~38%) ================= */}
          <div className="lg:col-span-5 lg:border-l lg:border-[#dedede] lg:pl-10 xl:pl-12 flex flex-col justify-between">
            {/* Three Open Rows Separated by Fine Horizontal Rules */}
            <div className="border-t border-b border-[#dedede] divide-y divide-[#dedede]">
              {/* Row 01: Set a timeout */}
              <div className="py-6 sm:py-7 flex items-start gap-5 sm:gap-6">
                <span className="font-sans text-2xl sm:text-3xl font-medium text-[#fa5d19] w-8 shrink-0 leading-none pt-0.5">
                  01
                </span>
                <div>
                  <h3 className="text-xl sm:text-[23px] font-medium text-[#262626] tracking-tight">
                    Set a timeout
                  </h3>
                  <p className="mt-1.5 text-base sm:text-[17px] text-[#666666] leading-relaxed font-normal">
                    Give each provider call a deadline.
                  </p>
                </div>
              </div>

              {/* Row 02: Retry selectively */}
              <div className="py-6 sm:py-7 flex items-start gap-5 sm:gap-6">
                <span className="font-sans text-2xl sm:text-3xl font-medium text-[#fa5d19] w-8 shrink-0 leading-none pt-0.5">
                  02
                </span>
                <div>
                  <h3 className="text-xl sm:text-[23px] font-medium text-[#262626] tracking-tight">
                    Retry selectively
                  </h3>
                  <p className="mt-1.5 text-base sm:text-[17px] text-[#666666] leading-relaxed font-normal">
                    Retry transient failures within a limited policy.
                  </p>
                </div>
              </div>

              {/* Row 03: Configure fallback */}
              <div className="py-6 sm:py-7 flex items-start gap-5 sm:gap-6">
                <span className="font-sans text-2xl sm:text-3xl font-medium text-[#fa5d19] w-8 shrink-0 leading-none pt-0.5">
                  03
                </span>
                <div>
                  <h3 className="text-xl sm:text-[23px] font-medium text-[#262626] tracking-tight">
                    Configure fallback
                  </h3>
                  <p className="mt-1.5 text-base sm:text-[17px] text-[#666666] leading-relaxed font-normal">
                    Use an alternate model when the configured failure path allows it.
                  </p>
                </div>
              </div>
            </div>

            {/* Invariant Note with Thin Orange Vertical Marker */}
            <div className="mt-8 border-l-2 border-[#fa5d19] pl-4 py-0.5">
              <p className="text-sm sm:text-[15px] text-[#666666] leading-relaxed font-normal">
                Once streaming output begins, the gateway does not restart the completion.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width Bottom Rule & Footer */}
        <div className="border-t border-[#dedede] pt-6 mt-12 sm:mt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm font-mono text-[#737373]">
          <div>Illustrated policy &middot; no live provider request</div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-[#fa5d19] hover:underline underline-offset-4 transition-all group font-medium"
          >
            <span>Explore model routing</span>
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              &nearr;
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODEL ROUTING & RESILIENCE SPECIFICATIONS MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-resilience-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-white border border-[#dedede] shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#dedede]">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#fa5d19] mb-1">
                  MODEL GATEWAY POLICIES
                </div>
                <h3 id="model-resilience-title" className="text-2xl font-medium text-[#262626]">
                  Model Routing &amp; Failure Recovery Specifications
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#262626] transition-colors rounded hover:bg-[#f0f0f0]"
                aria-label="Close model routing details modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-6 space-y-6 text-sm text-[#404040]">
              <p className="leading-relaxed">
                The QuickStart AI Model Gateway (<code className="text-[#fa5d19]">CompletionOrchestrator</code>) manages upstream provider unpredictability through bounded execution policies:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Timeout Boundary */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>DEADLINE</span>
                    <Clock className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Enforced Timeouts</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Provider calls race against an upstream deadline (<code className="text-[#fa5d19]">completionTimeoutMs</code>). If a provider hangs, it fails with <code className="text-[#fa5d19]">UPSTREAM_TIMEOUT</code>.
                  </p>
                </div>

                {/* 2. Selective Retries */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>RETRY POLICY</span>
                    <RefreshCw className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Bounded Retry Loop</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Only transient errors (network drops, rate limits, timeouts) are retried for a maximum of 2 attempts (<code className="text-[#fa5d19]">attempt &lt;= 2</code>).
                  </p>
                </div>

                {/* 3. Configured Fallback */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>FALLBACK MODEL</span>
                    <GitFork className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Explicit Fallback Path</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    If the primary provider is exhausted and a <code className="text-[#fa5d19]">fallback_model</code> is defined in the completion request, the orchestrator switches models without caller intervention.
                  </p>
                </div>

                {/* 4. Streaming Invariant */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>STREAMING</span>
                    <ShieldAlert className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">No Mid-Stream Restarts</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Once token output has begun (<code className="text-[#fa5d19]">tokensStarted() === true</code>), retries and fallbacks are strictly blocked to avoid corrupted or duplicate response streams.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-[#dedede] flex items-center justify-between text-xs font-mono text-[#737373]">
              <span>services/model-gateway &middot; Runtime Verified</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-[#262626] text-white hover:bg-[#fa5d19] transition-colors rounded text-xs font-sans font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
