"use client";

import { useEffect, useRef, type RefObject } from "react";
import { logoDefinition, type LogoMood } from "./definition";

interface MotionOptions {
  svg: RefObject<SVGSVGElement>;
  body: RefObject<SVGGElement>;
  left: RefObject<SVGGElement>;
  right: RefObject<SVGGElement>;
  enabled: boolean;
  paused: boolean;
  mood: LogoMood;
}

export function useLogoMotion({ svg, body, left, right, enabled, paused, mood }: MotionOptions) {
  const latestMood = useRef(mood);
  latestMood.current = mood;
  useEffect(() => {
    if (!enabled || paused) return;
    const element = svg.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let visible = true;
    let frame = 0;
    let wake = () => {};
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let gazeX = 0;
    let gazeY = 0;
    let scrollTilt = 0;
    let lastScroll = window.scrollY;
    let bounds = element.getBoundingClientRect();
    const reset = () => {
      body.current?.removeAttribute("transform");
      left.current?.removeAttribute("transform");
      right.current?.removeAttribute("transform");
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
    };
    const scroll = () => {
      scrollTilt = Math.max(-9, Math.min(9, (window.scrollY - lastScroll) * 0.22));
      lastScroll = window.scrollY;
      bounds = element.getBoundingClientRect();
    };
    const resize = () => {
      bounds = element.getBoundingClientRect();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    observer.observe(element);
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    const wakeWhenVisible = () => wake();
    preference.addEventListener("change", wakeWhenVisible);
    document.addEventListener("visibilitychange", wakeWhenVisible);

    // Load Avatar Lab's real runtime after mount; React 18 stays unchanged.
    void import("@bible-strong/avatar-core")
      .then((engine) => {
        if (disposed) return;
        const validated = engine.validateAvatarDefinition(logoDefinition);
        if (!validated.ok) throw new Error(validated.errors[0]?.message);
        const started = engine.playAvatarAnimation(
          validated.value,
          latestMood.current,
          performance.now(),
        );
        if (!started.ok) return;
        let playback = started.value;
        let wasSleeping = false;
        const tick = (now: number) => {
          frame = 0;
          if (disposed) return;
          const sleeping = preference.matches || !visible || document.hidden;
          if (sleeping) {
            if (!wasSleeping) playback = engine.pauseAvatarPlayback(playback, now);
            wasSleeping = true;
            if (preference.matches) reset();
            return;
          } else {
            if (wasSleeping) playback = engine.resumeAvatarPlayback(playback, now);
            wasSleeping = false;
            if (playback.activeAnimation !== latestMood.current) {
              const from = engine.sampleAvatarFrame(validated.value, playback, now, {
                random: Math.random,
              });
              const changed = engine.playAvatarAnimation(
                validated.value,
                latestMood.current,
                now,
                from,
              );
              if (changed.ok) playback = changed.value;
            }
            playback = engine.advanceAvatarPlayback(validated.value, playback, now, {
              random: Math.random,
            });
            const sample = engine.sampleAvatarFrame(validated.value, playback, now, {
              random: Math.random,
            });
            // Re-measure moving characters and normalize against the whole tab.
            // The gaze keeps changing across the viewport instead of saturating near the logo.
            bounds = element.getBoundingClientRect();
            const targetX = Math.max(
              -13,
              Math.min(
                13,
                ((pointerX - bounds.left - bounds.width / 2) / Math.max(1, window.innerWidth)) * 13,
              ),
            );
            const targetY = Math.max(
              -10,
              Math.min(
                10,
                ((pointerY - bounds.top - bounds.height / 2) / Math.max(1, window.innerHeight)) *
                  10,
              ),
            );
            gazeX += (targetX - gazeX) * 0.09;
            gazeY += (targetY - gazeY) * 0.09;
            scrollTilt *= 0.94;
            for (const [eye, x, y, eyeHeight] of [
              [left.current, 108, 133, sample.expression.heightLeft],
              [right.current, 164, 119, sample.expression.heightRight],
            ] as const) {
              const height = Math.max(0.06, eyeHeight * sample.blink);
              eye?.setAttribute(
                "transform",
                `translate(${gazeX} ${gazeY}) translate(${x} ${y}) scale(1 ${height}) translate(${-x} ${-y})`,
              );
            }
            const pose = engine.applyAmbientMotion(sample.expression, now);
            const ambient = engine.ambientBodyOffset(pose, now);
            const tilt = pose.headZ + scrollTilt;
            const bob =
              latestMood.current === "excited"
                ? -Math.abs(Math.sin(now / 160)) * 9
                : Math.sin(now / 900) * 2.5;
            body.current?.setAttribute(
              "transform",
              `translate(${ambient.x} ${ambient.y + bob}) rotate(${tilt} 128 145)`,
            );
          }
          frame = requestAnimationFrame(tick);
        };
        wake = () => {
          if (!disposed && !frame) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      })
      .catch((error: unknown) => {
        reset();
        console.error("QuickStart logo animation could not start", error);
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      preference.removeEventListener("change", wakeWhenVisible);
      document.removeEventListener("visibilitychange", wakeWhenVisible);
      reset();
    };
  }, [body, enabled, left, paused, right, svg]);
}
