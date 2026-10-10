"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const exampleQuestions = [
  ["What is your", "return policy?"],
  ["Which product", "is right for me?"],
  ["How can I", "reach your team?"],
] as const;

export function CtaBanner() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const changeQuestion = (direction: number) => {
    setQuestionIndex(
      (current) => (current + direction + exampleQuestions.length) % exampleQuestions.length,
    );
  };
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const sectionRef = useRef<HTMLElement>(null);
  const illustrationRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Viewport intersection observer for restrained entrance
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Subtle bounded pointer interaction on fine-pointer devices
  useEffect(() => {
    const illustration = illustrationRef.current;
    const bubble = bubbleRef.current;
    if (!illustration || !bubble) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    bubble.style.transform = "translate3d(0, 0, 0) rotate(-6deg)";
    if (prefersReducedMotion || !isFinePointer) return;

    let targetX = 0;
    let targetY = 0;
    let targetRot = -6; // resting angle in degrees

    const applyTransform = () => {
      if (bubble) {
        bubble.style.transform = `translate3d(${targetX.toFixed(2)}px, ${targetY.toFixed(2)}px, 0) rotate(${targetRot.toFixed(2)}deg)`;
      }
      rafIdRef.current = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = illustration.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2));

      // Bounded movement: max ±1.25deg rotation delta around resting -6deg, max ±3.5px translation
      targetRot = -6 + nx * 1.25;
      targetX = nx * 3.5;
      targetY = ny * 3.5;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(applyTransform);
      }
    };

    const handlePointerLeave = () => {
      targetX = 0;
      targetY = 0;
      targetRot = -6;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(applyTransform);
      }
    };

    illustration.addEventListener("pointermove", handlePointerMove);
    illustration.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      illustration.removeEventListener("pointermove", handlePointerMove);
      illustration.removeEventListener("pointerleave", handlePointerLeave);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="landing-section w-full bg-[#FAFAF8] overflow-hidden"
      aria-label="Closing invitation"
    >
      <div className="landing-container">
        {/* ============================================================== */}
        {/* ASYMMETRIC TWO-COLUMN CHARCOAL PANEL                           */}
        {/* ============================================================== */}
        <div
          className={`landing-cta-panel relative w-full rounded-[20px] bg-[#262626] min-h-[376px] items-center transition-all duration-500 ease-out ${
            isInView || isReducedMotion ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          {/* ------------------------------------------------------------ */}
          {/* LEFT COLUMN: EXACT HEADLINE, COPY & CTA BUTTON               */}
          {/* ------------------------------------------------------------ */}
          <div className="landing-cta-copy text-left">
            {/* Headline: Exactly two desktop lines */}
            <h2 className="landing-title landing-title-inverse">
              <span className="block text-white">Start with one</span>
              <span className="block text-[#FF571A]">everyday question.</span>
            </h2>

            {/* Description: Muted light grey */}
            <p className="landing-description landing-description-spaced landing-description-inverse max-w-[360px]">
              Start with a question your team answers every day.
            </p>

            {/* Primary Action Button */}
            <div className="mt-6 sm:mt-7">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-6 h-[44px] bg-[#FF571A] hover:bg-[#E04810] active:bg-[#CC4410] text-white font-semibold text-[15px] rounded-[8px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] select-none"
              >
                <span>Get started</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:transform-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* RIGHT COLUMN: SPEECH BUBBLE ILLUSTRATION                     */}
          {/* ------------------------------------------------------------ */}
          <div
            ref={illustrationRef}
            data-bubble-container="true"
            className="landing-cta-illustration w-full flex flex-col items-center select-none"
            role="region"
            aria-roledescription="carousel"
            aria-label="Example starting questions"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                changeQuestion(event.key === "ArrowRight" ? 1 : -1);
              }
            }}
          >
            <div
              ref={bubbleRef}
              data-bubble-element="true"
              className="landing-cta-bubble relative w-full max-w-[360px] sm:max-w-[370px] min-[1100px]:max-w-none min-[1100px]:w-[360px] xl:w-[400px] h-[235px] sm:h-[250px] min-[1100px]:h-[250px] xl:h-[270px] transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{
                transform: "translate3d(0, 0, 0) rotate(-6deg)",
                transformOrigin: "center center",
              }}
            >
              {/* Native SVG Speech Bubble Outline with Integrated Tail */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 400 270"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M 54 12 H 346 Q 390 12 390 56 V 188 Q 390 232 346 232 H 78 L 51 250 Q 37 260 41 246 L 45 231 Q 10 225 10 188 V 56 Q 10 12 54 12 Z"
                  stroke="#D4CEC6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Real HTML Content Layer inside the Rotated Bubble */}
              <div className="relative z-10 h-full flex flex-col justify-start pt-7 sm:pt-8 min-[1100px]:pt-[42px] xl:pt-[48px] pb-6 sm:pb-7 min-[1100px]:pb-[28px] pl-8 sm:pl-9 min-[1100px]:pl-[44px] xl:pl-[48px] pr-7 sm:pr-8 min-[1100px]:pr-[36px]">
                {/* Orange Opening Quotation Mark */}
                <svg
                  className="w-5 h-4 sm:w-[22px] sm:h-[17px] xl:w-[28px] xl:h-[24px] text-[#FF571A] fill-current mb-2.5 sm:mb-3 xl:mb-4 shrink-0"
                  viewBox="0 0 25 20"
                  aria-hidden="true"
                >
                  <path d="M0 11.5C0 5.8 4.2 1.2 9.4 0L10.8 2.6C7.4 3.7 5.4 6.2 5 8.8H9.6V19.5H0V11.5ZM13.8 11.5C13.8 5.8 18 1.2 23.2 0L24.6 2.6C21.2 3.7 19.2 6.2 18.8 8.8H23.4V19.5H13.8V11.5Z" />
                </svg>

                <div aria-live="polite" aria-atomic="true">
                  <p className="text-[24px] sm:text-[28px] min-[1100px]:text-[32px] xl:text-[36px] font-bold text-white leading-[1.16] tracking-[-0.02em] m-0">
                    {exampleQuestions[questionIndex][0]}
                    <br />
                    {exampleQuestions[questionIndex][1]}
                  </p>
                  <span className="sr-only">
                    Example question {questionIndex + 1} of {exampleQuestions.length}
                  </span>
                </div>

                {/* Example question label */}
                <p className="text-[14px] sm:text-[14px] min-[1100px]:text-[15px] xl:text-[17px] text-[#C4C4C4] font-normal tracking-[0.01em] mt-3 sm:mt-3.5 mb-0">
                  Example question
                </p>
              </div>
            </div>
            <div className="mt-2 flex w-full max-w-[360px] sm:max-w-[370px] min-[1100px]:max-w-none min-[1100px]:w-[360px] xl:w-[400px] items-center justify-end px-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => changeQuestion(-1)}
                  aria-label="Previous example question"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#77736D] text-white transition-colors hover:border-[#FF571A] hover:text-[#FF571A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF571A]"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => changeQuestion(1)}
                  aria-label="Next example question"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#77736D] text-white transition-colors hover:border-[#FF571A] hover:text-[#FF571A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF571A]"
                >
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
