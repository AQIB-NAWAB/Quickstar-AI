"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full bg-[#FAFAF8] text-[#262626] pt-10 sm:pt-12 min-[1100px]:pt-14 pb-8 overflow-hidden">
      <div className="landing-container">
        {/* ============================================================== */}
        {/* ASYMMETRIC MAIN FOOTER BODY: ORANGE BRAND + NAVIGATION        */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] items-stretch min-[1100px]:min-h-[420px] xl:min-h-[450px]">
          {/* ------------------------------------------------------------ */}
          {/* LEFT: ORANGE BRAND AREA                                      */}
          {/* ------------------------------------------------------------ */}
          <div className="bg-[#FF571A] rounded-[16px] min-[1100px]:rounded-r-none p-6 sm:p-10 min-[1100px]:p-10 xl:px-12 xl:pt-[52px] xl:pb-12 flex flex-col justify-between h-full text-[#262626]">
            {/* Upper brand block: Wordmark + Two-line description */}
            <div>
              {/* Ignition mark and wordmark */}
              <Link
                href="/"
                className="inline-flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#262626] rounded-[2px]"
                aria-label="QuickStartAI home"
              >
                <BrandLogo size={56} fillColor="#262626" animated className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 shrink-0" aria-hidden="true" />
                <span className="text-[30px] sm:text-[36px] xl:text-[42px] font-bold text-[#262626] tracking-[-0.045em] leading-none select-none block">
                  QuickStart<span> AI</span>
                </span>
              </Link>

              {/* Exact two-line description */}
              <p className="mt-5 sm:mt-6 xl:mt-4 text-[22px] sm:text-[26px] min-[1100px]:text-[32px] xl:text-[40px] font-medium text-[#262626] leading-[1.2] tracking-[-0.015em] max-w-[460px] m-0">
                AI agents built around
                <br className="hidden sm:inline" /> your business.
              </p>
            </div>

            {/* Lower brand block: Plain GitHub Link */}
            <div className="mt-8 min-[1100px]:mt-auto pt-6">
              <a
                href="https://github.com/AQIB-NAWAB/Quickstar-AI"
                target="_blank"
                rel="noreferrer"
                aria-label="View QuickStartAI on GitHub (opens in a new tab)"
                className="inline-flex items-center gap-3 xl:gap-4 min-h-[44px] text-[16px] sm:text-[18px] min-[1100px]:text-[20px] xl:text-[24px] font-medium text-[#262626] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#262626] rounded-[2px] transition-all"
              >
                {/* Small GitHub SVG Icon */}
                <svg
                  className="w-6 h-6 xl:w-8 xl:h-8 text-[#262626] shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>View on GitHub</span>
                {/* Small Northeast Arrow Icon */}
                <svg
                  className="w-4 h-4 xl:w-5 xl:h-5 text-[#262626] shrink-0 stroke-[2]"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M 3.5 10.5 L 10.5 3.5 M 4 3.5 H 10.5 V 10" />
                </svg>
              </a>
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* RIGHT: WARM OFF-WHITE NAVIGATION AREA                        */}
          {/* ------------------------------------------------------------ */}
          <div className="w-full flex flex-col justify-start pt-0 min-[1100px]:pt-[28px] min-[1100px]:pl-12 pb-2 mt-8 min-[1100px]:mt-0">
            {/* Group 1: EXPLORE */}
            <nav aria-label="Explore navigation" className="w-full">
              <h3 className="text-[13px] sm:text-[14px] min-[1100px]:text-[15px] xl:text-[17px] font-semibold tracking-[0.14em] text-[#666666] uppercase m-0 mb-5 sm:mb-6 xl:mb-10">
                EXPLORE
              </h3>
              <div className="grid grid-cols-2 gap-x-8 sm:gap-x-12 min-[1100px]:gap-x-8 xl:gap-x-0 gap-y-4 sm:gap-y-5 min-[1100px]:gap-y-6 xl:gap-y-8">
                {/* Row 1: Product, How it works */}
                <Link
                  href="#platform"
                  className="inline-flex items-center min-h-[44px] text-[18px] sm:text-[22px] min-[1100px]:text-[26px] xl:text-[32px] font-normal text-[#262626] leading-snug w-fit group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                >
                  <span className="relative">
                    Product
                    <span
                      className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#FF571A] scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-150 origin-left motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </Link>

                <Link
                  href="#how-it-works"
                  className="inline-flex items-center min-h-[44px] text-[18px] sm:text-[22px] min-[1100px]:text-[26px] xl:text-[32px] font-normal text-[#262626] leading-snug w-fit group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                >
                  <span className="relative">
                    How it works
                    <span
                      className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#FF571A] scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-150 origin-left motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </Link>

                {/* Row 2: See it in action, Pricing */}
                <Link
                  href="#playground"
                  className="inline-flex items-center min-h-[44px] text-[18px] sm:text-[22px] min-[1100px]:text-[26px] xl:text-[32px] font-normal text-[#262626] leading-snug w-fit group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                >
                  <span className="relative">
                    See it in action
                    <span
                      className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#FF571A] scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-150 origin-left motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </Link>

                <Link
                  href="#pricing"
                  className="inline-flex items-center min-h-[44px] text-[18px] sm:text-[22px] min-[1100px]:text-[26px] xl:text-[32px] font-normal text-[#262626] leading-snug w-fit group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                >
                  <span className="relative">
                    Pricing
                    <span
                      className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#FF571A] scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-150 origin-left motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </div>
            </nav>

            {/* Divider: Thin grey rule spanning navigation width */}
            <div className="w-full h-px bg-[#CFCFCC] my-7 sm:my-8 xl:my-10" aria-hidden="true" />

            {/* Group 2: ACCOUNT */}
            <nav aria-label="Account navigation" className="w-full">
              <h3 className="text-[13px] sm:text-[14px] min-[1100px]:text-[15px] xl:text-[17px] font-semibold tracking-[0.14em] text-[#666666] uppercase m-0 mb-5 sm:mb-6 xl:mb-10">
                ACCOUNT
              </h3>
              <div className="grid grid-cols-2 gap-x-8 sm:gap-x-12 min-[1100px]:gap-x-8 xl:gap-x-0 gap-y-4 sm:gap-y-5 min-[1100px]:gap-y-6 xl:gap-y-8">
                <Link
                  href="/register"
                  className="inline-flex items-center min-h-[44px] text-[18px] sm:text-[22px] min-[1100px]:text-[26px] xl:text-[32px] font-normal text-[#262626] leading-snug w-fit group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                >
                  <span className="relative">
                    Get started
                    <span
                      className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#FF571A] scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-150 origin-left motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center min-h-[44px] text-[18px] sm:text-[22px] min-[1100px]:text-[26px] xl:text-[32px] font-normal text-[#262626] leading-snug w-fit group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                >
                  <span className="relative">
                    Sign in
                    <span
                      className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#FF571A] scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-150 origin-left motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </div>
            </nav>
          </div>
        </div>

        {/* ============================================================== */}
        {/* FULL-WIDTH DIVIDER & COPYRIGHT ROW                            */}
        {/* ============================================================== */}
        <div
          className="w-full h-px bg-[#CFCFCC] mt-8 min-[1100px]:mt-2 mb-5 sm:mb-6 xl:mb-10"
          aria-hidden="true"
        />
        <div className="text-[13px] sm:text-[14px] xl:text-[18px] text-[#666666] font-normal leading-normal select-none">
          &copy; {currentYear} QuickStart AI
        </div>
      </div>
    </footer>
  );
}
