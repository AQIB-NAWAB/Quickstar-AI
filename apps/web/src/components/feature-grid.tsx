"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PenLine,
  Folder,
  Users,
  Check,
  FileText,
  MessageSquare,
  Pencil,
  Key,
  Lock,
} from "lucide-react";

export function FeatureGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Draft line animation state
  const [isDraftEditing, setIsDraftEditing] = useState(true);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Tab visibility listener
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Viewport intersection observer (run entrance once)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setHasEntered(true);
        } else {
          setIsInView(false);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Draft edit animation cycle: 2.5s edit sequence + 6s comfortable reading hold
  useEffect(() => {
    if (isReducedMotion) {
      setIsDraftEditing(true);
      return;
    }

    if (!isInView || !isTabVisible) return;

    let isMounted = true;
    let timerId: NodeJS.Timeout;

    const runCycle = () => {
      // Reset line slightly
      setIsDraftEditing(false);

      // Start extending line and blinking caret
      timerId = setTimeout(() => {
        if (!isMounted) return;
        setIsDraftEditing(true);

        // Hold completed state for 6.5 seconds
        timerId = setTimeout(() => {
          if (!isMounted) return;
          runCycle();
        }, 6500);
      }, 700);
    };

    runCycle();

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [isInView, isTabVisible, isReducedMotion]);

  return (
    <section
      id="platform"
      ref={sectionRef}
      className="relative w-full bg-[#FAFAF8] py-16 sm:py-20 lg:py-24 border-t border-[#E8E8E5] scroll-mt-24 lg:scroll-mt-28"
      aria-label="Platform capabilities and team controls"
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* ============================================================== */}
        {/* CENTERED HEADER GROUP */}
        {/* ============================================================== */}
        <div
          className={`text-center max-w-3xl mx-auto ${
            hasEntered && !isReducedMotion ? "platform-entrance-header" : ""
          }`}
        >
          <span className="text-sm sm:text-base font-medium text-[#FF571A] select-none">
            Built for your team
          </span>
          <h2 className="mt-3.5 sm:mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-semibold text-[#262626] tracking-[-0.035em] leading-[1.1]">
            Keep control. Keep improving.
          </h2>
          <p className="mt-3.5 sm:mt-4 text-base sm:text-lg text-[#666666] font-normal leading-[1.5] max-w-2xl mx-auto">
            Make changes on your terms, with separate workspaces and clear team access.
          </p>
        </div>

        {/* ============================================================== */}
        {/* ASYMMETRICAL THREE-CARD GRID */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.62fr_1fr] gap-5 sm:gap-6 mt-10 sm:mt-12 lg:mt-14 items-stretch">
          {/* ------------------------------------------------------------ */}
          {/* LARGE LEFT CARD: Improve without disruption (~62% width) */}
          {/* ------------------------------------------------------------ */}
          <div
            className={`bg-white border border-[#E8E8E5] rounded-2xl p-6 sm:p-8 lg:p-9 flex flex-col justify-between transition-all duration-200 hover:border-[#D6D6D2] hover:shadow-[0_4px_24px_rgba(0,0,0,0.03)] cursor-default ${
              hasEntered && !isReducedMotion ? "platform-entrance-card-1" : ""
            }`}
          >
            <div>
              {/* Feature Icon & Copy */}
              <PenLine
                className="w-5 h-5 text-[#FF571A] stroke-[1.75]"
                aria-hidden="true"
              />
              <h3 className="text-2xl sm:text-[27px] font-semibold text-[#262626] mt-3.5 mb-2 tracking-tight">
                Improve without disruption
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#666666] leading-[1.5] max-w-xl">
                Edit your draft while conversations use the published version.
              </p>

              {/* Illustration Inset */}
              <div className="bg-[#F6F6F3] rounded-xl p-4 sm:p-6 lg:p-7 mt-6 relative overflow-hidden">
                <div className="max-w-[540px] mx-auto">
                  {/* Two Version Panels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative z-10">
                    {/* Published Panel (Left, slightly higher) */}
                    <div className="bg-white border border-[#FF571A] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between select-none">
                      <div>
                        {/* Header */}
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-5 h-5 rounded-full bg-[#FF571A] flex items-center justify-center text-white flex-shrink-0"
                            aria-hidden="true"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[15px] text-[#262626] leading-snug">
                              Published
                            </div>
                            <div className="text-[12px] text-[#858585] leading-snug">
                              Used in conversations
                            </div>
                          </div>
                        </div>

                        {/* Neutral Content Bars */}
                        <div className="space-y-2 mt-4 mb-5" aria-hidden="true">
                          <div className="h-2 bg-[#DCDCD8] rounded-full w-[70%]" />
                          <div className="h-2 bg-[#DCDCD8] rounded-full w-[92%]" />
                          <div className="h-2 bg-[#DCDCD8] rounded-full w-[48%]" />
                        </div>
                      </div>

                      {/* Bottom conversation strip */}
                      <div
                        className="bg-[#FBFBFA] border border-[#E8E8E5] rounded-lg p-2.5 flex items-center justify-between"
                        aria-hidden="true"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-[#858585]" />
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-[#DCDCD8] rounded-full" />
                            <div className="w-8 h-1.5 bg-[#DCDCD8] rounded-full" />
                          </div>
                        </div>
                        <div className="w-4 h-4 rounded-full bg-[#FF571A] flex items-center justify-center text-white">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>

                    {/* Draft Panel (Right, slightly lower on sm+) */}
                    <div className="bg-white border border-[#E8E8E5] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between sm:mt-8 select-none">
                      <div>
                        {/* Header */}
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-5 h-5 flex items-center justify-center text-[#262626] flex-shrink-0"
                            aria-hidden="true"
                          >
                            <Pencil className="w-4 h-4 stroke-[1.75]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[15px] text-[#262626] leading-snug">
                              Draft
                            </div>
                            <div className="text-[12px] text-[#858585] leading-snug">
                              Changes in progress
                            </div>
                          </div>
                        </div>

                        {/* Neutral Content Bars with Animated Edit Highlight */}
                        <div className="space-y-2 mt-4 mb-5" aria-hidden="true">
                          <div className="h-2 bg-[#DCDCD8] rounded-full w-[75%]" />
                          {/* Edited line with pale orange highlight & animated caret */}
                          <div className="bg-[#FFF2EB] rounded px-2 py-1 flex items-center">
                            <div
                              className="h-2 bg-[#FF571A] rounded-full transition-all duration-700 ease-out"
                              style={{ width: isDraftEditing ? "85%" : "55%" }}
                            />
                            {!isReducedMotion && (
                              <span className="w-0.5 h-3 bg-[#FF571A] ml-1 animate-pulse" />
                            )}
                          </div>
                          <div className="h-2 bg-[#DCDCD8] rounded-full w-[45%]" />
                        </div>
                      </div>

                      {/* Bottom conversation strip */}
                      <div
                        className="bg-[#FBFBFA] border border-[#E8E8E5] rounded-lg p-2.5 flex items-center justify-between"
                        aria-hidden="true"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-[#858585]" />
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-[#DCDCD8] rounded-full" />
                            <div className="w-8 h-1.5 bg-[#DCDCD8] rounded-full" />
                          </div>
                        </div>
                        {/* No live published checkmark on draft */}
                        <div className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* SVG Connectors & Central Document Node */}
                  <div className="relative w-full flex flex-col items-center mt-3 sm:mt-4">
                    <svg
                      className="w-full max-w-[480px] h-12 overflow-visible hidden sm:block"
                      viewBox="0 0 480 48"
                      fill="none"
                      aria-hidden="true"
                    >
                      {/* Orange curved path: Published bottom -> Document node */}
                      <path
                        d="M 120 0 C 120 28, 170 32, 224 32"
                        stroke="#FF571A"
                        strokeWidth="1.5"
                      />
                      <circle cx="120" cy="2" r="3" fill="#FF571A" />

                      {/* Gray curved path: Draft bottom -> Document node */}
                      <path
                        d="M 360 0 C 360 28, 310 32, 256 32"
                        stroke="#A0A09C"
                        strokeWidth="1.5"
                      />
                      <circle cx="360" cy="2" r="3" fill="#A0A09C" />

                      {/* Traveling orange dot on Published path */}
                      {!isReducedMotion && isInView && isTabVisible && (
                        <circle r="3" fill="#FF571A">
                          <animateMotion
                            path="M 120 0 C 120 28, 170 32, 224 32"
                            dur="3.2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                    </svg>

                    {/* Central Document Node */}
                    <div
                      className="w-8 h-8 rounded-full bg-white border border-[#D0D0CD] flex items-center justify-center shadow-xs z-10 -mt-2 sm:-mt-4 select-none"
                      aria-hidden="true"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#666666]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Chip */}
            <div className="inline-flex items-center gap-2 mt-5 px-3 py-1.5 bg-white border border-[#E8E8E5] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none self-start">
              <div
                className="w-4 h-4 rounded-full bg-[#FF571A] flex items-center justify-center text-white flex-shrink-0"
                aria-hidden="true"
              >
                <Check className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
              <span className="text-[12px] sm:text-[13px] font-medium text-[#262626]">
                Published version stays unchanged
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* RIGHT COLUMN: Two Stacked Cards (~36% width) */}
          {/* ------------------------------------------------------------ */}
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* UPPER-RIGHT CARD: Keep work separate */}
            <div
              className={`bg-white border border-[#E8E8E5] rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:border-[#D6D6D2] hover:shadow-[0_4px_24px_rgba(0,0,0,0.03)] cursor-default flex-1 ${
                hasEntered && !isReducedMotion ? "platform-entrance-card-2" : ""
              }`}
            >
              <div>
                <Folder
                  className="w-5 h-5 text-[#FF571A] stroke-[1.75]"
                  aria-hidden="true"
                />
                <h3 className="text-xl sm:text-[23px] font-semibold text-[#262626] mt-3 mb-1.5 tracking-tight">
                  Keep work separate
                </h3>
                <p className="text-[14px] sm:text-[15px] text-[#666666] leading-[1.5]">
                  Organize information and conversations in separate workspaces.
                </p>

                {/* Workspace Containers Illustration */}
                <div className="grid grid-cols-2 gap-3.5 mt-5 select-none" aria-hidden="true">
                  {/* Support Workspace */}
                  <div className="bg-[#FFF9F6] border border-[#FF571A] rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[#FF571A] stroke-[2]" />
                      <span className="text-[13px] font-semibold text-[#262626]">
                        Support
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white border border-[#F5E6DE] rounded-lg p-2.5 flex items-center justify-center shadow-xs">
                        <FileText className="w-4 h-4 text-[#FF571A] stroke-[1.75]" />
                      </div>
                      <div className="bg-white border border-[#F5E6DE] rounded-lg p-2.5 flex items-center justify-center shadow-xs">
                        <MessageSquare className="w-4 h-4 text-[#FF571A] stroke-[1.75]" />
                      </div>
                    </div>
                  </div>

                  {/* Sales Workspace */}
                  <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[#262626] stroke-[2]" />
                      <span className="text-[13px] font-semibold text-[#262626]">
                        Sales
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white border border-[#E8E8E5] rounded-lg p-2.5 flex items-center justify-center shadow-xs">
                        <FileText className="w-4 h-4 text-[#555555] stroke-[1.75]" />
                      </div>
                      <div className="bg-white border border-[#E8E8E5] rounded-lg p-2.5 flex items-center justify-center shadow-xs">
                        <MessageSquare className="w-4 h-4 text-[#555555] stroke-[1.75]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LOWER-RIGHT CARD: Choose who can do what */}
            <div
              className={`bg-white border border-[#E8E8E5] rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:border-[#D6D6D2] hover:shadow-[0_4px_24px_rgba(0,0,0,0.03)] cursor-default flex-1 ${
                hasEntered && !isReducedMotion ? "platform-entrance-card-3" : ""
              }`}
            >
              <div>
                <Users
                  className="w-5 h-5 text-[#FF571A] stroke-[1.75]"
                  aria-hidden="true"
                />
                <h3 className="text-xl sm:text-[23px] font-semibold text-[#262626] mt-3 mb-1.5 tracking-tight">
                  Choose who can do what
                </h3>
                <p className="text-[14px] sm:text-[15px] text-[#666666] leading-[1.5]">
                  Manage team roles and store tool credentials securely.
                </p>

                {/* Member List & Key/Lock Illustration */}
                <div className="mt-5 flex items-center justify-between gap-3 sm:gap-4 select-none">
                  {/* Member List */}
                  <div
                    className="bg-white border border-[#E8E8E5] rounded-xl p-2 sm:p-2.5 divide-y divide-[#EFEFEA] flex-1 max-w-[210px] shadow-xs"
                    aria-hidden="true"
                  >
                    {/* Row 1: Jane Doe (Owner) */}
                    <div className="flex items-center justify-between py-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#EAEAE5] text-[#555555] text-[10px] font-semibold flex items-center justify-center">
                          JD
                        </div>
                        <span className="text-[12px] sm:text-[13px] font-medium text-[#262626]">
                          Jane Doe
                        </span>
                      </div>
                      <span className="bg-[#FFF0E8] text-[#FF571A] text-[11px] font-medium px-2 py-0.5 rounded">
                        Owner
                      </span>
                    </div>

                    {/* Row 2: Alex Lee (Analyst) */}
                    <div className="flex items-center justify-between py-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#EAEAE5] text-[#555555] text-[10px] font-semibold flex items-center justify-center">
                          AL
                        </div>
                        <span className="text-[12px] sm:text-[13px] font-medium text-[#262626]">
                          Alex Lee
                        </span>
                      </div>
                      <span className="bg-[#F0F0ED] text-[#666666] text-[11px] font-medium px-2 py-0.5 rounded">
                        Analyst
                      </span>
                    </div>
                  </div>

                  {/* Key & Lock Illustration */}
                  <div
                    className="relative flex items-center gap-2 pr-1 select-none flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Key className="w-7 h-7 text-[#262626] stroke-[1.5] -rotate-45" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-[#FFF0E8] flex items-center justify-center">
                        <Lock className="w-4 h-4 text-[#FF571A] stroke-[2]" />
                      </div>
                      {/* Radiant accent strokes */}
                      <span className="absolute -top-1 right-0 w-2 h-0.5 bg-[#FF571A] rounded-full rotate-45" />
                      <span className="absolute top-1.5 -right-2 w-2 h-0.5 bg-[#FF571A] rounded-full rotate-12" />
                      <span className="absolute -top-2 right-3 w-0.5 h-2 bg-[#FF571A] rounded-full rotate-12" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ILLUSTRATIVE CAPTION BENEATH GRID */}
        {/* ============================================================== */}
        <div className="text-right mt-3.5">
          <span className="text-[11px] sm:text-[12px] text-[#858585] select-none">
            Illustrative controls
          </span>
        </div>
      </div>
    </section>
  );
}
