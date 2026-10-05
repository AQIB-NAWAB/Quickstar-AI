"use client";

import React, { useEffect, useState } from "react";

interface ArchitectureFlowIllustrationProps {
  isAnimating: boolean;
}

export function ArchitectureFlowIllustration({ isAnimating }: ArchitectureFlowIllustrationProps) {
  const [packetProgress, setPacketProgress] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;

    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 4000; // 4s cycle

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      setPacketProgress(progress);
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating]);

  // Coordinates for vertical spine packet:
  // Segment 1: y = 110 to 190 (App -> Gateway) - progress 0.0 to 0.3
  // Segment 2: y = 258 to 338 (Gateway -> Runtime) - progress 0.35 to 0.65
  // Segment 3: y = 402 to 512 (Runtime -> Conversation) - progress 0.7 to 1.0
  let packetY = -20;
  let packetOpacity = 0;
  if (packetProgress >= 0.05 && packetProgress <= 0.3) {
    const t = (packetProgress - 0.05) / 0.25;
    packetY = 110 + t * (190 - 110);
    packetOpacity = 1;
  } else if (packetProgress >= 0.38 && packetProgress <= 0.63) {
    const t = (packetProgress - 0.38) / 0.25;
    packetY = 258 + t * (338 - 258);
    packetOpacity = 1;
  } else if (packetProgress >= 0.72 && packetProgress <= 0.97) {
    const t = (packetProgress - 0.72) / 0.25;
    packetY = 402 + t * (512 - 402);
    packetOpacity = 1;
  }

  // Deterministic background particle coordinates
  const dots = [
    // Top-left cluster
    { x: 140, y: 80 }, { x: 160, y: 95 }, { x: 175, y: 130 }, { x: 195, y: 115 },
    { x: 145, y: 160 }, { x: 210, y: 175 }, { x: 185, y: 200 },
    // Top-right cluster
    { x: 740, y: 65 }, { x: 770, y: 80 }, { x: 795, y: 100 }, { x: 830, y: 70 },
    { x: 755, y: 130 }, { x: 805, y: 145 }, { x: 840, y: 120 }, { x: 860, y: 160 },
    // Bottom-left cluster
    { x: 120, y: 560 }, { x: 140, y: 585 }, { x: 170, y: 570 }, { x: 190, y: 605 },
    { x: 135, y: 630 }, { x: 165, y: 645 }, { x: 215, y: 625 },
    // Bottom-right cluster
    { x: 780, y: 580 }, { x: 810, y: 565 }, { x: 835, y: 600 }, { x: 860, y: 585 },
    { x: 795, y: 630 }, { x: 825, y: 650 }, { x: 855, y: 635 }
  ];

  const pluses = [
    { x: 170, y: 165 },
    { x: 815, y: 110 },
    { x: 155, y: 615 },
    { x: 840, y: 620 }
  ];

  return (
    <svg
      viewBox="0 0 920 680"
      className="w-full h-auto overflow-visible select-none max-w-full"
      aria-label="Conceptual architecture flow illustration showing Your Application connecting via API Gateway to Agent Runtime with Knowledge, Model, Tool, and Conversation dependencies"
    >
      {/* Background Technical Particles */}
      <g opacity="0.45" aria-hidden="true">
        {dots.map((d, i) => (
          <circle key={`bg-dot-${i}`} cx={d.x} cy={d.y} r="1.2" fill="#a8a8a8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`bg-plus-${i}`} stroke="#999999" strokeWidth="0.9">
            <line x1={p.x - 3} y1={p.y} x2={p.x + 3} y2={p.y} />
            <line x1={p.x} y1={p.y - 3} x2={p.x} y2={p.y + 3} />
          </g>
        ))}
      </g>

      {/* ========================================================================= */}
      {/* MAIN VERTICAL SPINE CONNECTORS & ANNOTATIONS */}
      {/* ========================================================================= */}

      {/* Segment 1: Browser -> Gateway */}
      <g fill="none">
        <line
          x1="460"
          y1="110"
          x2="460"
          y2="190"
          stroke="#fa5d19"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="460,192 456,184 464,184" fill="#fa5d19" />
      </g>
      <text
        x="474"
        y="155"
        fill="#737373"
        fontSize="11.5"
        fontFamily="monospace"
        letterSpacing="0.04em"
      >
        01&nbsp;&nbsp;authenticate
      </text>

      {/* Segment 2: Gateway -> Runtime */}
      <g fill="none">
        <line
          x1="460"
          y1="258"
          x2="460"
          y2="338"
          stroke="#fa5d19"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="460,340 456,332 464,332" fill="#fa5d19" />
      </g>
      <text
        x="474"
        y="303"
        fill="#737373"
        fontSize="11.5"
        fontFamily="monospace"
        letterSpacing="0.04em"
      >
        02&nbsp;&nbsp;execute
      </text>

      {/* Segment 3: Runtime -> Conversation Service */}
      <g fill="none">
        <line
          x1="460"
          y1="402"
          x2="460"
          y2="512"
          stroke="#fa5d19"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polygon points="460,514 456,506 464,506" fill="#fa5d19" />
      </g>
      <text
        x="474"
        y="462"
        fill="#737373"
        fontSize="11.5"
        fontFamily="monospace"
        letterSpacing="0.04em"
      >
        03&nbsp;&nbsp;persist
      </text>

      {/* Animated Traveling Packet on Main Spine */}
      {packetOpacity > 0 && (
        <circle
          cx="460"
          cy={packetY}
          r="3.5"
          fill="#fa5d19"
          className="transition-opacity duration-150"
        />
      )}

      {/* ========================================================================= */}
      {/* 1. TOP CENTER: YOUR APPLICATION (Browser Window Drawing) */}
      {/* ========================================================================= */}
      <g id="app-drawing" transform="translate(375, 36)">
        {/* Browser Outer Shell */}
        <rect
          x="0"
          y="0"
          width="170"
          height="74"
          rx="5"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
        />
        {/* Browser Window Header Divider */}
        <line x1="0" y1="22" x2="170" y2="22" stroke="#262626" strokeWidth="1.2" />

        {/* 3 Neutral Gray Window Header Dots */}
        <circle cx="14" cy="11" r="2.6" fill="#b0b0b0" />
        <circle cx="23" cy="11" r="2.6" fill="#b0b0b0" />
        <circle cx="32" cy="11" r="2.6" fill="#b0b0b0" />

        {/* Inner Search / Input Field Box */}
        <rect
          x="18"
          y="34"
          width="134"
          height="26"
          rx="3"
          fill="#fafafa"
          stroke="#e0e0e0"
          strokeWidth="1"
        />
        {/* Input Text Stroke Line */}
        <line x1="28" y1="47" x2="88" y2="47" stroke="#8a8a8a" strokeWidth="1.4" strokeLinecap="round" />

        {/* Submit Arrow (▷) on Right of Input */}
        <polygon points="140,47 133,42 133,52" fill="none" stroke="#262626" strokeWidth="1.3" strokeLinejoin="round" />
      </g>
      {/* Label Beside Browser */}
      <text
        x="562"
        y="78"
        fill="#262626"
        fontSize="16"
        fontFamily="sans-serif"
        fontWeight="500"
      >
        Your application
      </text>

      {/* ========================================================================= */}
      {/* 2. API GATEWAY (Orange Portal Rectangle with Routing Branch) */}
      {/* ========================================================================= */}
      <g id="gateway-drawing" transform="translate(390, 192)">
        {/* Gateway Outer Portal */}
        <rect
          x="0"
          y="0"
          width="140"
          height="66"
          rx="4"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.5"
        />
        {/* Parallel Vertical Boundary Accent Lines Near Ends */}
        <line x1="8" y1="0" x2="8" y2="66" stroke="#fa5d19" strokeWidth="1" opacity="0.45" />
        <line x1="132" y1="0" x2="132" y2="66" stroke="#fa5d19" strokeWidth="1" opacity="0.45" />

        {/* Routing Branch Symbol: single input curving into two directional paths */}
        <g stroke="#262626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Main trunk */}
          <path d="M 42 33 L 56 33" />
          {/* Top branch curve & arrow */}
          <path d="M 56 33 C 66 33, 72 23, 84 23" />
          <polygon points="88,23 82,20 82,26" fill="#262626" stroke="none" />
          {/* Bottom branch curve & arrow */}
          <path d="M 56 33 C 66 33, 72 43, 84 43" />
          <polygon points="88,43 82,40 82,46" fill="#262626" stroke="none" />
        </g>
      </g>
      {/* Labels Beside Gateway */}
      <text
        x="548"
        y="222"
        fill="#262626"
        fontSize="16"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        API gateway
      </text>
      <text
        x="548"
        y="241"
        fill="#737373"
        fontSize="12.5"
        fontFamily="sans-serif"
      >
        JWT + workspace access
      </text>

      {/* ========================================================================= */}
      {/* 3. AGENT RUNTIME (Center Brackets [ ] with Central Diamond Accent) */}
      {/* ========================================================================= */}
      <g id="runtime-drawing" transform="translate(460, 370)">
        {/* Left Bracket */}
        <path
          d="M -45 -26 L -58 -26 L -58 26 L -45 26"
          fill="none"
          stroke="#fa5d19"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center Diamond Crosshair Accent */}
        <g stroke="#fa5d19" strokeWidth="1.2" fill="none">
          <line x1="-14" y1="0" x2="14" y2="0" strokeLinecap="round" />
          <line x1="0" y1="-14" x2="0" y2="14" strokeLinecap="round" />
          <polygon points="0,-6 6,0 0,6 -6,0" fill="#fa5d19" />
        </g>

        {/* Right Bracket */}
        <path
          d="M 45 -26 L 58 -26 L 58 26 L 45 26"
          fill="none"
          stroke="#fa5d19"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Label Beside Runtime */}
      <text
        x="540"
        y="376"
        fill="#262626"
        fontSize="16"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        Agent runtime
      </text>

      {/* ========================================================================= */}
      {/* 4. SIDE DEPENDENCY: PUBLISHED AGENT V3 (Left of Runtime) */}
      {/* ========================================================================= */}
      <g id="published-agent-group">
        {/* Curved Dotted Connector from Doc to Runtime Left Bracket */}
        <g fill="none">
          <path
            d="M 276 370 C 325 370, 360 370, 395 370"
            stroke="#8c8c8c"
            strokeWidth="1.2"
            strokeDasharray="2.5 3"
          />
          <polygon points="398,370 392,367 392,373" fill="#8c8c8c" />
        </g>

        {/* Published Agent Sheets */}
        <g transform="translate(202, 316)">
          {/* Back Sheet */}
          <path
            d="M 10 -8 L 68 -8 L 80 4 L 80 88 L 10 88 Z"
            fill="#ffffff"
            stroke="#b8b8b8"
            strokeWidth="1.1"
          />

          {/* Front Sheet (Dog-Eared) */}
          <path
            d="M 0 0 L 60 0 L 74 14 L 74 96 L 0 96 Z"
            fill="#ffffff"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M 60 0 L 60 14 L 74 14 Z"
            fill="#f0f0f0"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />

          {/* Custom Drawn Lock Icon in Top-Left */}
          <g transform="translate(12, 14)" stroke="#262626" strokeWidth="1.2" fill="none">
            {/* Shackle */}
            <path d="M 3 6 L 3 3 C 3 0, 9 0, 9 3 L 9 6" strokeLinecap="round" />
            {/* Body */}
            <rect x="0" y="6" width="12" height="9" rx="1.5" fill="#ffffff" />
            {/* Keyhole */}
            <circle cx="6" cy="10" r="1.1" fill="#262626" />
          </g>

          {/* Content Strokes with One Orange Highlight Line */}
          <line x1="12" y1="42" x2="62" y2="42" stroke="#fa5d19" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="12" y1="52" x2="54" y2="52" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="12" y1="62" x2="58" y2="62" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="12" y1="72" x2="46" y2="72" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* Label Beneath */}
        <text
          x="239"
          y="435"
          textAnchor="middle"
          fill="#262626"
          fontSize="14.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Published agent v3
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 5. SIDE DEPENDENCY: MODEL GATEWAY (Right of Runtime) */}
      {/* ========================================================================= */}
      <g id="model-gateway-group">
        {/* Curved Dotted Connector between Runtime and Model Gateway */}
        <g fill="none">
          <path
            d="M 648 370 C 605 370, 565 370, 524 370"
            stroke="#8c8c8c"
            strokeWidth="1.2"
            strokeDasharray="2.5 3"
          />
          <polygon points="522,370 528,367 528,373" fill="#8c8c8c" />
        </g>

        {/* Model Gateway Code Sheets */}
        <g transform="translate(650, 318)">
          {/* Left Sheet */}
          <g transform="translate(0, 0)">
            <rect
              x="0"
              y="0"
              width="56"
              height="80"
              rx="3"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.3"
            />
            {/* Horizontal Lines (with Orange Highlight) */}
            <line x1="8" y1="14" x2="48" y2="14" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="24" x2="44" y2="24" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="34" x2="38" y2="34" stroke="#fa5d19" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="8" y1="44" x2="46" y2="44" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="54" x2="36" y2="54" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="64" x2="42" y2="64" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          </g>

          {/* Right Sheet (Slightly Staggered) */}
          <g transform="translate(62, 8)">
            <rect
              x="0"
              y="0"
              width="50"
              height="72"
              rx="3"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.3"
            />
            <line x1="8" y1="12" x2="42" y2="12" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="22" x2="36" y2="22" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="32" x2="40" y2="32" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="42" x2="32" y2="42" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="52" x2="38" y2="52" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        </g>

        {/* Label Beneath */}
        <text
          x="706"
          y="435"
          textAnchor="middle"
          fill="#262626"
          fontSize="14.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Model gateway
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 6. SIDE DEPENDENCY: KNOWLEDGE RETRIEVAL (Lower Left) */}
      {/* ========================================================================= */}
      <g id="knowledge-retrieval-group">
        {/* Curved Dotted Connector from Knowledge up to Runtime */}
        <g fill="none">
          <path
            d="M 334 496 C 365 450, 395 425, 412 400"
            stroke="#8c8c8c"
            strokeWidth="1.2"
            strokeDasharray="2.5 3"
          />
          <polygon points="414,398 407,402 411,407" fill="#8c8c8c" />
        </g>

        {/* 3 Overlapping Documents with Custom Magnifying Glass */}
        <g transform="translate(258, 474)">
          {/* Sheet 3 (Back) */}
          <path
            d="M -8 -8 L 38 -8 L 48 2 L 48 64 L -8 64 Z"
            fill="#ffffff"
            stroke="#c8c8c8"
            strokeWidth="1.1"
          />
          {/* Sheet 2 (Middle) */}
          <path
            d="M -2 -2 L 44 -2 L 54 8 L 54 70 L -2 70 Z"
            fill="#ffffff"
            stroke="#a0a0a0"
            strokeWidth="1.1"
          />
          {/* Sheet 1 (Front Dog-Eared) */}
          <path
            d="M 4 4 L 50 4 L 62 16 L 62 76 L 4 76 Z"
            fill="#ffffff"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M 50 4 L 50 16 L 62 16 Z"
            fill="#f0f0f0"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* Text strokes */}
          <line x1="12" y1="24" x2="46" y2="24" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="12" y1="34" x2="42" y2="34" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="12" y1="44" x2="48" y2="44" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />

          {/* Custom Drawn Magnifying Glass Overlapping Document */}
          <g transform="translate(48, 52)">
            {/* Lens Ring with Orange Accent */}
            <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#fa5d19" strokeWidth="2" />
            <circle cx="0" cy="0" r="9" fill="none" stroke="#fa5d19" strokeWidth="0.8" opacity="0.4" />
            {/* Diagonal Handle */}
            <line
              x1="9"
              y1="9"
              x2="21"
              y2="21"
              stroke="#fa5d19"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* Label Beneath */}
        <text
          x="288"
          y="582"
          textAnchor="middle"
          fill="#262626"
          fontSize="14.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Knowledge retrieval
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 7. SIDE DEPENDENCY: API TOOLS (Lower Right) */}
      {/* ========================================================================= */}
      <g id="api-tools-group">
        {/* Curved Dotted Connector from Tools up to Runtime */}
        <g fill="none">
          <path
            d="M 618 496 C 585 450, 550 425, 508 400"
            stroke="#8c8c8c"
            strokeWidth="1.2"
            strokeDasharray="2.5 3"
          />
          <polygon points="506,398 509,407 513,402" fill="#8c8c8c" />
        </g>

        {/* Folded-Corner Document with Curly Braces */}
        <g transform="translate(630, 474)">
          <path
            d="M 0 0 L 52 0 L 66 14 L 66 84 L 0 84 Z"
            fill="#ffffff"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M 52 0 L 52 14 L 66 14 Z"
            fill="#f0f0f0"
            stroke="#262626"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />

          {/* Curly Braces: { } */}
          <text
            x="33"
            y="32"
            textAnchor="middle"
            fill="#262626"
            fontSize="18"
            fontFamily="monospace"
            fontWeight="bold"
          >
            &#123; &#125;
          </text>

          {/* Content Strokes with One Orange Highlight Line */}
          <line x1="12" y1="46" x2="54" y2="46" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="12" y1="56" x2="48" y2="56" stroke="#fa5d19" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="12" y1="66" x2="42" y2="66" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* Label Beneath */}
        <text
          x="663"
          y="582"
          textAnchor="middle"
          fill="#262626"
          fontSize="14.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          API tools
        </text>
      </g>

      {/* ========================================================================= */}
      {/* 8. BOTTOM CENTER: CONVERSATION SERVICE (Message Bubble + Database Cylinder) */}
      {/* ========================================================================= */}
      <g id="conversation-service-group">
        {/* Message Bubble + DB Cylinder Group */}
        <g transform="translate(460, 552)">
          {/* Left: Chat Message Bubble */}
          <g transform="translate(-78, -36)">
            {/* Bubble Shell with Corner Tail */}
            <path
              d="M 4 0 L 68 0 A 4 4 0 0 1 72 4 L 72 46 A 4 4 0 0 1 68 50 L 16 50 L 6 58 L 8 50 L 4 50 A 4 4 0 0 1 0 46 L 0 4 A 4 4 0 0 1 4 0 Z"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            {/* Text lines (with Orange Highlight Line) */}
            <line x1="12" y1="18" x2="58" y2="18" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="12" y1="28" x2="50" y2="28" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="12" y1="38" x2="42" y2="38" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
          </g>

          {/* Right: 3D Database Cylinder */}
          <g transform="translate(10, -42)" stroke="#262626" strokeWidth="1.3" fill="#ffffff">
            {/* Top Ellipse */}
            <ellipse cx="22" cy="8" rx="22" ry="7" />
            {/* Internal Layer Lines */}
            <path d="M 0 20 C 0 27, 44 27, 44 20" fill="none" />
            <path d="M 0 32 C 0 39, 44 39, 44 32" fill="none" />
            <path d="M 0 44 C 0 51, 44 51, 44 44" fill="none" />
            {/* Outer Sides & Bottom Curve */}
            <path d="M 0 8 L 0 56 C 0 63, 44 63, 44 56 L 44 8" fill="none" />
          </g>
        </g>

        {/* Labels Beneath */}
        <text
          x="460"
          y="612"
          textAnchor="middle"
          fill="#262626"
          fontSize="16"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          Conversation service
        </text>
        <text
          x="460"
          y="632"
          textAnchor="middle"
          fill="#737373"
          fontSize="12.5"
          fontFamily="sans-serif"
        >
          History + message persistence
        </text>
      </g>
    </svg>
  );
}
