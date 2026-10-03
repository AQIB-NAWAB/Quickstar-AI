"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { FooterWorkflowIllustration } from "./footer-workflow-illustration";

export function Footer() {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const footerRef = useRef<HTMLElement>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (footerRef.current) observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="w-full bg-[#FAFAF8] text-[#262626] border-t border-[#dedede] pt-14 pb-10 sm:pt-18 sm:pb-12 overflow-hidden"
    >
      <div className="max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* ========================================================================= */}
        {/* PART A: TOP LABEL & TOP STRUCTURAL RULE */}
        {/* ========================================================================= */}
        <div className="pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          QUICKSTART AI / BUILD WITH CONTEXT
        </div>
        <div className="w-full h-px bg-[#dedede]" />

        {/* ========================================================================= */}
        {/* PART B: BRAND INTRODUCTION & THREE NAVIGATION COLUMNS */}
        {/* ========================================================================= */}
        <div className="pt-12 sm:pt-14 pb-10 sm:pb-12 grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Brand Info & Custom Workflow Illustration (~42%) */}
          <div className="md:col-span-12 lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Wordmark */}
              <div className="text-3xl sm:text-[36px] font-bold text-[#262626] tracking-tight">
                QuickStart<span className="text-[#FF571A]">AI</span>
              </div>

              {/* Editorial Value Statement */}
              <p className="mt-3 text-lg sm:text-[19px] text-[#666666] leading-snug font-normal max-w-md">
                Company knowledge. Connected tools.
                <br />
                One agent you can keep improving.
              </p>
            </div>

            {/* Custom Workflow Artwork (Documents -> Agent -> Conversation) */}
            <div className="mt-6 sm:mt-7">
              <FooterWorkflowIllustration isAnimating={isIntersecting} />
            </div>
          </div>

          {/* Navigation Columns Container (~58%) */}
          <div className="md:col-span-12 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-10 pt-1 lg:pl-6">
            {/* Column 1: PRODUCT */}
            <nav aria-label="Product links">
              <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-[#737373] mb-4 sm:mb-5">
                PRODUCT
              </h4>
              <ul className="space-y-3 sm:space-y-3.5 text-[15px] sm:text-[16px] text-[#262626]">
                <li>
                  <Link href="#platform" className="hover:text-[#FF571A] transition-colors">
                    Platform
                  </Link>
                </li>
                <li>
                  <Link href="#playground" className="hover:text-[#FF571A] transition-colors">
                    Playground
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-[#FF571A] transition-colors">
                    Knowledge
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-[#FF571A] transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Column 2: BUILD */}
            <nav aria-label="Build and architecture links">
              <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-[#737373] mb-4 sm:mb-5">
                BUILD
              </h4>
              <ul className="space-y-3 sm:space-y-3.5 text-[15px] sm:text-[16px] text-[#262626]">
                <li>
                  <Link href="#architecture" className="hover:text-[#FF571A] transition-colors">
                    Architecture
                  </Link>
                </li>
                <li>
                  <Link href="#platform" className="hover:text-[#FF571A] transition-colors">
                    Published versions
                  </Link>
                </li>
                <li>
                  <Link href="#platform" className="hover:text-[#FF571A] transition-colors">
                    API tools
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/AQIB-NAWAB/Quickstar-AI"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#FF571A] transition-colors group"
                  >
                    <span>GitHub</span>
                    <span className="text-xs transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      &nearr;
                    </span>
                  </a>
                </li>
              </ul>
            </nav>

            {/* Column 3: COMPANY */}
            <nav aria-label="Company information">
              <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-[#737373] mb-4 sm:mb-5">
                COMPANY
              </h4>
              <ul className="space-y-3 sm:space-y-3.5 text-[15px] sm:text-[16px] text-[#737373]">
                {/* As instructed, since /privacy and /terms pages do not exist, displayed without dead links until routes are supplied */}
                <li>
                  <span className="cursor-default select-none text-[#8c8c8c] hover:text-[#262626] transition-colors" title="Legal documentation destination pending">
                    Privacy
                  </span>
                </li>
                <li>
                  <span className="cursor-default select-none text-[#8c8c8c] hover:text-[#262626] transition-colors" title="Legal documentation destination pending">
                    Terms
                  </span>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PART C: OVERSIZED LOWER WORDMARK */}
        {/* ========================================================================= */}
        <div className="w-full h-px bg-[#dedede]" />
        <div
          className="py-6 sm:py-8 md:py-10 flex items-center justify-between overflow-hidden select-none"
          aria-hidden="true"
        >
          <span className="text-base font-mono text-[#b8b8b8] hidden sm:inline select-none">+</span>
          <div className="text-[14vw] sm:text-[14.5vw] lg:text-[150px] xl:text-[170px] font-black tracking-tighter leading-none text-[#262626] whitespace-nowrap text-center mx-auto">
            QuickStart<span className="text-[#FF571A]">AI</span>
          </div>
          <span className="text-base font-mono text-[#b8b8b8] hidden sm:inline select-none">+</span>
        </div>
        <div className="w-full h-px bg-[#dedede]" />

        {/* ========================================================================= */}
        {/* PART D: BOTTOM UTILITY ROW */}
        {/* ========================================================================= */}
        <div className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono text-[#737373]">
          <div>&copy; {currentYear} QuickStart AI</div>
          <div className="tracking-wide">
            Knowledge &rarr; Tools &rarr; Conversation
          </div>
        </div>
      </div>
    </footer>
  );
}
