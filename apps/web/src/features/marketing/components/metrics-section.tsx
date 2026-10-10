"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";

// =========================================================================
// Column 1 SVG: Bounded Execution (05 Tool Rounds Max)
// Five horizontal round nodes terminating at an orange square stop marker,
// with upper tool documents get_weather() and search() with curved connectors.
// =========================================================================
function BoundedExecutionIllustration({ isAnimating }: { isAnimating: boolean }) {
  const dots = [
    { x: 30, y: 30 }, { x: 160, y: 25 }, { x: 280, y: 35 }, { x: 390, y: 30 },
    { x: 25, y: 120 }, { x: 295, y: 120 }, { x: 400, y: 125 },
    { x: 40, y: 220 }, { x: 180, y: 225 }, { x: 380, y: 220 }
  ];
  const pluses = [
    { x: 160, y: 70 }, { x: 390, y: 75 }, { x: 245, y: 220 }
  ];

  return (
    <svg
      viewBox="0 0 420 240"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Bounded execution sequence: five tool rounds ending at a hard limit stop"
    >
      {/* Background Particles */}
      <g opacity="0.5">
        {dots.map((d, i) => (
          <circle key={`be-d-${i}`} cx={d.x} cy={d.y} r="1" fill="#b8b8b8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`be-p-${i}`} stroke="#b8b8b8" strokeWidth="0.8">
            <line x1={p.x - 2.5} y1={p.y} x2={p.x + 2.5} y2={p.y} />
            <line x1={p.x} y1={p.y - 2.5} x2={p.x + 2.5} y2={p.y + 2.5} />
          </g>
        ))}
      </g>

      {/* UPPER TOOL DOCUMENTS */}
      {/* Tool Document 1: get_weather() */}
      <g id="tool-doc-1" transform="translate(48, 30)">
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
        <text x="8" y="20" fill="#262626" fontSize="8.5" fontFamily="monospace" fontWeight="600">
          get_weather()
        </text>
        <text x="8" y="32" fill="#737373" fontSize="9.5" fontFamily="monospace">
          &#123;
        </text>
        <line x1="12" y1="42" x2="52" y2="42" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="52" x2="42" y2="52" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="62" x2="48" y2="62" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <text x="8" y="74" fill="#737373" fontSize="9.5" fontFamily="monospace">
          &#125;
        </text>
      </g>

      {/* Tool Document 2: search() */}
      <g id="tool-doc-2" transform="translate(198, 30)">
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
        <text x="10" y="20" fill="#262626" fontSize="9" fontFamily="monospace" fontWeight="600">
          search()
        </text>
        <text x="10" y="32" fill="#737373" fontSize="9.5" fontFamily="monospace">
          &#123;
        </text>
        <line x1="14" y1="42" x2="54" y2="42" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="14" y1="52" x2="46" y2="52" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="14" y1="62" x2="50" y2="62" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <text x="10" y="74" fill="#737373" fontSize="9.5" fontFamily="monospace">
          &#125;
        </text>
      </g>

      {/* CURVED DOTTED CONNECTORS BETWEEN TOOLS AND ROUND NODES */}
      <g fill="none">
        {/* Doc 1 down to Node 2 */}
        <path
          d="M 81 114 C 81 140, 102 145, 102 170"
          stroke="#8c8c8c"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />

        {/* Node 2 up to Request Packet above Node 3 */}
        <path
          d="M 102 170 C 120 145, 140 135, 162 135"
          stroke="#fa5d19"
          strokeWidth="1.3"
          strokeDasharray="2.5 3"
        />
        {/* Packet down to Node 3 */}
        <path
          d="M 178 135 C 190 135, 198 145, 198 170"
          stroke="#fa5d19"
          strokeWidth="1.3"
          strokeDasharray="2.5 3"
        />

        {/* Doc 2 down to Node 4 */}
        <path
          d="M 231 114 C 231 140, 246 145, 246 170"
          stroke="#8c8c8c"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />

        {/* Node 4 up and into Node 5 */}
        <path
          d="M 246 170 C 265 145, 290 150, 294 170"
          stroke="#fa5d19"
          strokeWidth="1.3"
          strokeDasharray="2.5 3"
        />
      </g>

      {/* Request Packet above Node 3 */}
      <g transform="translate(142, 122)">
        <rect x="0" y="0" width="38" height="20" rx="3" fill="#ffffff" stroke="#fa5d19" strokeWidth="1.4" />
        <line x1="8" y1="7" x2="30" y2="7" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="13" x2="24" y2="13" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* ================= BOTTOM ROUND PATH (Nodes 1, 2, 3, 4, 5 -> Stop) ================= */}
      <g transform="translate(0, 185)">
        {/* Node 1 */}
        <circle cx="45" cy="0" r="14" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        <text x="45" y="4" textAnchor="middle" fill="#262626" fontSize="11" fontFamily="sans-serif" fontWeight="500">
          1
        </text>

        {/* Arrow 1 -> 2 */}
        <line x1="59" y1="0" x2="88" y2="0" stroke="#737373" strokeWidth="1.2" />
        <polygon points="90,0 84,-3 84,3" fill="#737373" />

        {/* Node 2 */}
        <circle cx="102" cy="0" r="14" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        <text x="102" y="4" textAnchor="middle" fill="#262626" fontSize="11" fontFamily="sans-serif" fontWeight="500">
          2
        </text>

        {/* Arrow 2 -> 3 */}
        <line x1="116" y1="0" x2="148" y2="0" stroke="#737373" strokeWidth="1.2" />
        <polygon points="150,0 144,-3 144,3" fill="#737373" />

        {/* Node 3 */}
        <circle cx="162" cy="0" r="14" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        <text x="162" y="4" textAnchor="middle" fill="#262626" fontSize="11" fontFamily="sans-serif" fontWeight="500">
          3
        </text>

        {/* Arrow 3 -> 4 */}
        <line x1="176" y1="0" x2="216" y2="0" stroke="#737373" strokeWidth="1.2" />
        <polygon points="218,0 212,-3 212,3" fill="#737373" />

        {/* Node 4 */}
        <circle cx="228" cy="0" r="14" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        <text x="228" y="4" textAnchor="middle" fill="#262626" fontSize="11" fontFamily="sans-serif" fontWeight="500">
          4
        </text>

        {/* Arrow 4 -> 5 */}
        <line x1="242" y1="0" x2="278" y2="0" stroke="#737373" strokeWidth="1.2" />
        <polygon points="280,0 274,-3 274,3" fill="#737373" />

        {/* Node 5 (ORANGE OUTLINE - FINAL ROUND) */}
        <circle cx="294" cy="0" r="15" fill="#ffffff" stroke="#fa5d19" strokeWidth="2" />
        <text x="294" y="4" textAnchor="middle" fill="#fa5d19" fontSize="12" fontFamily="sans-serif" fontWeight="bold">
          5
        </text>

        {/* Orange Connector 5 -> Stop Marker */}
        <line x1="309" y1="0" x2="332" y2="0" stroke="#fa5d19" strokeWidth="1.5" />
        <polygon points="334,0 328,-3 328,3" fill="#fa5d19" />

        {/* Solid Orange Square Stop Marker */}
        <rect x="336" y="-7" width="14" height="14" rx="1.5" fill="#fa5d19" />
      </g>
    </svg>
  );
}

