"use client";

import React, { useEffect, useRef, useState } from "react";
import type { PlaybackPhase } from "../../lib/use-handoff-playback";

interface HandoffConnectorProps {
  sceneRef: React.RefObject<HTMLDivElement>;
  originRef: React.RefObject<HTMLSpanElement>;
  targetRef: React.RefObject<HTMLDivElement>;
  phase: PlaybackPhase;
  prefersReducedMotion: boolean;
}

export function HandoffConnector({ sceneRef, originRef, targetRef, phase, prefersReducedMotion }: HandoffConnectorProps) {
  const [geometry, setGeometry] = useState("");
  const trace = useRef<SVGPathElement>(null);
  const arrow = useRef<SVGPathElement>(null);
  const progress = useRef(0);

  useEffect(() => {
    const scene = sceneRef.current, origin = originRef.current, target = targetRef.current;
    if (!scene || !origin || !target) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const s = scene.getBoundingClientRect(), a = origin.getBoundingClientRect(), b = target.getBoundingClientRect();
      const sx = s.width / scene.offsetWidth || 1, sy = s.height / scene.offsetHeight || 1;
      const x = (a.left + a.width / 2 - s.left) / sx;
      const y = (a.top + a.height / 2 - s.top) / sy;
      const ex = (b.left - s.left) / sx - 6;
      const ey = (b.top + b.height / 2 - s.top) / sy;
      const dx = ex - x;
      setGeometry(`M${x} ${y} C${x + dx * .44} ${y},${ex - dx * .44} ${ey},${ex} ${ey}`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scene); observer.observe(origin); observer.observe(target);
    document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { disposed = true; observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [sceneRef, originRef, targetRef]);

  useEffect(() => {
    const wire = trace.current, tip = arrow.current;
    if (!wire || !tip || !geometry) return;
    let frame = 0, started = 0;
    const length = wire.getTotalLength();
    const draw = (value: number) => {
      progress.current = value;
      wire.style.strokeDasharray = String(length);
      wire.style.strokeDashoffset = String(length * (1 - value));
      const point = wire.getPointAtLength(value * length);
      const before = wire.getPointAtLength(Math.max(0, value * length - 1));
      const after = wire.getPointAtLength(Math.min(length, value * length + 1));
      const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
      tip.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
      tip.style.opacity = value > 0 ? "1" : "0";
    };
    if (phase === "moving-signal" && !prefersReducedMotion) {
      const tick = (time: number) => {
        if (!started) started = time - progress.current * 1600;
        const value = Math.min(1, (time - started) / 1600);
        draw(value);
        if (value < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    } else draw(["typing-reply", "complete"].includes(phase) ? 1 : 0);
    return () => cancelAnimationFrame(frame);
  }, [geometry, phase, prefersReducedMotion]);

  return <svg className={`marketing-handoff-connector-svg ${phase === "fading-out" ? "marketing-handoff-fade-out" : "marketing-handoff-fade-in"}`} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
    <path d={geometry} fill="none" stroke="#d2d2d2" strokeWidth="1.6" />
    <path ref={trace} d={geometry} fill="none" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" className="handoff-orange-trace" />
    <path ref={arrow} d="M-7 -5 L0 0 L-7 5" fill="none" stroke="#fa5d19" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }} />
  </svg>;
}
