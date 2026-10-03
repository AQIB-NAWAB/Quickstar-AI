"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaWorkflowIllustration } from "./cta-workflow-illustration";

export function CtaBanner() {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
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

  return (
    <section
      ref={sectionRef}
      className="w-full bg-[#FAFAF8] text-[#262626] border-t border-[#dedede] pt-14 pb-12 sm:pt-20 sm:pb-16 overflow-hidden"
    >
      <div className="max-w-[1340px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Top Monospace Section Eyebrow */}
        <div className="flex items-center justify-between pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          <span>08 / GET STARTED</span>
          <span className="hidden sm:inline opacity-60">&middot;&nbsp;&middot;&nbsp;&middot;&nbsp;+</span>
        </div>

        {/* Top Thin Horizontal Rule */}
        <div className="w-full h-px bg-[#dedede]" />

        {/* Main 2-Column Composition: Left Editorial Copy vs Right Workflow Illustration */}
        <div className="pt-10 sm:pt-14 pb-12 sm:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* ================= LEFT COLUMN (~52%) ================= */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between">
            <div>
              {/* Main Headline */}
              <h2 className="text-4xl sm:text-5xl lg:text-[62px] font-medium tracking-tight text-[#262626] leading-[1.08] max-w-[650px]">
                Give your first agent
                <br />
                something <span className="text-[#FF571A]">useful</span> to do.
              </h2>

              {/* Supporting Copy */}
              <p className="mt-6 sm:mt-8 text-lg sm:text-[20px] text-[#666666] leading-[1.5] max-w-[540px] font-normal">
                Bring your company knowledge and one API tool.
                <br className="hidden sm:inline" />
                {" "}Configure an agent, publish a version, and try a conversation.
              </p>

              {/* CTA Controls Row */}
              <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-6 sm:gap-8">
                {/* Primary Action Button */}
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-7 h-[50px] bg-[#FF571A] hover:bg-[#e04812] text-white font-medium text-base rounded-[6px] transition-colors active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-[#FF571A] focus-visible:outline-offset-2"
                >
                  <span>Start building</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {/* Secondary Action Link */}
                <Link
                  href="#playground"
                  className="inline-flex items-center gap-1.5 text-base font-medium text-[#262626] hover:text-[#FF571A] underline underline-offset-4 transition-colors group"
                >
                  <span>Try the example</span>
                  <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    &nearr;
                  </span>
                </Link>
              </div>
            </div>

            {/* Small Process Annotation Line Beneath Controls */}
            <div className="mt-12 sm:mt-16 max-w-[420px] flex items-center gap-4 text-xs font-mono text-[#737373]">
              <div className="h-px bg-[#dedede] flex-1" />
              <span>Configure &nbsp;/&nbsp; Publish &nbsp;/&nbsp; Run</span>
              <div className="h-px bg-[#dedede] flex-1" />
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~48%) ================= */}
          <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center lg:justify-end">
            <CtaWorkflowIllustration isAnimating={isIntersecting} />
          </div>
        </div>

        {/* Full-Width Bottom Rule */}
        <div className="w-full h-px bg-[#dedede]" />

        {/* Bottom Annotation Row */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-[13px] font-mono text-[#737373]">
          <div>Your draft stays editable. Your published version stays consistent.</div>
          <div className="text-[#262626] font-medium">QuickStart AI</div>
        </div>
      </div>
    </section>
  );
}