// =========================================================================
// Column 2 SVG: Stable Configuration (01 Published Snapshot Per Run)
// Draft stack -> orange v3 Published doc with drawn lock -> 2 reply bubbles
// =========================================================================
function StableConfigurationIllustration({ isAnimating }: { isAnimating: boolean }) {
  const dots = [
    { x: 45, y: 35 }, { x: 170, y: 25 }, { x: 380, y: 30 },
    { x: 30, y: 120 }, { x: 395, y: 125 },
    { x: 50, y: 220 }, { x: 165, y: 225 }, { x: 380, y: 220 }
  ];
  const pluses = [
    { x: 35, y: 70 }, { x: 230, y: 30 }, { x: 110, y: 215 }
  ];

  return (
    <svg
      viewBox="0 0 420 240"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Stable configuration: Draft documents published to a frozen v3 release snapshot generating replies"
    >
      {/* Background Particles */}
      <g opacity="0.5">
        {dots.map((d, i) => (
          <circle key={`sc-d-${i}`} cx={d.x} cy={d.y} r="1" fill="#b8b8b8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`sc-p-${i}`} stroke="#b8b8b8" strokeWidth="0.8">
            <line x1={p.x - 2.5} y1={p.y} x2={p.x + 2.5} y2={p.y} />
            <line x1={p.x} y1={p.y - 2.5} x2={p.x + 2.5} y2={p.y + 2.5} />
          </g>
        ))}
      </g>

      {/* LEFT: DRAFT STACK (4 Overlapping Sheets) */}
      <g id="draft-stack" transform="translate(60, 48)">
        {/* Sheet 4 (Back) */}
        <path d="M 18 -12 L 68 -12 L 80 0 L 80 102 L 18 102 Z" fill="#ffffff" stroke="#c7c7c7" strokeWidth="1" />
        {/* Sheet 3 */}
        <path d="M 12 -6 L 62 -6 L 74 6 L 74 108 L 12 108 Z" fill="#ffffff" stroke="#b0b0b0" strokeWidth="1" />
        {/* Sheet 2 */}
        <path d="M 6 0 L 56 0 L 68 12 L 68 114 L 6 114 Z" fill="#ffffff" stroke="#8c8c8c" strokeWidth="1" />

        {/* Front Sheet (with Dog-Ear) */}
        <path
          d="M 0 6 L 50 6 L 64 20 L 64 122 L 0 122 Z"
          fill="#ffffff"
          stroke="#737373"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M 50 6 L 50 20 L 64 20 Z"
          fill="#f0f0f0"
          stroke="#737373"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />

        {/* Content Lines */}
        <line x1="10" y1="36" x2="54" y2="36" stroke="#b8b8b8" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="48" x2="48" y2="48" stroke="#b8b8b8" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="60" x2="52" y2="60" stroke="#b8b8b8" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="72" x2="42" y2="72" stroke="#b8b8b8" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="84" x2="50" y2="84" stroke="#b8b8b8" strokeWidth="1.3" strokeLinecap="round" />

        {/* Caption Below: Draft */}
        <text
          x="32"
          y="148"
          textAnchor="middle"
          fill="#737373"
          fontSize="11.5"
          fontFamily="monospace"
        >
          Draft
        </text>
      </g>

      {/* DOTTED CONNECTOR: DRAFT -> PUBLISHED RELEASE */}
      <g fill="none">
        <path
          d="M 132 110 L 165 110"
          stroke="#a3a3a3"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />
        <polygon points="168,110 162,107 162,113" fill="#a3a3a3" />
      </g>

      {/* CENTER: PUBLISHED v3 DOCUMENT WITH DRAWN LOCK */}
      <g id="published-doc" transform="translate(178, 48)">
        <path
          d="M 0 0 L 58 0 L 76 18 L 76 128 L 0 128 Z"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M 58 0 L 58 18 L 76 18 Z"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Prominent Label: v3 */}
        <text
          x="12"
          y="30"
          fill="#fa5d19"
          fontSize="15"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          v3
        </text>

        {/* Content Strokes */}
        <line x1="12" y1="46" x2="64" y2="46" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="58" x2="56" y2="58" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="70" x2="60" y2="70" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />

        {/* Custom Lock Drawing (Curved Shackle, Body, Keyhole) */}
        <g transform="translate(30, 84)" stroke="#fa5d19" strokeWidth="1.3" fill="none">
          {/* Shackle */}
          <path d="M 4 8 L 4 4 C 4 0, 12 0, 12 4 L 12 8" strokeLinecap="round" />
          {/* Body */}
          <rect x="0" y="8" width="16" height="12" rx="1.5" fill="#ffffff" />
          {/* Keyhole */}
          <circle cx="8" cy="13" r="1.3" fill="#fa5d19" />
          <line x1="8" y1="14" x2="8" y2="17" strokeLinecap="round" />
        </g>

        {/* Caption Below: Published */}
        <text
          x="38"
          y="152"
          textAnchor="middle"
          fill="#fa5d19"
          fontSize="11.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Published
        </text>
      </g>

      {/* CONNECTORS TO REPLIES */}
      <g fill="none">
        {/* Upper Arrow to Reply 1 */}
        <path
          d="M 256 75 C 272 75, 276 65, 290 65"
          stroke="#fa5d19"
          strokeWidth="1.4"
        />
        <polygon points="293,65 287,62 287,68" fill="#fa5d19" />

        {/* Lower Arrow to Reply 2 */}
        <path
          d="M 256 125 C 272 125, 276 135, 290 135"
          stroke="#fa5d19"
          strokeWidth="1.4"
        />
        <polygon points="293,135 287,132 287,138" fill="#fa5d19" />
      </g>

      {/* RIGHT: TWO REPLY MESSAGE BUBBLES WITH SENDER SILHOUETTES */}
      <g id="reply-bubbles" transform="translate(295, 45)">
        {/* Message Bubble 1 */}
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="68" height="34" rx="4" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
          <line x1="8" y1="12" x2="60" y2="12" stroke="#8c8c8c" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="20" x2="48" y2="20" stroke="#8c8c8c" strokeWidth="1.2" strokeLinecap="round" />

          {/* User Silhouette Circle Avatar */}
          <g transform="translate(76, 7)" stroke="#262626" strokeWidth="1.1" fill="none">
            <circle cx="10" cy="10" r="10" />
            <circle cx="10" cy="8" r="3.5" fill="#262626" />
            <path d="M 4 18 C 4 14, 16 14, 16 18" />
          </g>
        </g>

        {/* Message Bubble 2 */}
        <g transform="translate(0, 52)">
          <rect x="0" y="0" width="68" height="34" rx="4" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
          <line x1="8" y1="12" x2="58" y2="12" stroke="#8c8c8c" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="20" x2="44" y2="20" stroke="#8c8c8c" strokeWidth="1.2" strokeLinecap="round" />

          {/* User Silhouette Circle Avatar */}
          <g transform="translate(76, 7)" stroke="#262626" strokeWidth="1.1" fill="none">
            <circle cx="10" cy="10" r="10" />
            <circle cx="10" cy="8" r="3.5" fill="#262626" />
            <path d="M 4 18 C 4 14, 16 14, 16 18" />
          </g>
        </g>

        {/* Caption Below: Reply */}
        <text
          x="34"
          y="110"
          textAnchor="middle"
          fill="#737373"
          fontSize="11.5"
          fontFamily="sans-serif"
        >
          Reply
        </text>
      </g>
    </svg>
  );
}

