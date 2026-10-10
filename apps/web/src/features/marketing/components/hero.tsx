"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HeroConversationPreview } from "./hero-conversation-preview";

export function Hero() {
  return (
    <section className="relative w-full bg-[#FAFAF8] overflow-hidden">
      {/* Main Hero Centered Container */}
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 xl:gap-16 items-start">
          
          {/* ============================================================ */}
          {/* Left Column: Headline, Description, Actions & Supporting Copy (~47%) */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-start max-w-2xl pt-1 sm:pt-2">
            {/* Eyebrow */}
            <div className="hero-entrance-1 inline-flex items-center gap-2.5 mb-7 lg:mb-8">
              <BrandLogo size={18} className="w-[18px] h-[18px] shrink-0" />
              <span className="text-[14px] sm:text-[15px] font-medium text-[#FF571A]">
                AI agents for your business
              </span>
            </div>

            {/* Headline: Three intentional lines on desktop */}
            <h1 className="hero-entrance-2 text-[44px] sm:text-[56px] md:text-[64px] lg:text-[68px] xl:text-[76px] font-bold tracking-tight text-[#262626] leading-[1.08] mb-7 sm:mb-8">
              <span className="block">Your business.</span>
              <span className="block">Your knowledge.</span>
              <span className="block text-[#FF571A]">Your AI agent.</span>
            </h1>

            {/* Supporting Paragraph */}
            <p className="hero-entrance-3 text-[18px] sm:text-[19px] lg:text-[20px] text-[#666666] leading-[1.6] max-w-[530px] mb-8 lg:mb-10 font-normal">
              Build an AI agent that answers questions using your company information and works with the tools you already use.
            </p>

            {/* Actions: Primary "Get started" and Secondary "See it in action" */}
            <div className="hero-entrance-4 flex flex-wrap items-center gap-6 sm:gap-8 mb-8 lg:mb-10">
              {/* Primary Action Button */}
              <Link
                href="/coming-soon"
                className="group inline-flex items-center justify-center gap-2.5 h-[52px] px-7 min-w-[170px] rounded-[8px] bg-[#FF571A] hover:bg-[#E04810] text-[16px] font-semibold text-white transition-all duration-200 motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] shadow-none"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4 stroke-[2] transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              {/* Secondary Action Link */}
              <Link
                href="#playground"
                className="group inline-flex items-center gap-2.5 text-[16px] font-medium text-[#262626] hover:text-[#FF571A] transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] py-2"
              >
                <PlayCircle className="w-6 h-6 stroke-[1.8] text-[#262626] group-hover:text-[#FF571A] transition-colors duration-200" />
                <span>See it in action</span>
              </Link>
            </div>

            {/* Supporting Line */}
            <p className="hero-entrance-5 text-[13px] sm:text-[14px] text-[#858585] font-normal tracking-normal">
              Answer questions. Find information. Get things done.
            </p>
          </div>

          {/* ============================================================ */}
          {/* Right Column: Scenario Nav & Conversation Preview (~49%) */}
          {/* ============================================================ */}
          <div className="hero-entrance-preview lg:col-span-6 xl:col-span-6 flex flex-col items-center lg:items-end w-full">
            <HeroConversationPreview />
          </div>

        </div>
      </div>
    </section>
  );
}
