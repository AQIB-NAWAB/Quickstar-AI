"use client";

import { useEffect, useState, useRef } from "react";
import { ArchitectureFlowIllustration } from "./architecture-flow-illustration";
import { X, Layers, ShieldCheck, Database, Cpu, Wrench, Lock } from "lucide-react";

export function InfrastructureSection() {
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
      id="system-architecture"
      ref={sectionRef}
      className="w-full bg-[#f9f9f9] text-[#262626] border-t border-[#dedede] pt-12 pb-20 sm:pt-16 sm:pb-24 overflow-hidden"
    >
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Monospace Section Label */}
        <div className="flex items-center justify-between pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          <span>05 / SYSTEM ARCHITECTURE</span>
          <span className="hidden sm:inline opacity-60">&middot;&nbsp;&nbsp;+&nbsp;&nbsp;&middot;</span>
        </div>

        {/* Top Thin Horizontal Rule */}
        <div className="w-full h-px bg-[#dedede]" />

        {/* Main 2-Column Split: Left Editorial Description vs Right Service Flow Illustration */}
        <div className="pt-8 sm:pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ================= LEFT COLUMN (~36-38%) ================= */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Large Two-Line Heading */}
              <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-medium tracking-tight text-[#262626] leading-[1.08]">
                One entry point.
                <br />
                Purpose-built services.
              </h2>

              {/* Supporting Copy */}
              <p className="mt-4 text-base sm:text-lg text-[#666666] leading-relaxed font-normal">
                Your application talks to one gateway. The runtime connects knowledge, models, tools, and conversation history.
              </p>

              {/* Three Open Numbered Process Rows */}
              <div className="mt-8 sm:mt-10 border-t border-b border-[#dedede] divide-y divide-[#dedede]">
                {/* Row 01: HTTP gateway */}
                <div className="py-6 sm:py-7 flex items-start gap-5 sm:gap-6">
                  <span className="font-mono text-sm sm:text-base text-[#737373] w-6 shrink-0 pt-0.5">
                    01
                  </span>
                  <div>
                    <h3 className="text-xl sm:text-[22px] font-medium text-[#262626] tracking-tight">
                      HTTP gateway
                    </h3>
                    <p className="mt-1 text-sm sm:text-base text-[#666666] leading-relaxed font-normal">
                      Authenticate and route client requests.
                    </p>
                  </div>
                </div>

                {/* Row 02: Agent runtime */}
                <div className="py-6 sm:py-7 flex items-start gap-5 sm:gap-6">
                  <span className="font-mono text-sm sm:text-base text-[#737373] w-6 shrink-0 pt-0.5">
                    02
                  </span>
                  <div>
                    <h3 className="text-xl sm:text-[22px] font-medium text-[#262626] tracking-tight">
                      Agent runtime
                    </h3>
                    <p className="mt-1 text-sm sm:text-base text-[#666666] leading-relaxed font-normal">
                      Load a published version and execute the turn.
                    </p>
                  </div>
                </div>

                {/* Row 03: Conversation service */}
                <div className="py-6 sm:py-7 flex items-start gap-5 sm:gap-6">
                  <span className="font-mono text-sm sm:text-base text-[#737373] w-6 shrink-0 pt-0.5">
                    03
                  </span>
                  <div>
                    <h3 className="text-xl sm:text-[22px] font-medium text-[#262626] tracking-tight">
                      Conversation service
                    </h3>
                    <p className="mt-1 text-sm sm:text-base text-[#666666] leading-relaxed font-normal">
                      Read history and store messages.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actionable Link */}
            <div className="mt-8 sm:mt-10">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-base sm:text-lg font-medium text-[#fa5d19] hover:underline underline-offset-4 transition-all group"
              >
                <span>Explore the architecture</span>
                <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  &nearr;
                </span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62-64%) ================= */}
          <div className="lg:col-span-7 lg:border-l lg:border-[#dedede] lg:pl-10 xl:pl-12 flex flex-col justify-start">
            {/* Right Header Labels: Sits Directly Above Drawing */}
            <div className="flex items-center justify-between pb-3 mb-2 text-xs font-mono">
              <span className="text-[#262626] uppercase tracking-wider font-semibold">
                A CONVERSATION REQUEST
              </span>
              <span className="text-[#737373]">Illustrated flow</span>
            </div>

            {/* Custom SVG Service Flow Drawing (Directly on Page Background) */}
            <div className="w-full flex items-center justify-center">
              <ArchitectureFlowIllustration isAnimating={isIntersecting} />
            </div>
          </div>
        </div>

        {/* Full-Width Bottom Rule & Footer Note */}
        <div className="border-t border-[#dedede] pt-6 mt-12 sm:mt-16 flex items-center justify-between text-xs sm:text-sm font-mono text-[#737373]">
          <span>Conceptual service flow &middot; illustrative animation</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ARCHITECTURE SPECIFICATION MODAL / DETAILS DRAWER */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="arch-modal-title"
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
                  CORE PLATFORM TOPOLOGY
                </div>
                <h3 id="arch-modal-title" className="text-2xl font-medium text-[#262626]">
                  Service Boundaries &amp; Runtime Specifications
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#262626] transition-colors rounded hover:bg-[#f0f0f0]"
                aria-label="Close architecture details modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Concrete Service Breakdown */}
            <div className="mt-6 space-y-6 text-sm text-[#404040]">
              <p className="leading-relaxed">
                QuickStart AI decouples public HTTP ingress from agent execution and persistent storage. Each service enforces strict workspace boundaries and immutable configuration snapshots:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. HTTP Gateway */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>INGRESS</span>
                    <ShieldCheck className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">API Gateway (Port 3000)</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Single public entry point. Validates JWT bearer tokens, enforces fail-closed RBAC from <code className="text-[#fa5d19]">workspace-permissions</code>, and routes traffic downstream.
                  </p>
                </div>

                {/* 2. Agent Runtime */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>ORCHESTRATOR</span>
                    <Cpu className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Agent Runtime (Port 3006)</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Coordinates the turn loop (<code className="text-[#fa5d19]">POST /v1/.../turns</code>). Bounded to a maximum of 5 tool rounds per turn (<code className="text-[#fa5d19]">MAX_TOOL_ROUNDS_PER_TURN = 5</code>).
                  </p>
                </div>

                {/* 3. Published Agent Snapshots */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>CONFIGURATION</span>
                    <Layers className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Agent Service (Port 3003)</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Maintains immutable published releases (e.g. <code className="text-[#fa5d19]">v3 Published</code>). Draft edits never impact live production turns until explicitly published.
                  </p>
                </div>

                {/* 4. Conversation Service */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>PERSISTENCE</span>
                    <Database className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Conversation Service (Port 3004)</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Durable message history with idempotency key deduplication. Retried requests reuse existing messages instead of writing duplicates.
                  </p>
                </div>

                {/* 5. Knowledge Retrieval */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>RETRIEVAL</span>
                    <Database className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Knowledge Service (Port 3005)</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Hybrid BM25 keyword + OpenSearch dense vector retrieval. Enforces strict workspace partition filters on every search pass.
                  </p>
                </div>

                {/* 6. Secrets & Tool Sandboxing */}
                <div className="p-4 border border-[#dedede] bg-[#fafafa] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
                    <span>SECURITY</span>
                    <Lock className="w-4 h-4 text-[#fa5d19]" />
                  </div>
                  <div className="font-semibold text-[#262626]">Secrets Vault (Port 3011)</div>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Envelope-encrypted credential injection for third-party API tools. Keys never leak into client logs or browser bundles.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-[#dedede] flex items-center justify-between text-xs font-mono text-[#737373]">
              <span>QuickStart AI Architecture &middot; Verified Contracts</span>
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