// =========================================================================
// Column 3 SVG: Recognized Retries (Message-Key Deduplication)
// Two request docs (key: msg-01) merging into an orange packet -> One stored message + DB cylinder
// =========================================================================
function RecognizedRetriesIllustration({ isAnimating }: { isAnimating: boolean }) {
  const dots = [
    { x: 30, y: 35 }, { x: 190, y: 25 }, { x: 380, y: 30 },
    { x: 180, y: 120 }, { x: 390, y: 125 },
    { x: 40, y: 220 }, { x: 160, y: 225 }, { x: 260, y: 215 }, { x: 375, y: 220 }
  ];
  const pluses = [
    { x: 230, y: 35 }, { x: 365, y: 75 }, { x: 195, y: 185 }
  ];

  return (
    <svg
      viewBox="0 0 420 240"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Recognized retries: Repeated requests with identical message keys resolve to a single stored message"
    >
      {/* Background Particles */}
      <g opacity="0.5">
        {dots.map((d, i) => (
          <circle key={`rr-d-${i}`} cx={d.x} cy={d.y} r="1" fill="#b8b8b8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`rr-p-${i}`} stroke="#b8b8b8" strokeWidth="0.8">
            <line x1={p.x - 2.5} y1={p.y} x2={p.x + 2.5} y2={p.y} />
            <line x1={p.x} y1={p.y - 2.5} x2={p.x + 2.5} y2={p.y + 2.5} />
          </g>
        ))}
      </g>

      {/* LEFT: TWO REQUEST DOCUMENTS (Upper + Lower) */}
      {/* Request Document 1 (Top) */}
      <g id="request-doc-1" transform="translate(60, 30)">
        <path
          d="M 0 0 L 48 0 L 62 14 L 62 68 L 0 68 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M 48 0 L 48 14 L 62 14 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <text x="8" y="20" fill="#262626" fontSize="8.5" fontFamily="monospace" fontWeight="500">
          key: msg-01
        </text>
        <line x1="8" y1="32" x2="52" y2="32" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="42" x2="44" y2="42" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="52" x2="50" y2="52" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* Request Document 2 (Bottom - Retry) */}
      <g id="request-doc-2" transform="translate(60, 115)">
        <path
          d="M 0 0 L 48 0 L 62 14 L 62 68 L 0 68 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M 48 0 L 48 14 L 62 14 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <text x="8" y="20" fill="#262626" fontSize="8.5" fontFamily="monospace" fontWeight="500">
          key: msg-01
        </text>
        <line x1="8" y1="32" x2="52" y2="32" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="42" x2="44" y2="42" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="52" x2="50" y2="52" stroke="#d4d4d4" strokeWidth="1.3" strokeLinecap="round" />

        {/* Caption: Retry */}
        <text
          x="31"
          y="88"
          textAnchor="middle"
          fill="#737373"
          fontSize="11"
          fontFamily="sans-serif"
        >
          Retry
        </text>
      </g>

      {/* CENTER: MERGING CONVERGENT DOTTED PATHS */}
      <g fill="none">
        {/* Upper Path */}
        <path
          d="M 122 64 C 155 64, 168 108, 186 112"
          stroke="#8c8c8c"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />
        {/* Lower Path */}
        <path
          d="M 122 148 C 155 148, 168 116, 186 112"
          stroke="#8c8c8c"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />

        {/* Arrow to Stored Message */}
        <line x1="220" y1="112" x2="252" y2="112" stroke="#fa5d19" strokeWidth="1.5" />
        <polygon points="255,112 249,109 249,115" fill="#fa5d19" />
      </g>

      {/* Merged Orange Message Packet */}
      <g transform="translate(186, 102)">
        <rect x="0" y="0" width="32" height="20" rx="3" fill="#ffffff" stroke="#fa5d19" strokeWidth="1.4" />
        <line x1="6" y1="7" x2="26" y2="7" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="6" y1="13" x2="20" y2="13" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* RIGHT: ONE STORED MESSAGE & DATABASE CYLINDER */}
      <g id="stored-message" transform="translate(262, 50)">
        {/* Stored Document (Orange Outline) */}
        <path
          d="M 0 0 L 48 0 L 62 14 L 62 82 L 0 82 Z"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 48 0 L 48 14 L 62 14 Z"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="10" y1="26" x2="52" y2="26" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="38" x2="44" y2="38" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="50" x2="50" y2="50" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="62" x2="38" y2="62" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />

        {/* 3D Database Cylinder */}
        <g transform="translate(18, 72)" stroke="#262626" strokeWidth="1.2" fill="#ffffff">
          <ellipse cx="13" cy="6" rx="13" ry="5" />
          <path d="M 0 6 L 0 15 C 0 20, 26 20, 26 15 L 26 6" />
          <path d="M 0 15 L 0 24 C 0 29, 26 29, 26 24 L 26 15" />
        </g>

        {/* Caption: One stored message */}
        <text
          x="31"
          y="125"
          textAnchor="middle"
          fill="#262626"
          fontSize="11.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          One stored message
        </text>
      </g>
    </svg>
  );
}

