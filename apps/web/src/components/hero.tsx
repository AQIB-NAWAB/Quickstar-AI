"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HeroBusinessConveyor } from "./hero-business-conveyor";

export function Hero() {
  return (
    <section className="relative w-full bg-[#FAFAF8] quickstart-hero pt-6 sm:pt-7 lg:pt-6 pb-4">
      {/* Centered Editorial Composition Container (~1400px max) */}
      <div className="landing-container flex flex-col items-center text-center">

        {/* 1. Centered Eyebrow (y ≈ 40–52px) */}
        <div className="inline-flex items-center justify-center mb-2.5 sm:mb-3">
          <span className="landing-eyebrow landing-eyebrow-muted">
            THE OPERATING LAYER FOR MODERN BUSINESS
          </span>
        </div>

        {/* 2. Semantic Two-Line Headline (y ≈ 75–195px) */}
        <h1 className="hero-title text-[36px] sm:text-[48px] md:text-[54px] lg:text-[60px] xl:text-[64px] font-bold text-[#262626] tracking-[-0.035em] leading-[1.05] max-w-[1080px] mb-3">
          <span className="sm:block">AI agents that find, call,</span>{" "}
          <span className="sm:block">
            and <span className="text-[#FF571A]">get work done.</span>
          </span>
        </h1>

        {/* 3. Centered Supporting Paragraph (y ≈ 218–260px) */}
        <p className="hero-description landing-description max-w-[760px] mb-4">
          QuickStart brings lead generation, voice, conversations, tools, campaigns,
          and automation into one place — so your agents can do more than talk.
        </p>

        {/* 4. Compact Centered CTA Row (y ≈ 278–322px) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-5 mb-1 sm:mb-2">
          {/* Primary CTA: Start building → */}
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 h-[44px] px-5 sm:px-6 rounded-[8px] bg-[#FF571A] hover:bg-[#E04810] text-[15px] font-semibold text-white transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
          >
            <span>Start building</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2] transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          {/* Secondary CTA: See how it works ↗ */}
          <Link
            href="#how-it-works"
            className="group inline-flex items-center justify-center gap-1.5 h-[44px] px-4 text-[15px] font-medium text-[#262626] hover:text-[#FF571A] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
          >
            <span>See how it works</span>
            <ArrowUpRight className="w-4 h-4 stroke-[2] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* 5. Isometric Business Conveyor Scene (y ≈ 300–655px) */}
        <div className="w-full flex justify-center mt-0">
          <HeroBusinessConveyor />
        </div>

      </div>
    </section>
  );
}
