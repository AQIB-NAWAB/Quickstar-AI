"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export function CtaBanner() {
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Viewport intersection observer for restrained entrance animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full bg-[#FAFAF8] py-12 sm:py-16 lg:py-20 overflow-hidden"
      aria-label="Closing invitation"
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8">
        {/* ============================================================== */}
        {/* CENTERED CHARCOAL PANEL */}
        {/* ============================================================== */}
        <div
          className={`relative w-full rounded-[18px] sm:rounded-[20px] bg-[#262626] py-12 sm:py-14 lg:py-16 px-5 sm:px-8 lg:px-12 overflow-hidden flex flex-col items-center text-center transition-all duration-500 ease-out ${
            isInView || isReducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          {/* ------------------------------------------------------------ */}
          {/* DECORATIVE FAINT SPEECH BUBBLES (CROPPED AT PANEL EDGES) */}
          {/* ------------------------------------------------------------ */}
          {/* Lower-left decorative bubble */}
          <svg
            className="absolute -bottom-10 -left-12 sm:-bottom-14 sm:-left-16 lg:-bottom-16 lg:-left-20 w-64 h-56 sm:w-80 sm:h-72 lg:w-[420px] lg:h-[360px] pointer-events-none select-none opacity-50 sm:opacity-100"
            viewBox="0 0 380 320"
            fill="none"
            stroke="rgba(255, 255, 255, 0.10)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M 40 40 H 320 A 44 44 0 0 1 364 84 V 180 A 44 44 0 0 1 320 224 H 190 L 125 275 L 145 224 H 40 A 44 44 0 0 1 -4 180 V 84 A 44 44 0 0 1 40 40 Z" />
          </svg>

          {/* Upper-right decorative bubble */}
          <svg
            className="absolute -top-10 -right-12 sm:-top-14 sm:-right-16 lg:-top-16 lg:-right-20 w-64 h-56 sm:w-80 sm:h-72 lg:w-[420px] lg:h-[360px] pointer-events-none select-none opacity-50 sm:opacity-100"
            viewBox="0 0 380 320"
            fill="none"
            stroke="rgba(255, 255, 255, 0.10)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M 60 40 H 340 A 44 44 0 0 1 384 84 V 180 A 44 44 0 0 1 340 224 H 250 L 195 275 L 210 224 H 60 A 44 44 0 0 1 16 180 V 84 A 44 44 0 0 1 60 40 Z" />
          </svg>

          {/* ------------------------------------------------------------ */}
          {/* PANEL CONTENT (LAYERED ABOVE DECORATIVE SHAPES) */}
          {/* ------------------------------------------------------------ */}
          <div className="relative z-10 flex flex-col items-center max-w-[820px] mx-auto">
            {/* 1. Brand Mark: Centered Prompt Bot logo */}
            <div
              className={`transition-all duration-500 delay-75 ease-out ${
                isInView || isReducedMotion
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              <BrandLogo
                size={40}
                fillColor="#FF571A"
                className="w-10 h-10 shrink-0"
                aria-hidden="true"
                role="presentation"
                aria-label=""
              />
            </div>

            {/* 2. Headline: Exact two deliberate lines on desktop */}
            <h2
              className={`mt-6 sm:mt-7 text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-bold text-white tracking-[-0.035em] leading-[1.12] transition-all duration-500 delay-150 ease-out ${
                isInView || isReducedMotion
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              What could your first
              <br className="hidden sm:inline" />
              {" "}agent help with?
            </h2>

            {/* 3. Short Supporting Sentence */}
            <p
              className={`mt-5 sm:mt-6 text-base sm:text-lg lg:text-[19px] text-[#C4C4C4] font-normal leading-[1.5] max-w-xl transition-all duration-500 delay-225 ease-out ${
                isInView || isReducedMotion
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              Start with a question your team answers every day.
            </p>

            {/* 4. Actions Row */}
            <div
              className={`mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 w-full sm:w-auto transition-all duration-500 delay-300 ease-out ${
                isInView || isReducedMotion
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              {/* Primary Action Button */}
              <Link
                href="/coming-soon"
                className="group w-full sm:w-auto min-w-[180px] sm:min-w-[190px] h-[52px] px-7 bg-[#FF571A] hover:bg-[#E04D14] active:bg-[#CC4410] text-white font-semibold text-base rounded-[8px] transition-colors duration-180 flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] select-none"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-[3px]" />
              </Link>

              {/* Secondary Action Link */}
              <Link
                href="#playground"
                className="group inline-flex items-center justify-center gap-2.5 text-base font-semibold text-white hover:text-white/85 transition-colors py-2 px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-[4px] select-none"
              >
                {/* Outlined play-circle icon with filled play triangle */}
                <svg
                  className="w-7 h-7 text-white shrink-0 transition-transform duration-180 group-hover:scale-105"
                  viewBox="0 0 28 28"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" />
                  <polygon points="11,9.5 19,14 11,18.5" fill="currentColor" stroke="none" />
                </svg>
                <span>See an example</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
