"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroAgentIllustration } from "./hero-agent-illustration";

export function Hero() {
  return (
    <section className="relative w-full bg-[#FAFAF8] overflow-hidden">
      {/* Main Hero Container */}
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 pt-10 pb-14 lg:py-16 min-h-[660px] lg:min-h-[720px] flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
          
          {/* Left Column: Text (~49%) */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center max-w-2xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-7 lg:mb-8">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF571A] shrink-0" />
              <span className="text-[12px] sm:text-[13px] font-mono font-semibold tracking-[0.1em] text-[#FF571A] uppercase">
                KNOWLEDGE + TOOLS + AGENTS
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] xl:text-[76px] font-bold tracking-tight text-[#262626] leading-[1.08] mb-7">
              <span className="block">Build agents that</span>
              <span className="block">
                know <span className="text-[#FF571A]">your business.</span>
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-lg sm:text-[19px] lg:text-[20px] text-neutral-600 leading-relaxed max-w-xl mb-9">
              Connect company knowledge and API tools.
              <br className="hidden sm:inline" />
              Publish an agent. Put it to work in a conversation.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-11">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-[8px] bg-[#FF571A] hover:bg-[#E04810] text-[15px] font-semibold text-white shadow-sm transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
              >
                <span>Start building</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="#playground"
                className="inline-flex items-center justify-center h-[52px] px-6 rounded-[8px] border border-neutral-300 bg-white hover:bg-neutral-50 text-[15px] font-medium text-[#262626] transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
              >
                Try the playground
              </Link>
            </div>

            {/* Capability Annotation */}
            <div className="flex items-center gap-3 text-xs sm:text-[13px] font-mono text-neutral-500">
              <span>Company knowledge</span>
              <span className="text-neutral-300">/</span>
              <span>API tools</span>
              <span className="text-neutral-300">/</span>
              <span>Published versions</span>
            </div>
          </div>

          {/* Right Column: Illustration (~51%) */}
          <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center lg:justify-end">
            <HeroAgentIllustration />
          </div>

        </div>
      </div>

      {/* Bottom Hero Rail */}
      <div className="w-full border-t border-[#E8E8E5]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] sm:text-[12px] font-mono text-neutral-500">
          <span className="tracking-wider uppercase">
            FROM COMPANY CONTEXT TO A USEFUL ANSWER
          </span>
          <div className="flex items-center gap-2 tracking-wide">
            <span className="text-[#FF571A] font-semibold">01</span>
            <span className="text-[#262626]">Connect</span>
            <span className="text-neutral-400">→</span>
            <span className="text-[#FF571A] font-semibold">02</span>
            <span className="text-[#262626]">Publish</span>
            <span className="text-neutral-400">→</span>
            <span className="text-[#FF571A] font-semibold">03</span>
            <span className="text-[#262626]">Run</span>
          </div>
        </div>
      </div>
    </section>
  );
}
