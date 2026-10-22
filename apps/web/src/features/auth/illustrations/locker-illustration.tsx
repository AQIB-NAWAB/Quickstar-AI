"use client";

import { useEffect, useRef } from "react";
import { LOCKER_SVG } from "./locker-svg";
import { createSceneLoop, follow } from "./scene-loop";

// Withdrawal follows the isometric depth axis of the key's shaft.
const WITHDRAWAL = [-17.55, 9.12];

export function LockerIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = containerRef.current;
    if (!stage) return;
    const key = stage.querySelector<SVGElement>("[data-key]");
    const status = stage.querySelector<SVGElement>("[data-lock-status]");
    const readout = stage.querySelector<HTMLElement>("[data-key-readout]");
    let at = 0;
    let target = 0;
    let lastInput = -10000;
    let tourReturn = 0;
    const loop = createSceneLoop(stage, (dt, now, reduced) => {
      if (tourReturn && now > tourReturn) { target = 0; tourReturn = 0; }
      at = follow(at, target, dt, reduced, 0.19);
      key?.setAttribute("transform", "translate(" + WITHDRAWAL[0] * at + " " + WITHDRAWAL[1] * at + ")");
      status?.setAttribute("opacity", String(1 - at * 0.55));
      return at !== target || tourReturn > 0;
    });
    function toggle() {
      target = target > 0.5 ? 0 : 1;
      lastInput = performance.now();
      tourReturn = 0;
      stage?.setAttribute("aria-pressed", String(target === 0));
      if (readout) readout.textContent = target === 0 ? "Key inserted" : "Key withdrawn";
      loop.wake();
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    }
    function tour() {
      if (loop.canTour() && target === 0 && performance.now() - lastInput > 6000) {
        target = 1;
        tourReturn = performance.now() + 1400;
        loop.wake();
      }
    }
    stage.addEventListener("click", toggle);
    stage.addEventListener("keydown", keydown);
    const first = window.setTimeout(tour, 2200);
    const idle = window.setInterval(tour, 10000);
    return () => {
      loop.dispose();
      clearTimeout(first);
      clearInterval(idle);
      stage.removeEventListener("click", toggle);
      stage.removeEventListener("keydown", keydown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="auth-art-wrap iso auth-locker-art"
      data-theme="light"
      tabIndex={0}
      role="button"
      aria-label="Insert or withdraw the locker key. The locker door stays closed."
      aria-pressed="true"
    >
      <div className="auth-scene-svg" dangerouslySetInnerHTML={{ __html: LOCKER_SVG }} />
      <span className="auth-sr-only" data-key-readout aria-live="polite">Key inserted</span>
    </div>
  );
}
