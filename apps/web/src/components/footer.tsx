"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: isReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <footer className="w-full bg-[#FAFAF8] text-[#262626] border-t border-[#E0E0DD]">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8">
        {/* ============================================================== */}
        {/* 1. UPPER REGION: BRAND INTRO, EXPLORE, ACCOUNT */}
        {/* ============================================================== */}
        <div className="py-10 sm:py-12 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 lg:gap-12 items-start">
          {/* Brand Block (~50% desktop) */}
          <div className="md:col-span-12 lg:col-span-6 flex flex-col items-start">
            {/* Brand Lockup */}
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 sm:gap-3 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[4px]"
            >
              <BrandLogo
                size={30}
                fillColor="#FF571A"
                className="w-7 h-7 sm:w-[30px] sm:h-[30px] shrink-0 transition-transform duration-150 group-hover:scale-105"
                aria-hidden="true"
              />
              <span className="text-[26px] sm:text-[28px] font-bold text-[#262626] tracking-tight leading-none">
                QuickStart<span className="text-[#FF571A]">AI</span>
              </span>
            </Link>

            {/* Exact Brand Description */}
            <p className="mt-3.5 sm:mt-4 text-[15px] sm:text-[16px] text-[#666666] font-normal leading-normal max-w-sm">
              AI agents built around your business.
            </p>

            {/* Outlined GitHub Link Button */}
            <a
              href="https://github.com/AQIB-NAWAB/Quickstar-AI"
              target="_blank"
              rel="noreferrer"
              className="group mt-5 sm:mt-6 inline-flex items-center gap-2.5 h-[42px] px-3.5 bg-white/70 hover:bg-white border border-[#E0E0DD] hover:border-[#C8C8C5] rounded-[7px] text-[14px] font-medium text-[#262626] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] select-none"
            >
              {/* GitHub SVG Icon */}
              <svg
                className="w-4 h-4 text-[#262626] shrink-0"
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
              {/* External Diagonal Arrow Icon */}
              <svg
                className="w-3.5 h-3.5 text-[#666666] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M 3.5 10.5 L 10.5 3.5 M 4 3.5 H 10.5 V 10" />
              </svg>
            </a>
          </div>

          {/* Navigation Columns Container (~50% desktop, split 25% Explore / 25% Account) */}
          <div className="md:col-span-12 lg:col-span-6 grid grid-cols-2 gap-8 sm:gap-12">
            {/* Explore Navigation */}
            <nav aria-label="Explore navigation">
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#262626] mb-4 sm:mb-5">
                Explore
              </h3>
              <ul className="space-y-3 sm:space-y-3.5 text-[15px] text-[#666666]">
                <li>
                  <Link
                    href="#platform"
                    className="inline-block py-0.5 hover:text-[#FF571A] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                  >
                    Product
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="inline-block py-0.5 hover:text-[#FF571A] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    href="#playground"
                    className="inline-block py-0.5 hover:text-[#FF571A] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                  >
                    See it in action
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="inline-block py-0.5 hover:text-[#FF571A] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Account Navigation */}
            <nav aria-label="Account navigation">
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#262626] mb-4 sm:mb-5">
                Account
              </h3>
              <ul className="space-y-3 sm:space-y-3.5 text-[15px] text-[#666666]">
                <li>
                  <Link
                    href="/coming-soon"
                    className="inline-block py-0.5 hover:text-[#FF571A] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                  >
                    Get started
                  </Link>
                </li>
                <li>
                  <Link
                    href="/coming-soon"
                    className="inline-block py-0.5 hover:text-[#FF571A] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#FF571A] rounded-[2px]"
                  >
                    Sign in
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MIDDLE REGION: LARGE CENTERED WORDMARK */}
        {/* ============================================================== */}
        <div className="w-full h-px bg-[#E0E0DD]" />
        <div
          className="py-7 sm:py-9 lg:py-11 flex items-center justify-center select-none overflow-hidden"
          aria-hidden="true"
        >
          <div className="text-[clamp(44px,9.5vw,120px)] font-extrabold tracking-[-0.05em] leading-none text-[#262626] whitespace-nowrap text-center">
            QuickStart<span className="text-[#FF571A]">AI</span>
          </div>
        </div>
        <div className="w-full h-px bg-[#E0E0DD]" />

        {/* ============================================================== */}
        {/* 3. BOTTOM UTILITY ROW: COPYRIGHT & BACK TO TOP */}
        {/* ============================================================== */}
        <div className="py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#858585]">
          <div>
            &copy; {currentYear} QuickStart AI
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="group inline-flex items-center gap-2 hover:text-[#262626] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[2px] py-1 px-1 cursor-pointer select-none"
            aria-label="Back to top of page"
          >
            <span>Back to top</span>
            <svg
              className="w-3.5 h-3.5 text-[#858585] transition-transform duration-150 group-hover:-translate-y-0.5"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M 7 11.5 V 2.5 M 3 6.5 L 7 2.5 L 11 6.5" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
