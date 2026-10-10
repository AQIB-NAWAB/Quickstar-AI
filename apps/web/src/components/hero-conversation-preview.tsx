"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  FileText,
  Package,
  Check,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";

interface SourceChip {
  type: "doc" | "order";
  label: string;
}

interface Scenario {
  id: string;
  tabLabel: string;
  q1: string;
  a1Lead: string;
  a1Body: string;
  sources: SourceChip[];
  q2: string;
  a2: string;
  checkType: "both" | "doc" | "order";
}

const SCENARIOS: Scenario[] = [
  {
    id: "customer-support",
    tabLabel: "Customer support",
    q1: "Can I return my headphones?",
    a1Lead: "Yes — if they’re unopened.",
    a1Body:
      "Your order arrived 14 days ago, so it’s within the 30-day return window. Keep the original packaging and order confirmation.",
    sources: [
      { type: "doc", label: "Return policy" },
      { type: "order", label: "Order #1042" },
    ],
    q2: "What do I need to keep?",
    a2: "The original packaging and your order confirmation.",
    checkType: "both",
  },
  {
    id: "company-knowledge",
    tabLabel: "Company knowledge",
    q1: "What’s our return policy?",
    a1Lead: "Unopened items can be returned within 30 days.",
    a1Body:
      "Customers need the original packaging and proof of purchase. These details come from the company’s return policy.",
    sources: [{ type: "doc", label: "Return policy" }],
    q2: "Do I need a receipt?",
    a2: "Yes. A receipt or order confirmation can serve as proof of purchase.",
    checkType: "doc",
  },
  {
    id: "order-updates",
    tabLabel: "Order updates",
    q1: "Where is order #1042?",
    a1Lead: "Your order was delivered 14 days ago.",
    a1Body:
      "The delivery record lists the front porch as the delivery location.",
    sources: [{ type: "order", label: "Order #1042" }],
    q2: "Where was it left?",
    a2: "The delivery record says it was left at the front porch.",
    checkType: "order",
  },
];

const SCENARIO_DURATION = 14300;