// =========================================================================
// Main MetricsSection Component: 3 Open Columns with Shared Dividers
// =========================================================================
export function MetricsSection() {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setIsAnimating(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full bg-[#f9f9f9] text-[#262626] border-t border-[#dedede] pt-12 pb-20 sm:pt-16 sm:pb-24 overflow-hidden"
    >
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Monospace Section Label */}
        <div className="flex items-center justify-between pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          <span>04 / RUNTIME RELIABILITY</span>
          <span className="hidden sm:inline opacity-60">&middot;&nbsp;&nbsp;+&nbsp;&nbsp;&middot;</span>
        </div>

        {/* Top Thin Horizontal Rule */}
        <div className="w-full h-px bg-[#dedede]" />

        {/* Heading Row: Two-Line Heading on Left + Supporting Statement on Right */}
        <div className="pt-8 pb-12 sm:pb-16 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <h2 className="text-4xl sm:text-5xl lg:text-[58px] font-medium tracking-tight text-[#262626] leading-[1.08]">
            Useful work needs
            <br />
            clear limits.
          </h2>

          <div className="text-xl sm:text-2xl font-normal text-[#262626] leading-snug lg:text-right max-w-md pt-2 lg:pt-3">
            Bound each run. Preserve outcomes.
            <br />
            Keep failures predictable.
          </div>
        </div>

        {/* Main 3-Column Layout Separated by Thin Vertical Rules */}
        <div className="border-t border-[#dedede] grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#dedede]">
          {/* ================= COLUMN 1: Bounded Execution ================= */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              {/* Large Numeral: 05 */}
              <div className="text-7xl sm:text-8xl lg:text-[96px] font-medium leading-none text-[#262626] tracking-tighter">
                05
              </div>

              {/* Orange Technical Label */}
              <div className="font-mono text-xs uppercase tracking-wider text-[#fa5d19] font-medium mt-4 mb-2">
                TOOL ROUNDS MAX
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-[26px] font-medium tracking-tight text-[#262626] mb-2">
                Bounded execution
              </h3>

              {/* Description */}
              <p className="text-base sm:text-lg text-[#666666] leading-relaxed font-normal">
                A turn has a finite tool loop.
                <br />
                It cannot keep calling tools forever.
              </p>
            </div>

            {/* Custom SVG Illustration */}
            <div className="w-full mt-6 flex items-center justify-center">
              <BoundedExecutionIllustration isAnimating={isAnimating} />
            </div>
          </div>

          {/* ================= COLUMN 2: Stable Configuration ================= */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              {/* Large Numeral: 01 */}
              <div className="text-7xl sm:text-8xl lg:text-[96px] font-medium leading-none text-[#262626] tracking-tighter">
                01
              </div>

              {/* Orange Technical Label */}
              <div className="font-mono text-xs uppercase tracking-wider text-[#fa5d19] font-medium mt-4 mb-2">
                PUBLISHED SNAPSHOT PER RUN
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-[26px] font-medium tracking-tight text-[#262626] mb-2">
                Stable configuration
              </h3>

              {/* Description */}
              <p className="text-base sm:text-lg text-[#666666] leading-relaxed font-normal">
                Conversation replies record the agent
                <br />
                version that produced them.
              </p>
            </div>

            {/* Custom SVG Illustration */}
            <div className="w-full mt-6 flex items-center justify-center">
              <StableConfigurationIllustration isAnimating={isAnimating} />
            </div>
          </div>

          {/* ================= COLUMN 3: Recognized Retries ================= */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              {/* Large Two-Arrow Circular Retry Symbol */}
              <div className="h-[96px] flex items-center">
                <svg
                  viewBox="0 0 100 100"
                  className="w-[84px] h-[84px] text-[#262626] overflow-visible select-none"
                  aria-label="Two circular arrows retry symbol"
                >
                  {/* Top Arrow arc */}
                  <path
                    d="M 22 50 C 22 28, 42 16, 68 18"
                    fill="none"
                    stroke="#262626"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <polygon points="76,19 60,8 63,28" fill="#262626" />

                  {/* Bottom Arrow arc */}
                  <path
                    d="M 78 50 C 78 72, 58 84, 32 82"
                    fill="none"
                    stroke="#262626"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <polygon points="24,81 40,92 37,72" fill="#262626" />
                </svg>
              </div>

              {/* Orange Technical Label */}
              <div className="font-mono text-xs uppercase tracking-wider text-[#fa5d19] font-medium mt-4 mb-2">
                MESSAGE-KEY DEDUPLICATION
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-[26px] font-medium tracking-tight text-[#262626] mb-2">
                Recognized retries
              </h3>

              {/* Description */}
              <p className="text-base sm:text-lg text-[#666666] leading-relaxed font-normal">
                Repeated message keys reuse the stored
                <br />
                message instead of adding a duplicate.
              </p>
            </div>

            {/* Custom SVG Illustration */}
            <div className="w-full mt-6 flex items-center justify-center">
              <RecognizedRetriesIllustration isAnimating={isAnimating} />
            </div>
          </div>
        </div>

        {/* Full-Width Bottom Rule & Footer */}
        <div className="border-t border-[#dedede] pt-6 mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm font-mono text-[#737373]">
          <div>Limits built into the runtime.</div>
          <Link
            href="#architecture"
            className="inline-flex items-center gap-1 text-[#262626] hover:text-[#fa5d19] transition-colors"
          >
            <span>Explore runtime behavior</span>
            <span>&nearr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
