"use client";

import React, { useEffect, useState } from "react";

interface CtaWorkflowIllustrationProps {
  isAnimating: boolean;
}

export function CtaWorkflowIllustration({ isAnimating }: CtaWorkflowIllustrationProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 7500; // 7.5s slow repeating sequence

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

  // Stage 1 (0.05 - 0.35): Packets from Knowledge & API into Central Agent
  let p1LeftX = -20;
  let p1LeftY = -20;
  let p1RightX = -20;
  let p1RightY = -20;
  let p1Opacity = 0;
  if (progress >= 0.05 && progress <= 0.35) {
    const t = (progress - 0.05) / 0.3;
    // Knowledge -> Agent curve
    p1LeftX = 154 + t * (272 - 154);
    p1LeftY = 125 + Math.sin(t * (Math.PI / 2)) * (226 - 125);
    // API -> Agent curve
    p1RightX = 404 - t * (404 - 308);
    p1RightY = 125 + Math.sin(t * (Math.PI / 2)) * (226 - 125);
    p1Opacity = 1;
  }

  // Stage 2 (0.40 - 0.65): Packet from Agent to Published version
  let p2Y = -20;
  let p2Opacity = 0;
  if (progress >= 0.4 && progress <= 0.65) {
    const t = (progress - 0.4) / 0.25;
    p2Y = 328 + t * (370 - 328);
    p2Opacity = 1;
  }

  // Stage 3 (0.70 - 0.95): Packet from Published version to Conversation bubble
  let p3Y = -20;
  let p3Opacity = 0;
  if (progress >= 0.7 && progress <= 0.95) {
    const t = (progress - 0.7) / 0.25;
    p3Y = 488 + t * (530 - 488);
    p3Opacity = 1;
  }

  // Deterministic plus marks
  const pluses = [
    { x: 300, y: 88 },
    { x: 75, y: 248 },
    { x: 195, y: 308 },
    { x: 165, y: 388 },
    { x: 395, y: 308 },
    { x: 490, y: 300 },
    { x: 420, y: 418 },
    { x: 520, y: 480 },
  ];

  // Hollow orange square packet markers
  const hollowMarkers = [
    { x: 278, y: 135 },
    { x: 130, y: 304 },
    { x: 95, y: 476 },
    { x: 475, y: 265 },
    { x: 502, y: 380 },
  ];

  return (
    <svg
      viewBox="0 0 580 630"
      className="w-full h-auto overflow-visible select-none max-w-full"
      aria-label="Workflow illustration: Company policy and API connect to an agent, publishing a version to power a first conversation"
    >
      {/* Background Sparse Dotted Framing Arc */}
      <path
        d="M 60 300 C 60 140, 200 40, 290 40 C 380 40, 520 140, 520 300 C 520 460, 420 560, 290 560 C 160 560, 60 460, 60 300"
        fill="none"
        stroke="#8c8c8c"
        strokeWidth="1.1"
        strokeDasharray="2.5 5"
        opacity="0.25"
        aria-hidden="true"
      />

      {/* Background Pluses */}
      <g stroke="#999999" strokeWidth="0.9" opacity="0.45" aria-hidden="true">
        {pluses.map((p, i) => (
          <g key={`cta-p-${i}`}>
            <line x1={p.x - 3} y1={p.y} x2={p.x + 3} y2={p.y} />
            <line x1={p.x} y1={p.y - 3} x2={p.x} y2={p.y + 3} />
          </g>
        ))}
      </g>

      {/* Hollow Orange Accent Markers */}
      <g stroke="#FF571A" strokeWidth="1.3" fill="#ffffff" aria-hidden="true">
        {hollowMarkers.map((m, i) => (
          <rect key={`cta-hm-${i}`} x={m.x} y={m.y} width="5.5" height="5.5" rx="1" />
        ))}
      </g>

      {/* Input Header Label: Knowledge + tools */}
      <text
        x="290"
        y="42"
        textAnchor="middle"
        fill="#737373"
        fontSize="12.5"
        fontFamily="sans-serif"
        fontWeight="500"
      >
        Knowledge + tools
      </text>

      {/* ========================================================================= */}
      {/* 1. TOP-LEFT: KNOWLEDGE DOCUMENTS (Company policy) */}
      {/* ========================================================================= */}
      <g id="knowledge-group" transform="translate(85, 60)">
        {/* Back Sheet 3 */}
        <path
          d="M 14 -10 L 62 -10 L 74 2 L 74 88 L 14 88 Z"
          fill="#ffffff"
          stroke="#c8c8c8"
          strokeWidth="1.1"
        />
        {/* Middle Sheet 2 */}
        <path
          d="M 7 -5 L 55 -5 L 67 7 L 67 93 L 7 93 Z"
          fill="#ffffff"
          stroke="#a0a0a0"
          strokeWidth="1.1"
        />

        {/* Front Sheet 1 (Dog-Eared) */}
        <path
          d="M 0 0 L 48 0 L 60 12 L 60 98 L 0 98 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 48 0 L 48 12 L 60 12 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Label on Document */}
        <text
          x="30"
          y="26"
          textAnchor="middle"
          fill="#262626"
          fontSize="9.5"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          Company policy
        </text>

        {/* Document Content Strokes */}
        <line x1="8" y1="38" x2="52" y2="38" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="48" x2="44" y2="48" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        {/* Signature Orange Highlight Stroke */}
        <line x1="8" y1="60" x2="50" y2="60" stroke="#FF571A" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="8" y1="72" x2="48" y2="72" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="82" x2="34" y2="82" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* ========================================================================= */}
      {/* 2. TOP-RIGHT: API DOCUMENTS */}
      {/* ========================================================================= */}
      <g id="api-group" transform="translate(395, 62)">
        {/* Back Sheet */}
        <path
          d="M 10 -6 L 58 -6 L 68 4 L 68 88 L 10 88 Z"
          fill="#ffffff"
          stroke="#b8b8b8"
          strokeWidth="1.1"
        />

        {/* Front Sheet (Dog-Eared) */}
        <path
          d="M 0 0 L 48 0 L 60 12 L 60 94 L 0 94 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 48 0 L 48 12 L 60 12 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Orange Curly Braces: { } */}
        <text
          x="30"
          y="32"
          textAnchor="middle"
          fill="#FF571A"
          fontSize="18"
          fontFamily="monospace"
          fontWeight="bold"
        >
          &#123; &#125;
        </text>

        {/* Label: API */}
        <text
          x="30"
          y="48"
          textAnchor="middle"
          fill="#262626"
          fontSize="10"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          API
        </text>

        {/* Code Content Strokes */}
        <line x1="10" y1="62" x2="50" y2="62" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="72" x2="42" y2="72" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="82" x2="46" y2="82" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* ========================================================================= */}
      {/* 3. INPUT CONNECTORS: CONVERGING INTO CENTRAL AGENT */}
      {/* ========================================================================= */}
      <g fill="none">
        {/* Left Curve: Knowledge -> Agent */}
        <path
          d="M 154 125 C 195 125, 255 160, 272 225"
          stroke="#FF571A"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="274,228 268,222 276,220" fill="#FF571A" />

        {/* Right Curve: API -> Agent */}
        <path
          d="M 404 125 C 365 125, 325 160, 308 225"
          stroke="#FF571A"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="306,228 304,220 312,222" fill="#FF571A" />
      </g>

      {/* Animated Traveling Packets for Inputs */}
      {p1Opacity > 0 && (
        <>
          <circle cx={p1LeftX} cy={p1LeftY} r="3.5" fill="#FF571A" />
          <circle cx={p1RightX} cy={p1RightY} r="3.5" fill="#FF571A" />
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. CENTRAL AGENT NODE */}
      {/* ========================================================================= */}
      <g id="agent-node-group" transform="translate(250, 230)">
        {/* Solid Orange Square */}
        <rect
          x="0"
          y="0"
          width="80"
          height="70"
          rx="8"
          fill="#FF571A"
        />

        {/* White Bracket Symbol [ ] */}
        <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Left bracket */}
          <path d="M 28 20 L 20 20 L 20 50 L 28 50" />
          {/* Right bracket */}
          <path d="M 52 20 L 60 20 L 60 50 L 52 50" />
        </g>

        {/* Label Beneath */}
        <text
          x="40"
          y="92"
          textAnchor="middle"
          fill="#262626"
          fontSize="14.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Your agent
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 5. CONNECTOR: AGENT -> PUBLISHED VERSION */}
      {/* ========================================================================= */}
      <g fill="none">
        <line
          x1="290"
          y1="328"
          x2="290"
          y2="370"
          stroke="#FF571A"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="290,372 286,364 294,364" fill="#FF571A" />
      </g>
      {/* Animated Packet on Segment 2 */}
      {p2Opacity > 0 && <circle cx="290" cy={p2Y} r="3.5" fill="#FF571A" />}

      {/* ========================================================================= */}
      {/* 6. PUBLISHED VERSION DOCUMENT (with pale peach offset layer) */}
      {/* ========================================================================= */}
      <g id="published-version-group" transform="translate(253, 372)">
        {/* Pale Peach Offset Shadow Layer */}
        <rect
          x="4"
          y="4"
          width="74"
          height="92"
          rx="3"
          fill="#FDEEE9"
        />

        {/* Front Sheet (Dog-Eared) */}
        <path
          d="M 0 0 L 58 0 L 74 16 L 74 92 L 0 92 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 58 0 L 58 16 L 74 16 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Lock Symbol */}
        <g transform="translate(14, 16)" stroke="#262626" strokeWidth="1.2" fill="none">
          {/* Shackle */}
          <path d="M 3 6 L 3 3 C 3 0, 9 0, 9 3 L 9 6" strokeLinecap="round" />
          {/* Body */}
          <rect x="0" y="6" width="12" height="9" rx="1.5" fill="#ffffff" />
          {/* Keyhole */}
          <circle cx="6" cy="10" r="1.1" fill="#262626" />
        </g>

        {/* Content Strokes */}
        <line x1="14" y1="44" x2="60" y2="44" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="14" y1="54" x2="48" y2="54" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />

        {/* Version Text: v1 · Published */}
        <text
          x="37"
          y="76"
          textAnchor="middle"
          fill="#262626"
          fontSize="9.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          v1 &middot; Published
        </text>

        {/* External Label Beneath */}
        <text
          x="37"
          y="114"
          textAnchor="middle"
          fill="#262626"
          fontSize="13.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Published version
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 7. CONNECTOR: PUBLISHED VERSION -> CONVERSATION */}
      {/* ========================================================================= */}
      <g fill="none">
        <line
          x1="290"
          y1="492"
          x2="290"
          y2="530"
          stroke="#FF571A"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="290,532 286,524 294,524" fill="#FF571A" />
      </g>
      {/* Animated Packet on Segment 3 */}
      {p3Opacity > 0 && <circle cx="290" cy={p3Y} r="3.5" fill="#FF571A" />}

      {/* ========================================================================= */}
      {/* 8. FIRST CONVERSATION BUBBLE (with pale peach offset layer & accents) */}
      {/* ========================================================================= */}
      <g id="first-conversation-group" transform="translate(180, 532)">
        {/* Pale Peach Offset Shadow Layer */}
        <rect
          x="4"
          y="4"
          width="220"
          height="54"
          rx="6"
          fill="#FDEEE9"
        />

        {/* Main Conversation Bubble */}
        <path
          d="M 6 0 L 214 0 A 6 6 0 0 1 220 6 L 220 48 A 6 6 0 0 1 214 54 L 32 54 L 18 64 L 22 54 L 6 54 A 6 6 0 0 1 0 48 L 0 6 A 6 6 0 0 1 6 0 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Small Chat Icon [ ... ] */}
        <g transform="translate(24, 16)">
          <rect x="0" y="0" width="24" height="18" rx="3" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
          <circle cx="6" cy="9" r="1.1" fill="#262626" />
          <circle cx="12" cy="9" r="1.1" fill="#262626" />
          <circle cx="18" cy="9" r="1.1" fill="#262626" />
        </g>

        {/* Exact Text: How can I help? */}
        <text
          x="62"
          y="32"
          fill="#262626"
          fontSize="15.5"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          How can I help?
        </text>

        {/* Orange Radiating Accent Marks */}
        {/* Left Accents */}
        <line x1="-12" y1="20" x2="-22" y2="16" stroke="#FF571A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-12" y1="36" x2="-22" y2="40" stroke="#FF571A" strokeWidth="1.5" strokeLinecap="round" />
        {/* Right Accents */}
        <line x1="232" y1="20" x2="242" y2="16" stroke="#FF571A" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="232" y1="36" x2="242" y2="40" stroke="#FF571A" strokeWidth="1.5" strokeLinecap="round" />

        {/* Caption Beneath */}
        <text
          x="110"
          y="76"
          textAnchor="middle"
          fill="#262626"
          fontSize="13.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          First conversation
        </text>
      </g>
    </svg>
  );
}
