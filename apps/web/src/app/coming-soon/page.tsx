"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function ComingSoonPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setMounted(true);
    setCurrentYear(new Date().getFullYear());
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="min-h-[100svh] flex flex-col bg-[#FAFAF8] text-[#262626] font-sans selection:bg-[#FF571A]/20">
      {/* ============================================================== */}
      {/* 1. COMPACT HEADER */}
      {/* ============================================================== */}
      <header className="w-full border-b border-[#E0E0DD] bg-[#FAFAF8]">
        <div className="max-w-[1240px] mx-auto w-full px-5 sm:px-8 lg:px-12 h-18 sm:h-20 flex items-center justify-between">
          {/* Left: Brand Lockup */}
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
            <span className="text-[24px] sm:text-[26px] font-bold text-[#262626] tracking-tight leading-none">
              QuickStart<span className="text-[#FF571A]">AI</span>
            </span>
          </Link>

          {/* Right: Back to home link with diagonal arrow */}
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm sm:text-[15px] font-medium text-[#262626] hover:text-[#FF571A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[4px] py-1 px-1.5"
          >
            <span>Back to home</span>
            <svg
              className="w-3.5 h-3.5 text-[#262626] group-hover:text-[#FF571A] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
          </Link>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. FLEXIBLE MAIN CONTENT */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-12 sm:py-16 max-w-[820px] mx-auto w-full">
        {/* Status Badge */}
        <div
          className={`transition-all duration-500 ease-out ${
            mounted || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF4ED] border border-[#FF571A]/25 text-xs font-semibold uppercase tracking-wider text-[#FF571A] select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] shrink-0" />
            <span>IN THE WORKS</span>
          </div>
        </div>

        {/* Decorative Browser & Wrench Illustration */}
        <div
          className={`mt-8 sm:mt-10 transition-all duration-500 delay-100 ease-out ${
            mounted || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          <svg
            viewBox="0 0 340 230"
            className="w-[280px] sm:w-[330px] max-w-full h-auto select-none pointer-events-none"
            fill="none"
            aria-hidden="true"
          >
            {/* Rear Browser Window (Light Gray, offset upward and left) */}
            <rect
              x="30"
              y="18"
              width="210"
              height="144"
              rx="12"
              stroke="#D6D6D2"
              strokeWidth="2.5"
              fill="#FAFAF8"
            />
            <line x1="30" y1="48" x2="240" y2="48" stroke="#D6D6D2" strokeWidth="2" />
            <circle cx="50" cy="33" r="3" fill="#D6D6D2" />
            <circle cx="63" cy="33" r="3" fill="#D6D6D2" />
            <circle cx="76" cy="33" r="3" fill="#D6D6D2" />

            {/* Front Browser Window (Orange) */}
            <rect
              x="86"
              y="44"
              width="218"
              height="148"
              rx="14"
              stroke="#FF571A"
              strokeWidth="2.8"
              fill="#FFFFFF"
            />
            <line x1="86" y1="78" x2="304" y2="78" stroke="#FF571A" strokeWidth="2" />
            <circle cx="110" cy="61" r="3.3" fill="#FF571A" />
            <circle cx="125" cy="61" r="3.3" fill="#FF571A" />
            <circle cx="140" cy="61" r="3.3" fill="#FF571A" />

            {/* Terminal Prompt Inside Front Window: > _ */}
            <path
              d="M 152 108 L 180 128 L 152 148"
              stroke="#FF571A"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="194"
              y1="148"
              x2="228"
              y2="148"
              stroke="#FF571A"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Radiating Accent Lines around Wrench Head */}
            <line x1="298" y1="126" x2="308" y2="114" stroke="#FF571A" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="312" y1="138" x2="326" y2="132" stroke="#FF571A" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="314" y1="154" x2="328" y2="158" stroke="#FF571A" strokeWidth="2.4" strokeLinecap="round" />

            {/* Charcoal Mechanical Wrench Overlapping Lower-Right Edge */}
            <g transform="translate(262, 154) rotate(-42)">
              {/* Handle with rounded tip */}
              <rect x="-6.5" y="14" width="13" height="48" rx="4" fill="#262626" />
              {/* Open Jaws Wrench Head */}
              <path
                d="M -16 14 C -22 4, -15 -14, 0 -16 C 15 -14, 22 4, 16 14 L 6.5 14 L 6.5 -1 L -6.5 -1 L -6.5 14 Z"
                fill="#262626"
              />
            </g>
          </svg>
        </div>

        {/* Semantic H1 Headline */}
        <h1
          className={`mt-8 sm:mt-10 text-4xl sm:text-5xl md:text-6xl lg:text-[70px] font-bold text-[#262626] tracking-[-0.04em] leading-[1.08] text-center transition-all duration-500 delay-200 ease-out ${
            mounted || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          <span>Good things take shape.</span>
          <span className="block text-[#FF571A] mt-1 sm:mt-2">Coming soon.</span>
        </h1>

        {/* Supporting Copy */}
        <p
          className={`mt-5 sm:mt-6 text-base sm:text-lg lg:text-[20px] text-[#666666] font-normal leading-relaxed max-w-[620px] text-center transition-all duration-500 delay-300 ease-out ${
            mounted || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          We’re still building this part of QuickStart AI.
          <br className="hidden sm:inline" />
          {" "}For now, explore what your first agent could do.
        </p>

        {/* Actions Row */}
        <div
          className={`mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-7 w-full sm:w-auto transition-all duration-500 delay-400 ease-out ${
            mounted || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          {/* Primary Action Button */}
          <Link
            href="/"
            className="group w-full sm:w-auto min-w-[180px] h-[52px] px-7 bg-[#FF571A] hover:bg-[#E04D14] active:bg-[#CC4410] text-white font-semibold text-base rounded-[8px] transition-colors duration-180 flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] select-none"
          >
            <span>Back to home</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          {/* Secondary Action Link */}
          <Link
            href="/#playground"
            className="group inline-flex items-center justify-center gap-2.5 text-base font-semibold text-[#262626] hover:text-[#FF571A] transition-colors py-2 px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-[4px] select-none"
          >
            <svg
              className="w-7 h-7 text-[#262626] group-hover:text-[#FF571A] shrink-0 transition-all duration-180 group-hover:scale-105"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" />
              <polygon points="11,9.5 19,14 11,18.5" fill="currentColor" stroke="none" />
            </svg>
            <span>See it in action</span>
          </Link>
        </div>
      </main>

      {/* ============================================================== */}
      {/* 3. SMALL FOOTER */}
      {/* ============================================================== */}
      <footer className="w-full border-t border-[#E0E0DD] bg-[#FAFAF8] py-5 sm:py-6">
        <div className="max-w-[1240px] mx-auto w-full px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-[13px] text-[#858585]">
          <div>&copy; {currentYear} QuickStart AI</div>
          <div>Built around your business.</div>
        </div>
      </footer>
    </div>
  );
}
