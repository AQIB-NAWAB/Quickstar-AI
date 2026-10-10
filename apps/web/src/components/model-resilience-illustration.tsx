"use client";

import React, { useEffect, useState } from "react";

interface ModelResilienceIllustrationProps {
  isAnimating: boolean;
}

export function ModelResilienceIllustration({ isAnimating }: ModelResilienceIllustrationProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 4500; // 4.5s cycle

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

  // Coordinates for animated packets:
  // Phase 1 (0.05 - 0.25): Request doc (x=115, y=210) -> Gateway (x=248, y=210)
  let p1X = -20;
  let p1Opacity = 0;
  if (progress >= 0.05 && progress <= 0.25) {
    const t = (progress - 0.05) / 0.2;
    p1X = 115 + t * (248 - 115);
    p1Opacity = 1;
  }

  // Phase 2 (0.28 - 0.48): Gateway (x=340, y=200) -> Primary (x=485, y=145) [Retry / Failure]
  let p2X = -20;
  let p2Y = -20;
  let p2Opacity = 0;
  if (progress >= 0.28 && progress <= 0.48) {
    const t = (progress - 0.28) / 0.2;
    p2X = 340 + t * (485 - 340);
    p2Y = 200 + t * (145 - 200);
    p2Opacity = 1;
  }

  // Phase 3 (0.50 - 0.72): Gateway (x=340, y=225) -> Fallback (x=495, y=325)
  let p3X = -20;
  let p3Y = -20;
  let p3Opacity = 0;
  if (progress >= 0.5 && progress <= 0.72) {
    const t = (progress - 0.5) / 0.22;
    if (t < 0.4) {
      // vertical curve down
      const sub = t / 0.4;
      p3X = 340 + sub * 20;
      p3Y = 225 + sub * 75;
    } else {
      // horizontal line to fallback
      const sub = (t - 0.4) / 0.6;
      p3X = 360 + sub * (495 - 360);
      p3Y = 300 + sub * 25;
    }
    p3Opacity = 1;
  }

  // Phase 4 (0.75 - 0.96): Return path (Fallback x=495 -> Response bubble x=140)
  let p4X = -20;
  let p4Opacity = 0;
  if (progress >= 0.75 && progress <= 0.96) {
    const t = (progress - 0.75) / 0.21;
    p4X = 495 - t * (495 - 140);
    p4Opacity = 1;
  }

  // Deterministic background particles
  const dots = [
    { x: 120, y: 70 }, { x: 140, y: 85 }, { x: 165, y: 75 },
    { x: 130, y: 110 }, { x: 155, y: 125 },
    { x: 380, y: 65 }, { x: 405, y: 80 }, { x: 425, y: 60 },
    { x: 180, y: 280 }, { x: 205, y: 295 }, { x: 230, y: 275 },
    { x: 190, y: 315 }, { x: 220, y: 330 },
    { x: 350, y: 385 }, { x: 375, y: 400 }, { x: 405, y: 390 },
    { x: 360, y: 420 }, { x: 390, y: 435 },
    { x: 670, y: 280 }, { x: 690, y: 295 }, { x: 715, y: 285 },
    { x: 680, y: 320 }, { x: 705, y: 335 }
  ];

  const pluses = [
    { x: 80, y: 80 },
    { x: 200, y: 80 },
    { x: 420, y: 65 },
    { x: 95, y: 300 },
    { x: 395, y: 260 },
    { x: 295, y: 430 },
    { x: 730, y: 320 }
  ];

  return (
    <svg
      viewBox="0 0 780 440"
      className="w-full h-auto overflow-visible select-none max-w-full"
      aria-label="Illustrative failure path: Completion request routes through model gateway with timeout boundary, primary provider retries and fails, and configured fallback resolves the response"
    >
      {/* Background Technical Particles */}
      <g opacity="0.45" aria-hidden="true">
        {dots.map((d, i) => (
          <circle key={`mr-d-${i}`} cx={d.x} cy={d.y} r="1.2" fill="#a8a8a8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`mr-p-${i}`} stroke="#999999" strokeWidth="0.9">
            <line x1={p.x - 3} y1={p.y} x2={p.x + 3} y2={p.y} />
            <line x1={p.x} y1={p.y - 3} x2={p.x} y2={p.y + 3} />
          </g>
        ))}
      </g>

      {/* ========================================================================= */}
      {/* 1. COMPLETION REQUEST DOCUMENT STACK (Left) */}
      {/* ========================================================================= */}
      <g id="completion-request-group" transform="translate(45, 140)">
        {/* Back Sheet 3 */}
        <path
          d="M 12 -12 L 68 -12 L 80 0 L 80 84 L 12 84 Z"
          fill="#ffffff"
          stroke="#c8c8c8"
          strokeWidth="1.1"
        />
        {/* Middle Sheet 2 */}
        <path
          d="M 6 -6 L 62 -6 L 74 6 L 74 90 L 6 90 Z"
          fill="#ffffff"
          stroke="#a0a0a0"
          strokeWidth="1.1"
        />

        {/* Front Sheet 1 (Dog-Eared) */}
        <path
          d="M 0 0 L 56 0 L 70 14 L 70 96 L 0 96 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 56 0 L 56 14 L 70 14 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Content Strokes with One Orange Highlight Line */}
        <line x1="12" y1="24" x2="56" y2="24" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="36" x2="62" y2="36" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="48" x2="52" y2="48" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="12" y1="60" x2="58" y2="60" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="72" x2="44" y2="72" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />

        {/* Caption */}
        <text
          x="35"
          y="120"
          textAnchor="middle"
          fill="#262626"
          fontSize="13.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Completion request
        </text>
      </g>

      {/* ========================================================================= */}
      {/* CONNECTOR: REQUEST -> MODEL GATEWAY */}
      {/* ========================================================================= */}
      <g fill="none">
        <line
          x1="125"
          y1="210"
          x2="248"
          y2="210"
          stroke="#fa5d19"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="250,210 244,206.5 244,213.5" fill="#fa5d19" />
      </g>
      {/* Animated Packet on Segment 1 */}
      {p1Opacity > 0 && <circle cx={p1X} cy="210" r="3.5" fill="#fa5d19" />}

      {/* ========================================================================= */}
      {/* 2. MODEL GATEWAY NODE (Center) */}
      {/* ========================================================================= */}
      <g id="model-gateway-group" transform="translate(248, 172)">
        {/* Gateway Rounded Square */}
        <rect
          x="0"
          y="0"
          width="88"
          height="76"
          rx="6"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.4"
        />

        {/* Centered Large Brackets [ ] */}
        <g stroke="#262626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Left bracket */}
          <path d="M 28 22 L 20 22 L 20 54 L 28 54" />
          {/* Right bracket */}
          <path d="M 60 22 L 68 22 L 68 54 L 60 54" />
        </g>

        {/* Caption */}
        <text
          x="44"
          y="102"
          textAnchor="middle"
          fill="#262626"
          fontSize="14"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          Model gateway
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 3. TIMEOUT BOUNDARY CLOCK (Above Gateway) */}
      {/* ========================================================================= */}
      <g id="timeout-boundary-group" transform="translate(292, 54)">
        {/* Connector from Gateway to Clock */}
        <line
          x1="0"
          y1="118"
          x2="0"
          y2="54"
          stroke="#8c8c8c"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />
        <polygon points="0,52 -3,58 3,58" fill="#8c8c8c" />

        {/* Clock Ring */}
        <circle cx="0" cy="24" r="21" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />

        {/* Orange Perimeter Arc (Deadline indicator) */}
        <path
          d="M 0 3 A 21 21 0 0 1 18 13"
          fill="none"
          stroke="#fa5d19"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Clock Hands */}
        <g stroke="#262626" strokeWidth="1.4" strokeLinecap="round">
          {/* Minute hand at 12 */}
          <line x1="0" y1="24" x2="0" y2="10" />
          {/* Hour hand at 9 */}
          <line x1="0" y1="24" x2="-10" y2="24" />
        </g>

        {/* Captions */}
        <text
          x="28"
          y="20"
          fill="#262626"
          fontSize="12.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Timeout
        </text>
        <text
          x="28"
          y="35"
          fill="#737373"
          fontSize="12"
          fontFamily="sans-serif"
        >
          boundary
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 4. PRIMARY PROVIDER (Upper Right - Fails & Retries) */}
      {/* ========================================================================= */}
      <g id="primary-provider-group">
        {/* Connector from Gateway to Primary Provider */}
        <g fill="none">
          <line
            x1="336"
            y1="198"
            x2="496"
            y2="152"
            stroke="#8c8c8c"
            strokeWidth="1.2"
            strokeDasharray="2.5 3"
          />
        </g>

        {/* Retry Circular Arrow & Label */}
        <g transform="translate(398, 126)">
          <text
            x="12"
            y="2"
            textAnchor="middle"
            fill="#737373"
            fontSize="11.5"
            fontFamily="sans-serif"
          >
            Limited retry
          </text>
          {/* Circular Retry Arrow */}
          <path
            d="M 6 12 A 8 8 0 1 1 18 12"
            fill="none"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <polygon points="7,10 6,14 10,13" fill="#262626" />
        </g>

        {/* Failure Marker (×) Near Endpoint */}
        <g transform="translate(480, 156)" stroke="#fa5d19" strokeWidth="1.6" strokeLinecap="round">
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
          <line x1="-3.5" y1="3.5" x2="3.5" y2="-3.5" />
        </g>

        {/* Animated Packet on Retry Path */}
        {p2Opacity > 0 && <circle cx={p2X} cy={p2Y} r="3.5" fill="#fa5d19" />}

        {/* Primary Provider Response Sheets */}
        <g transform="translate(506, 88)">
          {/* Back Sheet */}
          <rect
            x="0"
            y="0"
            width="56"
            height="86"
            rx="3"
            fill="#ffffff"
            stroke="#b8b8b8"
            strokeWidth="1.1"
          />
          {/* Front Sheet */}
          <g transform="translate(22, 8)">
            <rect
              x="0"
              y="0"
              width="58"
              height="84"
              rx="3"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.3"
            />
            {/* Gray Content Lines */}
            <line x1="8" y1="14" x2="48" y2="14" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="24" x2="42" y2="24" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="34" x2="46" y2="34" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="44" x2="38" y2="44" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="54" x2="44" y2="54" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="64" x2="34" y2="64" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* Caption */}
          <text
            x="48"
            y="114"
            textAnchor="middle"
            fill="#262626"
            fontSize="14"
            fontFamily="sans-serif"
            fontWeight="500"
          >
            Primary provider
          </text>

          {/* Unavailable Annotation Beside Sheets */}
          <g transform="translate(88, 38)">
            <line x1="0" y1="0" x2="10" y2="0" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
            <text x="16" y="4" fill="#fa5d19" fontSize="12" fontFamily="sans-serif" fontWeight="500">
              Unavailable
            </text>
          </g>
        </g>
      </g>

      {/* ========================================================================= */}
      {/* 5. CONFIGURED FALLBACK (Lower Right) */}
      {/* ========================================================================= */}
      <g id="configured-fallback-group">
        {/* Connector from Gateway to Fallback */}
        <g fill="none">
          <path
            d="M 336 226 C 360 226, 360 295, 395 305 L 500 326"
            stroke="#fa5d19"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <polygon points="502,326 496,322.5 496,329.5" fill="#fa5d19" />
        </g>

        {/* Animated Packet to Fallback */}
        {p3Opacity > 0 && <circle cx={p3X} cy={p3Y} r="3.5" fill="#fa5d19" />}

        {/* Fallback Sheets with Orange Highlight Strokes */}
        <g transform="translate(506, 268)">
          {/* Back Sheet */}
          <rect
            x="0"
            y="0"
            width="56"
            height="86"
            rx="3"
            fill="#ffffff"
            stroke="#b8b8b8"
            strokeWidth="1.1"
          />
          {/* Front Sheet */}
          <g transform="translate(24, 8)">
            <rect
              x="0"
              y="0"
              width="58"
              height="84"
              rx="3"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.3"
            />
            {/* Multiple Orange Highlighted Response Strokes */}
            <line x1="8" y1="14" x2="48" y2="14" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="24" x2="38" y2="24" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="8" y1="34" x2="44" y2="34" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="44" x2="40" y2="44" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="8" y1="54" x2="48" y2="54" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="8" y1="64" x2="32" y2="64" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* Caption */}
          <text
            x="48"
            y="114"
            textAnchor="middle"
            fill="#262626"
            fontSize="14"
            fontFamily="sans-serif"
            fontWeight="500"
          >
            Configured fallback
          </text>
        </g>
      </g>

      {/* ========================================================================= */}
      {/* 6. RESPONSE BUBBLE & MEDIATED RETURN PATH (Lower Left) */}
      {/* ========================================================================= */}
      <g id="response-group">
        {/* Mediated Return Path from Fallback back to Gateway then into Response Bubble */}
        <g fill="none">
          <path
            d="M 506 352 L 140 352"
            stroke="#fa5d19"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <polygon points="138,352 144,348.5 144,355.5" fill="#fa5d19" />
        </g>

        {/* Animated Packet on Return Path */}
        {p4Opacity > 0 && <circle cx={p4X} cy="352" r="3.5" fill="#fa5d19" />}

        {/* Response Conversation Bubble */}
        <g transform="translate(38, 320)">
          {/* Chat Bubble with Tail */}
          <path
            d="M 4 0 L 80 0 A 4 4 0 0 1 84 4 L 84 42 A 4 4 0 0 1 80 46 L 16 46 L 6 54 L 8 46 L 4 46 A 4 4 0 0 1 0 42 L 0 4 A 4 4 0 0 1 4 0 Z"
            fill="#ffffff"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* Content Strokes */}
          <line x1="12" y1="16" x2="72" y2="16" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="12" y1="26" x2="60" y2="26" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="12" y1="36" x2="48" y2="36" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />

          {/* Caption */}
          <text
            x="42"
            y="74"
            textAnchor="middle"
            fill="#262626"
            fontSize="14"
            fontFamily="sans-serif"
            fontWeight="500"
          >
            Response
          </text>
        </g>
      </g>
    </svg>
  );
}