export function HeroConversationPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeScenario, setActiveScenario] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Update active tab underline position
  const updateIndicator = useCallback(() => {
    const activeTabEl = tabRefs.current[activeScenario];
    if (activeTabEl) {
      setIndicatorStyle({
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth,
      });
    }
  }, [activeScenario]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  // Handle document visibility
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Handle viewport intersection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Main playback timer loop (Note: NO hover pause per approved specification!)
  useEffect(() => {
    if (prefersReducedMotion) {
      setElapsed(SCENARIO_DURATION);
      return;
    }

    if (isPaused || isTabHidden || !isInView) {
      return;
    }

    const intervalTime = 40;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + intervalTime;
        if (next >= SCENARIO_DURATION) {
          setActiveScenario((s) => (s + 1) % SCENARIOS.length);
          return 0;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, isTabHidden, isInView, prefersReducedMotion]);

  const handleTabClick = useCallback((index: number) => {
    setActiveScenario(index);
    setElapsed(0);
    setIsPaused(false);
  }, []);

  const handleReplay = useCallback(() => {
    setElapsed(0);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Keyboard navigation for scenario tabs
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      const nextIndex = (index + 1) % SCENARIOS.length;
      handleTabClick(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    } else if (e.key === "ArrowLeft") {
      const prevIndex = (index - 1 + SCENARIOS.length) % SCENARIOS.length;
      handleTabClick(prevIndex);
      tabRefs.current[prevIndex]?.focus();
    }
  };

  const scenario = SCENARIOS[activeScenario];

  // Sequence state thresholds
  const showQ1 = true;
  const showA1Typing = elapsed >= 600 && elapsed < 2200;
  const showA1 = elapsed >= 2200;
  const showSources = elapsed >= 3600;
  const showQ2 = elapsed >= 7000;
  const showA2Typing = elapsed >= 7500 && elapsed < 8500;
  const showA2 = elapsed >= 8500;
  const isFadingOut = elapsed >= 14000;

  // Information strip check & confirmation states
  let isDocChecking = false;
  let isDocConfirmed = false;
  let isOrderChecking = false;
  let isOrderConfirmed = false;

  if (scenario.checkType === "both") {
    isDocChecking = elapsed >= 600 && elapsed < 1500;
    isDocConfirmed = elapsed >= 1500;
    isOrderChecking = elapsed >= 1500 && elapsed < 2200;
    isOrderConfirmed = elapsed >= 2200;
  } else if (scenario.checkType === "doc") {
    isDocChecking = elapsed >= 600 && elapsed < 1500;
    isDocConfirmed = elapsed >= 1500;
    isOrderConfirmed = false;
  } else if (scenario.checkType === "order") {
    isOrderChecking = elapsed >= 600 && elapsed < 1500;
    isOrderConfirmed = elapsed >= 1500;
    isDocConfirmed = false;
  }

  if (prefersReducedMotion) {
    isDocConfirmed = scenario.checkType === "both" || scenario.checkType === "doc";
    isOrderConfirmed = scenario.checkType === "both" || scenario.checkType === "order";
  }

  // Progressive text reveal for A1 explanation (over ~800ms)
  const a1Words = scenario.a1Body.split(" ");
  let visibleA1WordCount = a1Words.length;
  if (!prefersReducedMotion && elapsed >= 2200 && elapsed < 3200) {
    const ratio = (elapsed - 2200) / 1000;
    visibleA1WordCount = Math.max(3, Math.floor(ratio * a1Words.length));
  }
  const visibleA1Text = prefersReducedMotion
    ? scenario.a1Body
    : a1Words.slice(0, visibleA1WordCount).join(" ");

  return (
    <div
      ref={containerRef}
      id="playground"
      className="w-full max-w-[620px] mx-auto lg:ml-auto select-none scroll-mt-24 lg:scroll-mt-28"
    >
      {/* ============================================================== */}
      {/* 1. SCENARIO NAVIGATION (ABOVE THE CARD) */}
      {/* ============================================================== */}
      <div
        className="relative flex items-center justify-between sm:justify-start sm:gap-8 pb-2.5 mb-3.5 sm:mb-4 px-1"
        role="tablist"
        aria-label="Conversation scenarios"
      >
        {SCENARIOS.map((s, index) => {
          const isSelected = activeScenario === index;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              aria-selected={isSelected}
              aria-controls="conversation-card-panel"
              id={`scenario-tab-${s.id}`}
              onClick={() => handleTabClick(index)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`text-sm sm:text-[15px] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm py-1 ${
                isSelected
                  ? "text-[#262626] font-semibold"
                  : "text-[#858585] hover:text-[#262626] font-medium"
              }`}
            >
              {s.tabLabel}
            </button>
          );
        })}

        {/* Fluid sliding orange underline indicator */}
        <span
          className="absolute bottom-0 h-[3px] bg-[#FF571A] rounded-full transition-all duration-300 ease-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>

      {/* ============================================================== */}
      {/* 2. MAIN WHITE CONVERSATION CARD */}
      {/* ============================================================== */}
      <div
        id="conversation-card-panel"
        role="tabpanel"
        aria-labelledby={`scenario-tab-${scenario.id}`}
        className="relative w-full bg-white rounded-[16px] border border-[#E8E8E5] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        {/* Assistant Header */}
        <div className="h-[72px] sm:h-[76px] px-6 sm:px-7 flex items-center justify-between border-b border-[#E8E8E5]">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <BrandLogo size={34} className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[17px] sm:text-[18px] font-semibold text-[#262626] leading-tight">
                Acme assistant
              </span>
              <span className="text-xs sm:text-[13px] text-[#858585] leading-normal mt-0.5">
                Example conversation
              </span>
            </div>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={togglePause}
            className="w-10 h-10 rounded-full bg-[#F6F6F4] hover:bg-[#EDEDEB] border border-[#E8E8E5] flex items-center justify-center text-[#262626] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A]"
            aria-label={isPaused ? "Resume example" : "Pause example"}
          >
            {isPaused ? (
              <Play className="w-4 h-4 fill-current ml-0.5 text-[#262626]" />
            ) : (
              <Pause className="w-4 h-4 fill-current text-[#262626]" />
            )}
          </button>
        </div>

        {/* Integrated Information Strip (replaces floating card) */}
        <div className="h-14 sm:h-[60px] px-6 sm:px-7 bg-[#FAF9F6] border-b border-[#E8E8E5] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
          <span className="text-xs sm:text-[13px] text-[#737373] font-medium shrink-0">
            Using your information
          </span>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Company documents chip */}
            <div
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-[8px] border text-xs sm:text-[12.5px] transition-all duration-200 ${
                isDocChecking
                  ? "bg-[#FFF5F0] border-[#FF571A]/40 text-[#262626]"
                  : isDocConfirmed
                  ? "bg-white border-[#E8E8E5] text-[#262626]"
                  : "bg-white border-[#E8E8E5] text-[#525252]"
              }`}
            >
              <FileText
                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                  isDocChecking || isDocConfirmed ? "text-[#FF571A]" : "text-[#737373]"
                }`}
              />
              <span className="font-medium">Company documents</span>
              {isDocConfirmed && (
                <span className="w-3.5 h-3.5 rounded-full bg-[#FF571A] text-white flex items-center justify-center animate-hero-check shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>

            {/* Order information chip */}
            <div
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-[8px] border text-xs sm:text-[12.5px] transition-all duration-200 ${
                isOrderChecking
                  ? "bg-[#FFF5F0] border-[#FF571A]/40 text-[#262626]"
                  : isOrderConfirmed
                  ? "bg-white border-[#E8E8E5] text-[#262626]"
                  : "bg-white border-[#E8E8E5] text-[#525252]"
              }`}
            >
              <Package
                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                  isOrderChecking || isOrderConfirmed ? "text-[#FF571A]" : "text-[#737373]"
                }`}
              />
              <span className="font-medium">Order information</span>
              {isOrderConfirmed && (
                <span className="w-3.5 h-3.5 rounded-full bg-[#FF571A] text-white flex items-center justify-center animate-hero-check shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Conversation Area with deliberate, rock-solid height */}
        <div
          className={`p-6 sm:p-7 space-y-5 h-[390px] sm:h-[410px] flex flex-col justify-start overflow-hidden transition-opacity duration-200 ${
            isFadingOut ? "animate-hero-fade-out" : ""
          }`}
        >
          {/* User Message 1 */}
          {showQ1 && (
            <div className="flex justify-end animate-hero-msg-in">
              <div className="max-w-[85%] bg-[#F4F4F2] text-[#262626] px-4 py-2.5 rounded-[14px] text-[14px] sm:text-[15px] font-normal leading-relaxed">
                {scenario.q1}
              </div>
            </div>
          )}

          {/* Assistant Message 1 Typing Indicator */}
          {showA1Typing && (
            <div className="flex items-start gap-3 animate-hero-msg-in">
              <BrandLogo size={24} className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#262626] mb-1">
                  Acme assistant
                </span>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-[#F4F4F2] text-[#737373] text-[13px]">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] animate-[hero-dot-bounce_1.2s_infinite]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] animate-[hero-dot-bounce_1.2s_infinite_200ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] animate-[hero-dot-bounce_1.2s_infinite_400ms]" />
                  </span>
                  <span>Preparing an answer</span>
                </div>
              </div>
            </div>
          )}

          {/* Assistant Message 1 Full Response */}
          {showA1 && (
            <div className="flex items-start gap-3 animate-hero-msg-in">
              <BrandLogo size={24} className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-[#262626] mb-1">
                  Acme assistant
                </span>
                <div className="text-[18px] sm:text-[19px] font-semibold text-[#262626] mb-1 leading-snug">
                  {scenario.a1Lead}
                </div>
                <p className="text-[14px] sm:text-[15px] text-[#666666] leading-[1.55] mb-3">
                  {visibleA1Text}
                </p>

                {/* Source Chips */}
                {showSources && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {scenario.sources.map((chip, idx) => (
                      <div
                        key={chip.label}
                        style={{ animationDelay: `${idx * 100}ms` }}
                        className="animate-hero-chip-in inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white border border-[#E8E8E5] text-xs sm:text-[12.5px] text-[#525252] shadow-2xs"
                      >
                        {chip.type === "doc" ? (
                          <FileText className="w-3.5 h-3.5 text-[#737373]" />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-[#737373]" />
                        )}
                        <span>{chip.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Message 2 */}
          {showQ2 && (
            <div className="flex justify-end pt-0.5 animate-hero-msg-in">
              <div className="max-w-[85%] bg-[#F4F4F2] text-[#262626] px-4 py-2.5 rounded-[14px] text-[14px] sm:text-[15px] font-normal leading-relaxed">
                {scenario.q2}
              </div>
            </div>
          )}

          {/* Assistant Message 2 Typing Indicator */}
          {showA2Typing && (
            <div className="flex items-start gap-3 animate-hero-msg-in">
              <BrandLogo size={24} className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#262626] mb-1">
                  Acme assistant
                </span>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-[#F4F4F2] text-[#737373] text-[13px]">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] animate-[hero-dot-bounce_1.2s_infinite]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] animate-[hero-dot-bounce_1.2s_infinite_200ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] animate-[hero-dot-bounce_1.2s_infinite_400ms]" />
                  </span>
                  <span>Preparing an answer</span>
                </div>
              </div>
            </div>
          )}

          {/* Assistant Message 2 Response */}
          {showA2 && (
            <div className="flex items-start gap-3 animate-hero-msg-in">
              <BrandLogo size={24} className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-[#262626] mb-1">
                  Acme assistant
                </span>
                <p className="text-[14px] sm:text-[15px] text-[#262626] leading-relaxed">
                  {scenario.a2}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 sm:h-14 px-6 sm:px-7 border-t border-[#E8E8E5] flex items-center justify-between text-xs sm:text-[13px]">
          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-2 text-[#737373] hover:text-[#262626] font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] rounded-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay example</span>
          </button>

          <span className="text-[#858585] select-none">
            Illustrative example
          </span>
        </div>
      </div>
    </div>
  );
}
