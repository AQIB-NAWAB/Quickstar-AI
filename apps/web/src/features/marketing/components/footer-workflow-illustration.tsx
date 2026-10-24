"use client";

import React, { useEffect, useState } from "react";

interface FooterWorkflowIllustrationProps {
  isAnimating: boolean;
}

export function FooterWorkflowIllustration({ isAnimating }: FooterWorkflowIllustrationProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 8000; // 8s slow repeating sequence

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const p = (elapsed % duration) / duration;
      setProgress(p);
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating]);

  // Phase 1 (0.1 - 0.45): Packet from Documents to Agent
  let p1X = -20;
  let p1Y = -20;
  let p1Opacity = 0;
  if (progress >= 0.1 && progress <= 0.45) {
    const t = (progress - 0.1) / 0.35;
    // Cubic bezier interpolation along: M 85 76 C 120 76, 150 115, 203 77
    const p0 = { x: 85, y: 76 };
    const p1 = { x: 120, y: 76 };
    const p2 = { x: 150, y: 115 };
    const p3 = { x: 203, y: 77 };
    const cx = 3 * (p1.x - p0.x);
    const bx = 3 * (p2.x - p1.x) - cx;
    const ax = p3.x - p0.x - cx - bx;
    const cy = 3 * (p1.y - p0.y);
    const by = 3 * (p2.y - p1.y) - cy;
    const ay = p3.y - p0.y - cy - by;
    p1X = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
    p1Y = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;
    p1Opacity = 1;
  }

  // Phase 2 (0.55 - 0.9): Packet from Agent to Conversation Bubble
  let p2X = -20;
  let p2Y = -20;
  let p2Opacity = 0;
  if (progress >= 0.55 && progress <= 0.9) {
    const t = (progress - 0.55) / 0.35;
    // Cubic bezier interpolation along: M 269 77 C 295 77, 325 110, 363 77
    const p0 = { x: 269, y: 77 };
    const p1 = { x: 295, y: 77 };
    const p2 = { x: 325, y: 110 };
    const p3 = { x: 363, y: 77 };
    const cx = 3 * (p1.x - p0.x);
    const bx = 3 * (p2.x - p1.x) - cx;
    const ax = p3.x - p0.x - cx - bx;
    const cy = 3 * (p1.y - p0.y);
    const by = 3 * (p2.y - p1.y) - cy;
    const ay = p3.y - p0.y - cy - by;
    p2X = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
    p2Y = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;
    p2Opacity = 1;
  }

  // Localized faint dot grid points (18-22px spacing)
  const gridDots: { x: number; y: number }[] = [];
  for (let x = 20; x <= 460; x += 22) {
    for (let y = 15; y <= 145; y += 22) {
      gridDots.push({ x, y });
    }
  }

  return (
    <svg
      viewBox="0 0 480 160"
      className="w-full h-auto overflow-visible select-none max-w-[440px]"
      aria-hidden="true"
    >
      {/* Faint Localized Dot Grid */}
      <g opacity="0.32">
        {gridDots.map((d, i) => (
          <circle key={`fg-d-${i}`} cx={d.x} cy={d.y} r="0.9" fill="#a8a8a8" />
        ))}
      </g>

      {/* Sparse Plus Marks */}
      <g stroke="#999999" strokeWidth="0.9" opacity="0.45">
        <line x1="135" y1="132" x2="141" y2="132" />
        <line x1="138" y1="129" x2="138" y2="135" />
        <line x1="272" y1="92" x2="278" y2="92" />
        <line x1="275" y1="89" x2="275" y2="95" />
      </g>

      {/* ========================================================================= */}
      {/* CURVED ORANGE DASHED CONNECTORS (Drawn Behind Nodes) */}
      {/* ========================================================================= */}
      <g fill="none">
        {/* Document to Agent */}
        <path
          d="M 85 76 C 120 76, 150 115, 203 77"
          stroke="#FF571A"
          strokeWidth="1.8"
          strokeDasharray="3.5 3.5"
          strokeLinecap="round"
        />

        {/* Agent to Conversation Bubble */}
        <path
          d="M 269 77 C 295 77, 325 110, 363 77"
          stroke="#FF571A"
          strokeWidth="1.8"
          strokeDasharray="3.5 3.5"
          strokeLinecap="round"
        />
      </g>

      {/* Animated Traveling Packets */}
      {p1Opacity > 0 && <circle cx={p1X} cy={p1Y} r="3" fill="#FF571A" />}
      {p2Opacity > 0 && <circle cx={p2X} cy={p2Y} r="3" fill="#FF571A" />}

      {/* ========================================================================= */}
      {/* 1. DOCUMENT STACK (Left) */}
      {/* ========================================================================= */}
      {/* Back Document */}
      <g transform="translate(56, 28)">
        <path
          d="M 0 0 L 36 0 L 46 10 L 46 64 L 0 64 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 36 0 L 36 10 L 46 10 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <line x1="8" y1="20" x2="36" y2="20" stroke="#FF571A" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="8" y1="28" x2="32" y2="28" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="36" x2="38" y2="36" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* Front Document */}
      <g transform="translate(32, 54)">
        <path
          d="M 0 0 L 36 0 L 46 10 L 46 64 L 0 64 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 36 0 L 36 10 L 46 10 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <line x1="8" y1="20" x2="38" y2="20" stroke="#FF571A" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="8" y1="28" x2="32" y2="28" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="36" x2="34" y2="36" stroke="#FF571A" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="8" y1="44" x2="28" y2="44" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* ========================================================================= */}
      {/* 2. CENTRAL AGENT NODE */}
      {/* ========================================================================= */}
      <g transform="translate(205, 45)">
        {/* Solid Orange Square */}
        <rect
          x="0"
          y="0"
          width="64"
          height="64"
          rx="9"
          fill="#FF571A"
        />
        {/* White Brackets [ ] */}
        <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 22 17 L 16 17 L 16 47 L 22 47" />
          <path d="M 42 17 L 48 17 L 48 47 L 42 47" />
        </g>
      </g>

      {/* ========================================================================= */}
      {/* 3. CONVERSATION BUBBLE (Right) */}
      {/* ========================================================================= */}
      <g transform="translate(365, 47)">
        {/* White Chat Bubble with Tail */}
        <path
          d="M 4 0 L 86 0 A 4 4 0 0 1 90 4 L 90 54 A 4 4 0 0 1 86 58 L 18 58 L 8 67 L 11 58 L 4 58 A 4 4 0 0 1 0 54 L 0 4 A 4 4 0 0 1 4 0 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Three Horizontal Gray Message Strokes */}
        <line x1="16" y1="18" x2="74" y2="18" stroke="#8a8a8a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="16" y1="28" x2="64" y2="28" stroke="#8a8a8a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="16" y1="38" x2="48" y2="38" stroke="#8a8a8a" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
