"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseIllustrationMotionOptions {
  offsets?: Record<string, [number, number]>;
  isLocker?: boolean;
}

/**
 * High-performance, time-based exponential follow easing hook for SVG illustration interactivity.
 * Directly animates DOM attributes on SVG refs without triggering React re-renders every frame.
 * Automatically handles visibility pausing, offscreen pausing via IntersectionObserver,
 * and prefers-reduced-motion preference changes.
 */
export function useIllustrationMotion({
  offsets = {},
  isLocker = false,
}: UseIllustrationMotionOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const progressRef = useRef(0);
  const activeRef = useRef(false);
  activeRef.current = active;

  const toggle = useCallback(() => {
    setActive((prev) => !prev);
  }, []);

  const setExplicit = useCallback((value: boolean) => {
    setActive(value);
  }, []);

  useEffect(() => {
    const stage = containerRef.current;
    if (!stage) return;

    let at = progressRef.current;
    let target = 0;
    let raf = 0;
    let last = 0;
    let isVisible = false;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = mediaQuery.matches;

    const onMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        at = target;
        paint();
      } else {
        run();
      }
    };
    mediaQuery.addEventListener("change", onMotionChange);

    const drawerElements = stage.querySelectorAll<SVGElement>('[data-moving="drawer"]');
    const lockStatus = stage.querySelector<SVGElement>('[data-lock-status]');
    const focusLine = stage.querySelector<SVGElement>('[data-focus-line]');

    function paint() {
      progressRef.current = at;
      if (offsets["drawer"]) {
        const [dx, dy] = offsets["drawer"];
        drawerElements.forEach((el) => {
          el.setAttribute("transform", `translate(${dx * at} ${dy * at})`);
        });
      }
      if (lockStatus) {
        lockStatus.setAttribute("opacity", String(1 - 0.45 * at));
      }
      if (focusLine) {
        focusLine.setAttribute("width", String(13 + 8 * at));
      }
    }

    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;

      if (prefersReducedMotion) {
        at = target;
      } else {
        at = at + (target - at) * (1 - Math.exp(-dt / 0.26));
      }

      if (Math.abs(at - target) < 0.001) {
        at = target;
      }

      paint();

      if (isVisible && !document.hidden && at !== target && !prefersReducedMotion) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }

    function run() {
      if (isVisible && !document.hidden && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    }

    target = activeRef.current ? 1 : 0;
    if (prefersReducedMotion) {
      at = target;
      paint();
    } else {
      run();
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      isVisible = entry.isIntersecting;
      if (isVisible && at !== target) {
        run();
      } else if (!isVisible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    observer.observe(stage);

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else if (isVisible && at !== target) {
        run();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      mediaQuery.removeEventListener("change", onMotionChange);
    };
  }, [active, offsets, isLocker]);

  return { containerRef, active, toggle, setExplicit };
}
