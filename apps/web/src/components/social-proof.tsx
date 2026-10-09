"use client";

import React from "react";

export function SocialProof() {
  const providers = ["OpenAI", "Anthropic", "Twilio", "AWS"];

  return (
    <section className="landing-proof w-full bg-[#FAFAF8] select-none">
      <div className="landing-container">
        <div className="flex flex-col min-[1100px]:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-center sm:text-left">
          {/* Left horizontal hairline divider */}
          <div className="hidden md:block flex-1 h-[1px] bg-[#DADADD]" aria-hidden="true" />

          {/* Infrastructure caption */}
          <span className="landing-eyebrow landing-eyebrow-muted">
            BUILT WITH MODERN AI &amp; CLOUD INFRASTRUCTURE
          </span>

          {/* Muted infrastructure labels */}
          <div className="flex items-center flex-wrap justify-center gap-5 sm:gap-7 lg:gap-8 text-[14px] text-[#666666] font-normal tracking-tight">
            {providers.map((name) => (
              <span key={name} className="transition-colors hover:text-[#141418]">
                {name}
              </span>
            ))}
          </div>

          {/* Right horizontal hairline divider */}
          <div className="hidden md:block flex-1 h-[1px] bg-[#DADADD]" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
