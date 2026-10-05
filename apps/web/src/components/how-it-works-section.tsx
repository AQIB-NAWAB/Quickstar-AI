"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Package,
  MessageSquare,
  Check,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";

interface StepItem {
  num: string;
  title: string;
  description: string;
}

const STEPS: StepItem[] = [
  {
    num: "01",
    title: "Add your information",
    description: "Bring in company documents and connect the tools your agent can use.",
  },
  {
    num: "02",
    title: "Give it a role",
    description: "Tell your agent how to respond and which tasks it should help with.",
  },
  {
    num: "03",
    title: "Test, then publish",
    description: "Try example questions, check the answers, and publish when you’re ready.",
  },
];

const INSTRUCTION_TEXT =
  "Help customers with product questions and orders. Use the company’s information.";
const INSTRUCTION_WORDS = INSTRUCTION_TEXT.split(" ");

/**
 * Reusable Orange Circle Checkmark icon matching the approved visual specification.
 */
function OrangeCircleCheck({
  active = true,
  animating = false,
  className = "",
}: {
  active?: boolean;
  animating?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
        active ? "text-[#FF571A] opacity-100 scale-100" : "text-[#FF571A]/30 opacity-30 scale-95"
      } ${animating ? "animate-hiw-check" : ""} ${className}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10.2L8.8 12.5L13.5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // Active progression state:
  // activeStep: 1 | 2 | 3 | 0 (0 = settled/resting)
  const [activeStep, setActiveStep] = useState<number>(1);
  const [animatingStep, setAnimatingStep] = useState<number>(1);

  // Step 1 states
  const [s1Check1, setS1Check1] = useState(true);
  const [s1Check2, setS1Check2] = useState(true);
  const [s1Check3, setS1Check3] = useState(true);
  const [chevron1Active, setChevron1Active] = useState(false);

  // Step 2 states
  const [s2BorderHighlight, setS2BorderHighlight] = useState(false);
  const [s2WordCount, setS2WordCount] = useState(INSTRUCTION_WORDS.length);
  const [s2Pill, setS2Pill] = useState(true);
  const [chevron2Active, setChevron2Active] = useState(false);

  // Step 3 states
  const [s3Check1, setS3Check1] = useState(true);
  const [s3Check2, setS3Check2] = useState(true);
  const [s3Published, setS3Published] = useState(true);

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

  // Browser tab visibility handling
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Viewport intersection observer
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

  // Process animation sequence controller
  useEffect(() => {
    // If reduced motion is requested, lock immediately into completed final state
    if (isReducedMotion) {
      setActiveStep(0);
      setS1Check1(true);
      setS1Check2(true);
      setS1Check3(true);
      setChevron1Active(false);
      setS2BorderHighlight(false);
      setS2WordCount(INSTRUCTION_WORDS.length);
      setS2Pill(true);
      setChevron2Active(false);
      setS3Check1(true);
      setS3Check2(true);
      setS3Published(true);
      return;
    }

    if (!isInView || !isPlaying || !isTabVisible) return;

    let isMounted = true;
    const timeouts: NodeJS.Timeout[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (isMounted) fn();
      }, ms);
      timeouts.push(id);
    };

    const runSequence = () => {
      // Phase 1: Step 1 (0ms - 2200ms)
      // Only reset Step 1 checks so panels do not all visibly empty at once
      setActiveStep(1);
      setAnimatingStep(1);
      setS1Check1(false);
      setS1Check2(false);
      setS1Check3(false);
      setChevron1Active(false);

      // Step 1 checkmarks pop in sequence
      schedule(() => setS1Check1(true), 400);
      schedule(() => setS1Check2(true), 900);
      schedule(() => setS1Check3(true), 1500);
      schedule(() => setChevron1Active(true), 1800);

      // Phase 2: Step 2 (2200ms - 4600ms)
      schedule(() => {
        setActiveStep(2);
        setAnimatingStep(2);
        setS2BorderHighlight(true);
        // Reset only Step 2 when its turn begins
        setS2WordCount(0);
        setS2Pill(false);
        setChevron2Active(false);
      }, 2200);

      // Progressive text reveals in word groups
      schedule(() => setS2WordCount(3), 2400);
      schedule(() => setS2WordCount(6), 2750);
      schedule(() => setS2WordCount(8), 3100);
      schedule(() => setS2WordCount(INSTRUCTION_WORDS.length), 3450);
      schedule(() => setS2BorderHighlight(false), 3600);
      schedule(() => setS2Pill(true), 3800);
      schedule(() => setChevron2Active(true), 4200);

      // Phase 3: Step 3 (4600ms - 7000ms)
      schedule(() => {
        setActiveStep(3);
        setAnimatingStep(3);
        // Reset only Step 3 when its turn begins
        setS3Check1(false);
        setS3Check2(false);
        setS3Published(false);
      }, 4600);

      schedule(() => setS3Check1(true), 5000);
      schedule(() => setS3Check2(true), 5450);
      schedule(() => setS3Published(true), 6000);

      // Phase 4: Settled / Reading State (7000ms - 14500ms)
      // Hold completed state so visitors have 7.5 seconds to comfortably read
      schedule(() => {
        setActiveStep(0);
        setAnimatingStep(0);
        setChevron1Active(false);
        setChevron2Active(false);
      }, 7000);

      // Low-frequency cycle replay
      schedule(() => {
        if (isMounted && isPlaying) {
          runSequence();
        }
      }, 14500);
    };

    // Run cycle
    runSequence();

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [isInView, isPlaying, isReducedMotion, isTabVisible]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      // If pausing, immediately settle into completed reference state
      if (!next) {
        setActiveStep(0);
        setS1Check1(true);
        setS1Check2(true);
        setS1Check3(true);
        setChevron1Active(false);
        setS2BorderHighlight(false);
        setS2WordCount(INSTRUCTION_WORDS.length);
        setS2Pill(true);
        setChevron2Active(false);
        setS3Check1(true);
        setS3Check2(true);
        setS3Published(true);
      }
      return next;
    });
  }, []);

  const renderedInstructionText =
    s2WordCount >= INSTRUCTION_WORDS.length
      ? INSTRUCTION_TEXT
      : INSTRUCTION_WORDS.slice(0, s2WordCount).join(" ");

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative w-full bg-[#191919] text-[#FAFAF8] py-14 sm:py-16 lg:py-24 border-t border-[#262626]"
      aria-label="How QuickStart AI works"
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* ============================================================== */}
        {/* HEADER ROW: Left Title + Right Supporting Statement */}
        {/* ============================================================== */}
        <div
          className={`flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-12 ${
            hasEntered && !isReducedMotion ? "hiw-entrance-header" : ""
          }`}
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-medium text-[#FF571A] select-none">
                How it works
              </span>
              {/* Subtle accessibility playback toggle */}
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause process preview" : "Play process preview"}
                title={isPlaying ? "Pause process preview" : "Play process preview"}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[#858585] hover:text-[#FAFAF8] hover:bg-[#252525] transition-colors focus:outline-none focus:ring-1 focus:ring-[#FF571A]"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
                )}
              </button>
            </div>

            <h2 className="mt-4 sm:mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-semibold text-[#FAFAF8] tracking-[-0.035em] leading-[1.1]">
              From your information<br className="hidden sm:inline" />{" "}
              to a working agent.
            </h2>
          </div>

          <div className="lg:pb-1.5 flex-shrink-0">
            <p className="text-base sm:text-lg lg:text-[19px] text-[#B0B0B0] font-normal leading-[1.45]">
              Add what it should know.<br />
              Decide what it should do.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* THREE-STEP COLUMNS */}
        {/* ============================================================== */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 mt-12 sm:mt-16 list-none p-0 m-0">
          {/* ------------------------------------------------------------ */}
          {/* STEP 1: Add your information */}
          {/* ------------------------------------------------------------ */}
          <li
            className={`flex flex-col ${
              hasEntered && !isReducedMotion ? "hiw-entrance-col-1" : ""
            }`}
          >
            {/* Top row: Number + Rule + Decorative Chevron */}
            <div className="relative flex items-center gap-3.5">
              <span
                className={`text-xl sm:text-[22px] font-medium tracking-tight transition-colors duration-300 select-none ${
                  activeStep === 1 ? "text-[#FF8045]" : "text-[#FF571A]"
                }`}
              >
                01
              </span>
              <div className="flex-1 h-[1px] bg-[#383838] relative overflow-hidden">
                <div
                  className={`absolute inset-0 bg-[#FF571A] transition-opacity duration-500 ${
                    activeStep === 1 ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              {/* Chevron pointing to step 2 (hidden on mobile, centered in gap on md+) */}
              <div
                aria-hidden="true"
                className={`hidden md:flex items-center justify-center absolute left-[calc(100%+16px)] lg:left-[calc(100%+20px)] top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-colors duration-300 select-none ${
                  chevron1Active ? "text-[#FF571A]" : "text-[#555555]"
                }`}
              >
                <ChevronRight className="w-4 h-4 stroke-[1.5]" />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-[22px] sm:text-[24px] font-semibold text-[#FAFAF8] mt-4 sm:mt-5 mb-2 tracking-tight">
              Add your information
            </h3>
            <p className="text-[15px] sm:text-[16px] text-[#B0B0B0] leading-[1.5] min-h-[46px] sm:min-h-[50px] mb-6">
              Bring in company documents and connect the tools your agent can use.
            </p>

            {/* Miniature Panel: Company Information */}
            <div className="flex-1 bg-[#202020] border border-[#383838] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#484848] hover:bg-[#232323] cursor-default select-none min-h-[235px] lg:min-h-[245px]">
              <div>
                {/* Panel Header */}
                <div className="flex items-center gap-2.5 pb-3.5 mb-2 border-b border-[#303030]">
                  <FileText
                    className="w-[18px] h-[18px] text-[#FF571A] stroke-[1.75]"
                    aria-hidden="true"
                  />
                  <span className="text-[15px] sm:text-[16px] font-semibold text-[#FAFAF8]">
                    Company information
                  </span>
                </div>

                {/* Rows */}
                <div className="flex flex-col divide-y divide-[#2a2a2a]/80">
                  {/* Row 1: Return policy */}
                  <div className="flex items-center justify-between py-2.5 sm:py-3 text-[14px] sm:text-[15px]">
                    <div className="flex items-center gap-3">
                      <FileText
                        className="w-4 h-4 text-[#858585] stroke-[1.5]"
                        aria-hidden="true"
                      />
                      <span className="text-[#FAFAF8]">Return policy</span>
                    </div>
                    <OrangeCircleCheck
                      active={s1Check1}
                      animating={s1Check1 && animatingStep === 1}
                    />
                  </div>

                  {/* Row 2: Product guide */}
                  <div className="flex items-center justify-between py-2.5 sm:py-3 text-[14px] sm:text-[15px]">
                    <div className="flex items-center gap-3">
                      <FileText
                        className="w-4 h-4 text-[#858585] stroke-[1.5]"
                        aria-hidden="true"
                      />
                      <span className="text-[#FAFAF8]">Product guide</span>
                    </div>
                    <OrangeCircleCheck
                      active={s1Check2}
                      animating={s1Check2 && animatingStep === 1}
                    />
                  </div>

                  {/* Row 3: Order lookup */}
                  <div className="flex items-center justify-between py-2.5 sm:py-3 text-[14px] sm:text-[15px]">
                    <div className="flex items-center gap-3">
                      <Package
                        className="w-4 h-4 text-[#858585] stroke-[1.5]"
                        aria-hidden="true"
                      />
                      <span className="text-[#FAFAF8]">Order lookup</span>
                    </div>
                    <OrangeCircleCheck
                      active={s1Check3}
                      animating={s1Check3 && animatingStep === 1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </li>

          {/* ------------------------------------------------------------ */}
          {/* STEP 2: Give it a role */}
          {/* ------------------------------------------------------------ */}
          <li
            className={`flex flex-col ${
              hasEntered && !isReducedMotion ? "hiw-entrance-col-2" : ""
            }`}
          >
            {/* Top row: Number + Rule + Decorative Chevron */}
            <div className="relative flex items-center gap-3.5">
              <span
                className={`text-xl sm:text-[22px] font-medium tracking-tight transition-colors duration-300 select-none ${
                  activeStep === 2 ? "text-[#FF8045]" : "text-[#FF571A]"
                }`}
              >
                02
              </span>
              <div className="flex-1 h-[1px] bg-[#383838] relative overflow-hidden">
                <div
                  className={`absolute inset-0 bg-[#FF571A] transition-opacity duration-500 ${
                    activeStep === 2 ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              {/* Chevron pointing to step 3 (hidden on mobile, centered in gap on md+) */}
              <div
                aria-hidden="true"
                className={`hidden md:flex items-center justify-center absolute left-[calc(100%+16px)] lg:left-[calc(100%+20px)] top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-colors duration-300 select-none ${
                  chevron2Active ? "text-[#FF571A]" : "text-[#555555]"
                }`}
              >
                <ChevronRight className="w-4 h-4 stroke-[1.5]" />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-[22px] sm:text-[24px] font-semibold text-[#FAFAF8] mt-4 sm:mt-5 mb-2 tracking-tight">
              Give it a role
            </h3>
            <p className="text-[15px] sm:text-[16px] text-[#B0B0B0] leading-[1.5] min-h-[46px] sm:min-h-[50px] mb-6">
              Tell your agent how to respond and which tasks it should help with.
            </p>

            {/* Miniature Panel: Agent Instructions */}
            <div className="flex-1 bg-[#202020] border border-[#383838] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#484848] hover:bg-[#232323] cursor-default select-none min-h-[235px] lg:min-h-[245px]">
              <div>
                {/* Panel Header */}
                <div className="flex items-center gap-2.5 pb-3.5 mb-3.5 border-b border-[#303030]">
                  <MessageSquare
                    className="w-[18px] h-[18px] text-[#FF571A] stroke-[1.75]"
                    aria-hidden="true"
                  />
                  <span className="text-[15px] sm:text-[16px] font-semibold text-[#FAFAF8]">
                    Agent instructions
                  </span>
                </div>

                {/* Instruction area */}
                <div
                  className={`bg-[#252525] border rounded-lg p-3.5 sm:p-4 transition-colors duration-300 ${
                    s2BorderHighlight
                      ? "border-[#FF571A]/60 shadow-[0_0_12px_rgba(255,87,26,0.15)]"
                      : "border-[#383838]"
                  }`}
                >
                  {/* Screen reader complete text */}
                  <span className="sr-only">{INSTRUCTION_TEXT}</span>
                  {/* Visual progressive streaming text */}
                  <p
                    className="text-[14px] sm:text-[15px] text-[#FAFAF8] leading-[1.45] min-h-[42px]"
                    aria-hidden={s2WordCount < INSTRUCTION_WORDS.length}
                  >
                    {renderedInstructionText}
                    {s2WordCount > 0 && s2WordCount < INSTRUCTION_WORDS.length && (
                      <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#FF571A] animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              </div>

              {/* Bottom: Role Pill & Note */}
              <div
                className={`flex items-center gap-3 mt-3.5 sm:mt-4 transition-all duration-300 ${
                  s2Pill ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                }`}
              >
                <span className="px-3 py-1 rounded-full border border-[#444444] text-[12px] sm:text-[13px] text-[#FAFAF8] bg-[#222222] select-none">
                  Customer support
                </span>
                <span className="text-[12px] sm:text-[13px] text-[#858585] select-none">
                  Example role
                </span>
              </div>
            </div>
          </li>

          {/* ------------------------------------------------------------ */}
          {/* STEP 3: Test, then publish */}
          {/* ------------------------------------------------------------ */}
          <li
            className={`flex flex-col ${
              hasEntered && !isReducedMotion ? "hiw-entrance-col-3" : ""
            }`}
          >
            {/* Top row: Number + Rule */}
            <div className="relative flex items-center gap-3.5">
              <span
                className={`text-xl sm:text-[22px] font-medium tracking-tight transition-colors duration-300 select-none ${
                  activeStep === 3 ? "text-[#FF8045]" : "text-[#FF571A]"
                }`}
              >
                03
              </span>
              <div className="flex-1 h-[1px] bg-[#383838] relative overflow-hidden">
                <div
                  className={`absolute inset-0 bg-[#FF571A] transition-opacity duration-500 ${
                    activeStep === 3 ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-[22px] sm:text-[24px] font-semibold text-[#FAFAF8] mt-4 sm:mt-5 mb-2 tracking-tight">
              Test, then publish
            </h3>
            <p className="text-[15px] sm:text-[16px] text-[#B0B0B0] leading-[1.5] min-h-[46px] sm:min-h-[50px] mb-6">
              Try example questions, check the answers, and publish when you’re ready.
            </p>

            {/* Miniature Panel: Ready to publish */}
            <div className="flex-1 bg-[#202020] border border-[#383838] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#484848] hover:bg-[#232323] cursor-default select-none min-h-[235px] lg:min-h-[245px]">
              <div>
                {/* Panel Header */}
                <div className="flex items-center gap-2.5 pb-3.5 mb-2 border-b border-[#303030]">
                  <OrangeCircleCheck active={true} className="w-[18px] h-[18px]" />
                  <span className="text-[15px] sm:text-[16px] font-semibold text-[#FAFAF8]">
                    Ready to publish
                  </span>
                </div>

                {/* Checklist Rows */}
                <div className="flex flex-col divide-y divide-[#2a2a2a]/80">
                  <div className="flex items-center gap-3 py-2.5 sm:py-3 text-[14px] sm:text-[15px]">
                    <OrangeCircleCheck
                      active={s3Check1}
                      animating={s3Check1 && animatingStep === 3}
                    />
                    <span className="text-[#FAFAF8]">Information added</span>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 sm:py-3 text-[14px] sm:text-[15px]">
                    <OrangeCircleCheck
                      active={s3Check2}
                      animating={s3Check2 && animatingStep === 3}
                    />
                    <span className="text-[#FAFAF8]">Instructions set</span>
                  </div>
                </div>
              </div>

              {/* Bottom: Published Status Badge & Draft Note */}
              <div
                className={`flex flex-wrap items-center gap-2.5 sm:gap-3 mt-3.5 sm:mt-4 transition-all duration-300 ${
                  s3Published ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                }`}
              >
                <div className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 rounded-lg bg-[#FF571A] text-white font-semibold text-[13px] sm:text-[14px] shadow-sm select-none">
                  <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  <span>Published</span>
                </div>
                <span className="text-[11px] sm:text-[12px] text-[#858585] select-none leading-tight">
                  Keep improving your draft
                </span>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
