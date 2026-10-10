"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { inject } from "@/lib/marketing/hairline/kernel";
import {
  mountBusinessConveyor,
  ConveyorInstance,
  StationId,
  SelectionSource,
} from "@/lib/marketing/hairline/business-conveyor";

const TOOLTIPS: Record<StationId, { title: string; hintPointer: string; hintKey: string }> = {
  lead: {
    title: "Find a lead",
    hintPointer: "Discover people who fit your business",
    hintKey: "Select another step to explore",
  },
  call: {
    title: "Start a conversation",
    hintPointer: "Turn interest into a useful conversation",
    hintKey: "Select another step to explore",
  },
  action: {
    title: "Take the next action",
    hintPointer: "Follow up, schedule, and move work forward",
    hintKey: "Select another step to explore",
  },
};

const STATIONS: { id: StationId; label: string }[] = [
  { id: "lead", label: "Find a lead." },
  { id: "call", label: "Start a conversation." },
  { id: "action", label: "Take the next action." },
];

export function HeroBusinessConveyor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const conveyorRef = useRef<ConveyorInstance | null>(null);

  const [activeStation, setActiveStation] = useState<StationId | null>(null);
  const [activeSource, setActiveSource] = useState<SelectionSource | null>(null);
  const [anchor, setAnchor] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Mount conveyor engine on client
  useEffect(() => {
    if (!stageRef.current) return;

    inject(document);

    const stage = stageRef.current;
    stage.setAttribute("data-hairline", "business-conveyor");
    stage.setAttribute("role", "img");
    stage.setAttribute(
      "aria-label",
      "A lead moves through discovery, conversation, and action along an isometric conveyor.",
    );

    // High-contrast graphite palette matching approved visual reference
    stage.style.setProperty("--hairline-plate", "#FAFAF8");
    stage.style.setProperty("--hairline-hi", "#1F1F23");
    stage.style.setProperty("--hairline-edge", "#48484F");
    stage.style.setProperty("--hairline-mid", "#787882");
    stage.style.setProperty("--hairline-lo", "#A8A8B2");
    stage.style.setProperty("--hairline-stroke", "1.05");

    // Native vector artwork; no raster reference is rendered in the scene.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1600 460");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "w-full h-full block");
    stage.appendChild(svg);

    const instance = mountBusinessConveyor({
      stage,
      svg,
      viewBox: { width: 1600, height: 460 },
      onStationChange: (station, source, ptAnchor) => {
        setActiveStation(station);
        setActiveSource(source);
        if (ptAnchor) setAnchor(ptAnchor);
      },
    });

    conveyorRef.current = instance;

    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const onMqChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener("change", onMqChange);
      return () => {
        mq.removeEventListener("change", onMqChange);
        instance.destroy();
        svg.remove();
        conveyorRef.current = null;
      };
    }

    return () => {
      instance.destroy();
      svg.remove();
      conveyorRef.current = null;
    };
  }, []);

  // Handle pause toggle
  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      conveyorRef.current?.setPaused(next);
      return next;
    });
  }, []);

  // Select station from keyboard / caption buttons
  const handleSelectStation = useCallback((id: StationId) => {
    conveyorRef.current?.setStation(id, "keyboard");
  }, []);

  // Handle global escape key to dismiss selection
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeStation) {
        conveyorRef.current?.setStation(null, "keyboard");
        setActiveStation(null);
        setActiveSource(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeStation]);

  const activeTooltip = activeStation ? TOOLTIPS[activeStation] : null;

  return (
    <div
      ref={containerRef}
      id="playground"
      className="scroll-mt-20 lg:scroll-mt-24 w-full flex flex-col items-center select-none"
    >
      {/* Conveyor Stage Container */}
      <div className="hero-conveyor-stage relative w-full max-w-[1340px] aspect-[1600/460]">
        {/* Hairline Stage Mount */}
        <div ref={stageRef} className="w-full h-full relative" tabIndex={-1} />

        {/* Floating HTML Tooltip */}
        {activeTooltip && anchor && (
          <div
            className="hidden sm:block absolute z-20 pointer-events-none transition-all duration-200 ease-out"
            style={{
              left: `${anchor.xPercent}%`,
              top: `${anchor.yPercent}%`,
              transform: "translate(-50%, -100%) translateY(-10px)",
            }}
          >
            <div className="bg-white/95 backdrop-blur-sm border border-[#E8E8E5] shadow-sm rounded-[9px] px-3 py-1.5 min-w-[155px] text-center">
              <p className="text-[12.5px] font-semibold text-[#262626] leading-tight mb-0.5">
                {activeTooltip.title}
              </p>
              <p className="text-[11px] text-[#666666] leading-tight font-normal">
                {reducedMotion
                  ? "Selected station"
                  : activeSource === "pointer"
                    ? activeTooltip.hintPointer
                    : activeTooltip.hintKey}
              </p>
            </div>
            {/* Subtle bottom pointer caret */}
            <div className="w-2 h-2 bg-white border-b border-r border-[#E8E8E5] transform rotate-45 mx-auto -mt-1 shadow-sm" />
          </div>
        )}
      </div>

      {/* Understated Station Captions */}
      <div className="w-full max-w-[1340px] sm:px-4 mt-0 grid grid-cols-3 gap-2 sm:gap-6 text-center">
        {STATIONS.map((station) => {
          const isSelected = activeStation === station.id;
          return (
            <button
              key={station.id}
              type="button"
              onClick={() => handleSelectStation(station.id)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") {
                  conveyorRef.current?.setStation(station.id, "pointer");
                }
              }}
              onPointerLeave={() => {
                if (activeSource === "pointer") conveyorRef.current?.setStation(null, "pointer");
              }}
              onFocus={() => conveyorRef.current?.setStation(station.id, "keyboard")}
              onBlur={() => conveyorRef.current?.setStation(null, "keyboard")}
              onKeyDown={(event) => {
                const index = STATIONS.findIndex((item) => item.id === station.id);
                const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                if (!offset) return;
                event.preventDefault();
                const next = STATIONS[(index + offset + STATIONS.length) % STATIONS.length];
                containerRef.current
                  ?.querySelector<HTMLButtonElement>(`[data-station="${next.id}"]`)
                  ?.focus();
              }}
              data-station={station.id}
              aria-pressed={isSelected}
              className={`group min-w-0 min-h-[44px] inline-flex items-center justify-center gap-1.5 py-1 px-1 sm:px-2.5 rounded-[6px] text-[12px] sm:text-[14px] lg:text-[15px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] ${
                isSelected
                  ? "text-[#FF571A] font-medium bg-[#FFF5EF]/70"
                  : "text-[#666666] hover:text-[#262626] font-normal hover:bg-black/[0.02]"
              }`}
            >
              <span
                className={`hidden sm:block shrink-0 w-1.5 h-1.5 rounded-full transition-opacity ${
                  isSelected ? "bg-[#FF571A] opacity-100" : "opacity-0"
                }`}
                aria-hidden="true"
              />
              <span>{station.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quiet Bottom Label & Motion Control */}
      <div className="mt-1 flex items-center justify-center gap-3 text-[#858585]">
        <span className="text-[11px] sm:text-[11.5px] tracking-normal font-normal">
          {activeTooltip ? activeTooltip.hintPointer : "Explore a step · illustrative workflow"}
        </span>

        <span className="text-[11px] text-[#D0D0CE]" aria-hidden="true">
          |
        </span>

        {/* Accessible Pause / Resume Toggle */}
        <button
          type="button"
          onClick={togglePause}
          aria-label={isPaused ? "Resume conveyor motion" : "Pause conveyor motion"}
          className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] text-[#858585] hover:text-[#262626] transition-colors py-0.5 px-1.5 rounded hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#FF571A]"
        >
          {isPaused ? (
            <>
              <span className="text-[9px]" aria-hidden="true">
                ▶
              </span>
              <span>Resume</span>
            </>
          ) : (
            <>
              <span className="text-[10px] tracking-tighter font-mono" aria-hidden="true">
                ||
              </span>
              <span>Pause</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
