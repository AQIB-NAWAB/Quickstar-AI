"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";

// =========================================================================
// Cell 1 Artwork: Knowledge + API Tools
// Policy documents stack -> Agent node [ ] -> API code documents { }
// =========================================================================
function Cell1Illustration({ isAnimating }: { isAnimating: boolean }) {
  const dots = [
    { x: 30, y: 30 }, { x: 95, y: 25 }, { x: 210, y: 35 }, { x: 310, y: 25 }, { x: 395, y: 40 },
    { x: 40, y: 210 }, { x: 135, y: 220 }, { x: 260, y: 215 }, { x: 390, y: 205 }
  ];
  const pluses = [
    { x: 160, y: 30 }, { x: 340, y: 35 }, { x: 90, y: 200 }, { x: 230, y: 215 }
  ];

  return (
    <svg
      viewBox="0 0 420 240"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Knowledge policy documents connected through agent to API tools"
    >
      {/* Background Subtle Particle Field */}
      <g opacity="0.5">
        {dots.map((d, i) => (
          <circle key={`c1-d-${i}`} cx={d.x} cy={d.y} r="1" fill="#b8b8b8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`c1-p-${i}`} stroke="#b8b8b8" strokeWidth="0.8">
            <line x1={p.x - 2.5} y1={p.y} x2={p.x + 2.5} y2={p.y} />
            <line x1={p.x} y1={p.y - 2.5} x2={p.x} y2={p.y + 2.5} />
          </g>
        ))}
      </g>

      {/* Dotted Connecting Path: Policy -> Agent -> API Tool */}
      <g fill="none">
        <path
          d="M 125 125 C 160 125, 165 125, 185 125"
          stroke="#fa5d19"
          strokeWidth="1.4"
          strokeDasharray="3 3.5"
        />
        <path
          d="M 235 125 C 255 125, 260 125, 295 125"
          stroke="#fa5d19"
          strokeWidth="1.4"
          strokeDasharray="3 3.5"
        />

        {/* Traveling Orange Square Packets */}
        <rect
          x={isAnimating ? 175 : 145}
          y="122.5"
          width="5"
          height="5"
          fill="#fa5d19"
          className="transition-all duration-700 ease-out"
        />
        <rect
          x={isAnimating ? 285 : 250}
          y="122.5"
          width="5"
          height="5"
          fill="#fa5d19"
          className="transition-all duration-700 ease-out"
        />
      </g>

      {/* LEFT: POLICY DOCUMENTS (3 Overlapping Sheets) */}
      <g id="policy-stack" transform="translate(45, 45)">
        {/* Sheet 3 (Back) */}
        <path
          d="M 16 -12 L 68 -12 L 84 4 L 84 122 L 16 122 Z"
          fill="#ffffff"
          stroke="#b8b8b8"
          strokeWidth="1.2"
        />
        {/* Sheet 2 (Middle) */}
        <path
          d="M -6 -2 L 48 -2 L 64 14 L 64 132 L -6 132 Z"
          fill="#ffffff"
          stroke="#8c8c8c"
          strokeWidth="1.2"
        />

        {/* Sheet 1 (Front Prominent Document with Dog-Ear) */}
        <path
          d="M 0 10 L 62 10 L 80 28 L 80 148 L 0 148 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        {/* Dog-ear fold */}
        <path
          d="M 62 10 L 62 28 L 80 28 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />

        {/* Title: Policy */}
        <text
          x="12"
          y="35"
          fill="#262626"
          fontSize="11"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          Policy
        </text>

        {/* Horizontal Content Lines with Orange Highlights */}
        <line x1="12" y1="52" x2="68" y2="52" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="64" x2="58" y2="64" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />

        {/* Highlighted Passage Lines (Orange) */}
        <line x1="12" y1="78" x2="68" y2="78" stroke="#fa5d19" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="90" x2="56" y2="90" stroke="#fa5d19" strokeWidth="1.8" strokeLinecap="round" />

        <line x1="12" y1="104" x2="65" y2="104" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="116" x2="48" y2="116" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="128" x2="62" y2="128" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* CENTER: AGENT NODE [ ] */}
      <g id="agent-node" transform="translate(185, 100)">
        <rect
          x="0"
          y="0"
          width="50"
          height="50"
          rx="6"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.75"
        />
        <text
          x="25"
          y="32"
          textAnchor="middle"
          fill="#fa5d19"
          fontSize="18"
          fontFamily="monospace"
          fontWeight="bold"
        >
          [ ]
        </text>
      </g>

      {/* RIGHT: API CODE DOCUMENTS */}
      <g id="api-stack" transform="translate(295, 52)">
        {/* Rear Code Sheet */}
        <path
          d="M 15 -8 L 65 -8 L 80 7 L 80 128 L 15 128 Z"
          fill="#ffffff"
          stroke="#8c8c8c"
          strokeWidth="1.2"
        />

        {/* Front Code Sheet with Dog-Ear */}
        <path
          d="M 0 5 L 65 5 L 82 22 L 82 142 L 0 142 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        {/* Dog-ear fold */}
        <path
          d="M 65 5 L 65 22 L 82 22 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />

        {/* Curly Brace { */}
        <text x="12" y="28" fill="#262626" fontSize="13" fontFamily="monospace" fontWeight="600">
          &#123;
        </text>

        {/* check_order title */}
        <text
          x="18"
          y="48"
          fill="#262626"
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="500"
        >
          check_order
        </text>

        {/* Divider and Parameter Lines */}
        <line x1="14" y1="58" x2="70" y2="58" stroke="#e0e0e0" strokeWidth="1" />
        <line x1="14" y1="70" x2="68" y2="70" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="82" x2="55" y2="82" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="14" y1="94" x2="62" y2="94" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="14" y1="106" x2="45" y2="106" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />

        {/* Curly Brace } */}
        <text x="68" y="128" fill="#262626" fontSize="13" fontFamily="monospace" fontWeight="600">
          &#125;
        </text>
      </g>
    </svg>
  );
}

// =========================================================================
// Cell 2 Artwork: Published Versions
// Horizontal rail (v1, v2 -> v3 Published) with ascending Draft branch & pencil
// =========================================================================
function Cell2Illustration({ isAnimating }: { isAnimating: boolean }) {
  const dots = [
    { x: 45, y: 35 }, { x: 130, y: 25 }, { x: 260, y: 35 }, { x: 380, y: 25 },
    { x: 140, y: 210 }, { x: 220, y: 225 }, { x: 340, y: 215 }, { x: 390, y: 220 }
  ];
  const pluses = [
    { x: 190, y: 35 }, { x: 395, y: 105 }, { x: 235, y: 210 }
  ];

  return (
    <svg
      viewBox="0 0 420 240"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Published release version rail with separate ascending draft branch and pencil"
    >
      {/* Background Particles */}
      <g opacity="0.5">
        {dots.map((d, i) => (
          <circle key={`c2-d-${i}`} cx={d.x} cy={d.y} r="1" fill="#b8b8b8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`c2-p-${i}`} stroke="#b8b8b8" strokeWidth="0.8">
            <line x1={p.x - 2.5} y1={p.y} x2={p.x + 2.5} y2={p.y} />
            <line x1={p.x} y1={p.y - 2.5} x2={p.x} y2={p.y + 2.5} />
          </g>
        ))}
      </g>

      {/* Main Horizontal Release Rail */}
      <line x1="80" y1="140" x2="315" y2="140" stroke="#b0b0b0" strokeWidth="1.4" />

      {/* Node v1 */}
      <g transform="translate(105, 140)">
        <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#262626" strokeWidth="1.4" />
        <text x="0" y="24" textAnchor="middle" fill="#262626" fontSize="11" fontFamily="sans-serif" fontWeight="500">
          v1
        </text>
      </g>

      {/* Node v2 */}
      <g transform="translate(170, 140)">
        <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#262626" strokeWidth="1.4" />
        <text x="0" y="24" textAnchor="middle" fill="#262626" fontSize="11" fontFamily="sans-serif" fontWeight="500">
          v2
        </text>
      </g>

      {/* Ascending Draft Branch (leaves rail before v3) */}
      <path
        d="M 195 140 C 235 140, 240 70, 290 70"
        fill="none"
        stroke="#949494"
        strokeWidth="1.4"
        strokeDasharray="3 3.5"
      />

      {/* UPPER RIGHT: DRAFT DOCUMENT WITH PENCIL */}
      <g id="draft-document" transform="translate(290, 25)">
        {/* Document Sheet */}
        <path
          d="M 0 0 L 52 0 L 68 16 L 68 88 L 0 88 Z"
          fill="#ffffff"
          stroke="#737373"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Dog-ear fold */}
        <path
          d="M 52 0 L 52 16 L 68 16 Z"
          fill="#f0f0f0"
          stroke="#737373"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Title: Draft */}
        <text x="10" y="22" fill="#262626" fontSize="10.5" fontFamily="sans-serif" fontWeight="600">
          Draft
        </text>

        {/* Draft text lines with orange edit highlight */}
        <line x1="10" y1="36" x2="56" y2="36" stroke="#fa5d19" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="10" y1="48" x2="50" y2="48" stroke="#fa5d19" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="10" y1="60" x2="58" y2="60" stroke="#b8b8b8" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="10" y1="72" x2="42" y2="72" stroke="#b8b8b8" strokeWidth="1.4" strokeLinecap="round" />

        {/* Custom Diagonal Pencil Drawing Resting Against Draft */}
        <g transform="translate(56, -8) rotate(45)">
          {/* Pencil Body */}
          <rect x="-4" y="-18" width="8" height="24" rx="1" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
          <line x1="0" y1="-18" x2="0" y2="6" stroke="#d4d4d4" strokeWidth="0.8" />
          {/* Pencil Tip (Cone) */}
          <polygon points="-4,6 4,6 0,14" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
          {/* Graphite Lead Point */}
          <polygon points="-1.5,11 1.5,11 0,14" fill="#262626" />
        </g>
      </g>

      {/* LOWER RIGHT: PUBLISHED RELEASE (v3) */}
      <g id="published-release" transform="translate(285, 126)">
        {/* Concentric Orange Rail Node */}
        <g transform="translate(0, 14)">
          <circle cx="0" cy="0" r="9" fill="#ffffff" stroke="#fa5d19" strokeWidth="1.75" />
          <circle cx="0" cy="0" r="4" fill="#fa5d19" />
        </g>

        {/* Line leading from node to v3 doc */}
        <line x1="9" y1="14" x2="25" y2="14" stroke="#fa5d19" strokeWidth="1.4" />

        {/* Published Document (Orange Outline) */}
        <g transform="translate(25, -20)">
          <path
            d="M 0 0 L 48 0 L 62 14 L 62 82 L 0 82 Z"
            fill="#ffffff"
            stroke="#fa5d19"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Dog-ear fold */}
          <path
            d="M 48 0 L 48 14 L 62 14 Z"
            fill="#ffffff"
            stroke="#fa5d19"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Orange Content Strokes */}
          <line x1="10" y1="26" x2="52" y2="26" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="38" x2="44" y2="38" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="50" x2="50" y2="50" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="62" x2="38" y2="62" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />

          {/* Captions: v3 / Published */}
          <text
            x="31"
            y="102"
            textAnchor="middle"
            fill="#fa5d19"
            fontSize="12"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            v3
          </text>
          <text
            x="31"
            y="118"
            textAnchor="middle"
            fill="#fa5d19"
            fontSize="10"
            fontFamily="sans-serif"
            fontWeight="500"
          >
            Published
          </text>
        </g>
      </g>
    </svg>
  );
}

// =========================================================================
// Cell 3 Artwork: Workspace Boundaries
// Two strictly isolated compartments (Workspace A & Workspace B)
// =========================================================================
function Cell3Illustration({ isAnimating }: { isAnimating: boolean }) {
  return (
    <svg
      viewBox="0 0 420 270"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Two isolated workspaces containing independent documents, database, messages, and request nodes"
    >
      {/* ================= LEFT COMPARTMENT: WORKSPACE A ================= */}
      <g id="workspace-a" transform="translate(30, 20)">
        {/* Perimeter with Fine Orange Dotted Line */}
        <rect
          x="0"
          y="0"
          width="160"
          height="230"
          rx="8"
          fill="none"
          stroke="#fa5d19"
          strokeWidth="1.4"
          strokeDasharray="3 3.5"
        />

        {/* Compartment Label: Workspace A */}
        <text
          x="80"
          y="25"
          textAnchor="middle"
          fill="#262626"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="600"
        >
          Workspace A
        </text>

        {/* Internal Technical Dots and Plus */}
        <circle cx="25" cy="50" r="1" fill="#fa5d19" opacity="0.6" />
        <circle cx="135" cy="50" r="1" fill="#fa5d19" opacity="0.6" />
        <g stroke="#fa5d19" strokeWidth="0.8" opacity="0.5">
          <line x1="128" y1="90" x2="132" y2="90" />
          <line x1="130" y1="88" x2="130" y2="92" />
          <line x1="28" y1="210" x2="32" y2="210" />
          <line x1="30" y1="208" x2="30" y2="212" />
        </g>

        {/* 1. Folded Paper Document (Top Left) */}
        <g transform="translate(18, 48)">
          <path d="M 0 0 L 32 0 L 42 10 L 42 56 L 0 56 Z" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
          <path d="M 32 0 L 32 10 L 42 10 Z" fill="#f0f0f0" stroke="#262626" strokeWidth="1.2" />
          <line x1="6" y1="18" x2="34" y2="18" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="28" x2="28" y2="28" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="38" x2="32" y2="38" stroke="#d4d4d4" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="6" y1="46" x2="24" y2="46" stroke="#d4d4d4" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* 2. Custom 3D Database Cylinder (Top Right) */}
        <g transform="translate(100, 52)" stroke="#262626" strokeWidth="1.2" fill="#ffffff">
          {/* Top Ellipse */}
          <ellipse cx="18" cy="8" rx="18" ry="6" />
          {/* Mid Layer 1 */}
          <path d="M 0 8 L 0 20 C 0 26, 36 26, 36 20 L 36 8" />
          {/* Mid Layer 2 */}
          <path d="M 0 20 L 0 32 C 0 38, 36 38, 36 32 L 36 20" />
          {/* Bottom Layer */}
          <path d="M 0 32 L 0 44 C 0 50, 36 50, 36 44 L 36 32" />
        </g>

        {/* 3. Small Message Bubble with Tail (Lower Left) */}
        <g transform="translate(20, 140)" stroke="#262626" strokeWidth="1.2" fill="#ffffff">
          <path d="M 0 0 L 38 0 C 42 0, 42 4, 42 4 L 42 24 C 42 28, 38 28, 38 28 L 12 28 L 4 35 L 6 28 L 0 28 C 0 28, 0 0, 0 0 Z" />
          <line x1="8" y1="10" x2="32" y2="10" stroke="#8c8c8c" strokeWidth="1.2" />
          <line x1="8" y1="18" x2="26" y2="18" stroke="#8c8c8c" strokeWidth="1.2" />
        </g>

        {/* 4. Orange Outlined Request Node (Bottom Right) */}
        <g transform="translate(98, 146)">
          <rect x="0" y="0" width="38" height="38" rx="5" fill="#ffffff" stroke="#fa5d19" strokeWidth="1.5" />
          <text x="19" y="24" textAnchor="middle" fill="#fa5d19" fontSize="14" fontFamily="monospace" fontWeight="bold">
            &#123; &#125;
          </text>
        </g>

        {/* Internal Dotted Paths (Contained in Workspace A Only) */}
        <path
          d="M 40 106 C 40 135, 80 145, 98 165"
          fill="none"
          stroke="#fa5d19"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />
        <path
          d="M 118 104 C 118 120, 118 135, 118 146"
          fill="none"
          stroke="#fa5d19"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />

        {/* Animated Moving Packet inside Workspace A */}
        <rect
          x={isAnimating ? 95 : 60}
          y={isAnimating ? 162 : 125}
          width="4"
          height="4"
          fill="#fa5d19"
          className="transition-all duration-700 ease-out"
        />
      </g>

      {/* ================= RIGHT COMPARTMENT: WORKSPACE B ================= */}
      <g id="workspace-b" transform="translate(230, 20)">
        {/* Perimeter with Fine Gray Dotted Line */}
        <rect
          x="0"
          y="0"
          width="160"
          height="230"
          rx="8"
          fill="none"
          stroke="#b0b0b0"
          strokeWidth="1.4"
          strokeDasharray="3 3.5"
        />

        {/* Compartment Label: Workspace B */}
        <text
          x="80"
          y="25"
          textAnchor="middle"
          fill="#737373"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="600"
        >
          Workspace B
        </text>

        {/* Internal Technical Dots and Plus */}
        <circle cx="25" cy="50" r="1" fill="#b8b8b8" opacity="0.6" />
        <circle cx="135" cy="50" r="1" fill="#b8b8b8" opacity="0.6" />
        <g stroke="#b8b8b8" strokeWidth="0.8" opacity="0.5">
          <line x1="130" y1="90" x2="134" y2="90" />
          <line x1="132" y1="88" x2="132" y2="92" />
        </g>

        {/* 1. Folded Paper Document */}
        <g transform="translate(18, 48)">
          <path d="M 0 0 L 32 0 L 42 10 L 42 56 L 0 56 Z" fill="#ffffff" stroke="#737373" strokeWidth="1.2" />
          <path d="M 32 0 L 32 10 L 42 10 Z" fill="#f0f0f0" stroke="#737373" strokeWidth="1.2" />
          <line x1="6" y1="18" x2="34" y2="18" stroke="#a3a3a3" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="6" y1="28" x2="28" y2="28" stroke="#a3a3a3" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="6" y1="38" x2="32" y2="38" stroke="#d4d4d4" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="6" y1="46" x2="24" y2="46" stroke="#d4d4d4" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* 2. Database Cylinder */}
        <g transform="translate(100, 52)" stroke="#737373" strokeWidth="1.2" fill="#ffffff">
          <ellipse cx="18" cy="8" rx="18" ry="6" />
          <path d="M 0 8 L 0 20 C 0 26, 36 26, 36 20 L 36 8" />
          <path d="M 0 20 L 0 32 C 0 38, 36 38, 36 32 L 36 20" />
          <path d="M 0 32 L 0 44 C 0 50, 36 50, 36 44 L 36 32" />
        </g>

        {/* 3. Message Bubble */}
        <g transform="translate(20, 140)" stroke="#737373" strokeWidth="1.2" fill="#ffffff">
          <path d="M 0 0 L 38 0 C 42 0, 42 4, 42 4 L 42 24 C 42 28, 38 28, 38 28 L 12 28 L 4 35 L 6 28 L 0 28 C 0 28, 0 0, 0 0 Z" />
          <line x1="8" y1="10" x2="32" y2="10" stroke="#a3a3a3" strokeWidth="1.2" />
          <line x1="8" y1="18" x2="26" y2="18" stroke="#a3a3a3" strokeWidth="1.2" />
        </g>

        {/* 4. Gray Request Node */}
        <g transform="translate(98, 146)">
          <rect x="0" y="0" width="38" height="38" rx="5" fill="#ffffff" stroke="#737373" strokeWidth="1.3" />
          <text x="19" y="24" textAnchor="middle" fill="#737373" fontSize="14" fontFamily="monospace" fontWeight="bold">
            &#123; &#125;
          </text>
        </g>

        {/* Internal Gray Dotted Paths */}
        <path
          d="M 40 106 C 40 135, 80 145, 98 165"
          fill="none"
          stroke="#a3a3a3"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />
        <path
          d="M 118 104 C 118 120, 118 135, 118 146"
          fill="none"
          stroke="#a3a3a3"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
        />
      </g>
    </svg>
  );
}

// =========================================================================
// Cell 4 Artwork: Key -> Locked Credential Document
// =========================================================================
function Cell4Illustration({ isAnimating }: { isAnimating: boolean }) {
  const dots = [
    { x: 40, y: 25 }, { x: 180, y: 20 }, { x: 340, y: 25 },
    { x: 30, y: 110 }, { x: 220, y: 115 }, { x: 380, y: 105 }
  ];
  const pluses = [
    { x: 130, y: 25 }, { x: 370, y: 35 }, { x: 350, y: 95 }
  ];

  return (
    <svg
      viewBox="0 0 420 130"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Cryptographic key connected to locked encrypted API credential document"
    >
      {/* Background Particles */}
      <g opacity="0.5">
        {dots.map((d, i) => (
          <circle key={`c4-d-${i}`} cx={d.x} cy={d.y} r="1" fill="#b8b8b8" />
        ))}
        {pluses.map((p, i) => (
          <g key={`c4-p-${i}`} stroke="#b8b8b8" strokeWidth="0.8">
            <line x1={p.x - 2.5} y1={p.y} x2={p.x + 2.5} y2={p.y} />
            <line x1={p.x} y1={p.y - 2.5} x2={p.x + 2.5} y2={p.y + 2.5} />
          </g>
        ))}
      </g>

      {/* LEFT: CUSTOM OUTLINE KEY */}
      <g id="outline-key" transform="translate(60, 40)" stroke="#262626" strokeWidth="1.5" fill="#ffffff">
        {/* Key Bow (Circular Head) */}
        <circle cx="20" cy="20" r="18" />
        <circle cx="20" cy="20" r="7" strokeWidth="1.2" />

        {/* Key Shaft & Geometric Teeth */}
        <path
          d="M 38 16 L 85 16 L 85 24 L 78 24 L 78 28 L 72 28 L 72 24 L 66 24 L 66 27 L 61 27 L 61 24 L 38 24 Z"
          fill="#ffffff"
          strokeLinejoin="round"
        />
      </g>

      {/* Dotted Connector between Key and Credential */}
      <g fill="none">
        <path
          d="M 155 60 C 205 60, 240 70, 290 70"
          stroke="#fa5d19"
          strokeWidth="1.4"
          strokeDasharray="3 3.5"
        />
        {/* Small Orange Square Packet in Transit */}
        <rect
          x={isAnimating ? 280 : 225}
          y="62.5"
          width="5"
          height="5"
          fill="#fa5d19"
          className="transition-all duration-700 ease-out"
        />
      </g>

      {/* RIGHT: LOCKED CREDENTIAL DOCUMENT */}
      <g id="credential-doc" transform="translate(290, 15)">
        {/* Document Sheet with Dog-Ear */}
        <path
          d="M 0 0 L 52 0 L 68 16 L 68 86 L 0 86 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        {/* Dog-ear fold */}
        <path
          d="M 52 0 L 52 16 L 68 16 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />

        {/* Small Padlock Icon on Document */}
        <g transform="translate(24, 18)" stroke="#262626" strokeWidth="1.2" fill="none">
          {/* Shackle */}
          <path d="M 4 8 L 4 4 C 4 0, 14 0, 14 4 L 14 8" strokeLinecap="round" />
          {/* Padlock Body */}
          <rect x="0" y="8" width="18" height="13" rx="2" fill="#ffffff" />
          {/* Keyhole */}
          <circle cx="9" cy="13" r="1.5" fill="#262626" />
          <line x1="9" y1="14" x2="9" y2="18" strokeLinecap="round" />
        </g>

        {/* Label: API_KEY */}
        <text
          x="34"
          y="49"
          textAnchor="middle"
          fill="#262626"
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="600"
        >
          API_KEY
        </text>

        {/* Masked Secret Dots (Orange) */}
        <g fill="#fa5d19">
          <circle cx="16" cy="62" r="2.2" />
          <circle cx="25" cy="62" r="2.2" />
          <circle cx="34" cy="62" r="2.2" />
          <circle cx="43" cy="62" r="2.2" />
          <circle cx="52" cy="62" r="2.2" />
        </g>

        {/* Short Orange Underline */}
        <line x1="14" y1="70" x2="54" y2="70" stroke="#fa5d19" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// =========================================================================
// Main FeatureGrid Component: Integrated 2x2 Grid with Shared Dividers
// =========================================================================
export function FeatureGrid() {
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
      id="platform"
      ref={sectionRef}
      className="w-full bg-[#f9f9f9] text-[#262626] border-t border-[#dedede] pt-12 pb-20 sm:pt-16 sm:pb-24 overflow-hidden"
    >
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Monospace Section Label */}
        <div className="pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          03 / PLATFORM CAPABILITIES
        </div>

        {/* Thin Horizontal Rule */}
        <div className="w-full h-px bg-[#dedede]" />

        {/* Heading Row: Two-Line Heading on Left + Supporting Paragraph on Right */}
        <div className="pt-8 pb-12 sm:pb-16 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-medium tracking-tight text-[#262626] leading-[1.08] max-w-xl">
            The pieces behind
            <br />
            a useful agent.
          </h2>

          <p className="text-base sm:text-lg text-[#666666] leading-relaxed max-w-md lg:text-left pt-2 lg:pt-3">
            Knowledge, tools, versioned releases, and workspace controls &mdash; connected in one runtime.
          </p>
        </div>

        {/* Integrated 2x2 Grid with Shared Center Dividers (No outer box or floating cards) */}
        <div className="border-t border-[#dedede] grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#dedede]">
          {/* ================= CELL 1 (TOP-LEFT): Knowledge + API tools ================= */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between md:border-b border-[#dedede] min-h-[300px]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Text: 42% */}
              <div className="lg:col-span-5">
                <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-[#262626]">
                  Knowledge + API tools
                </h3>
                <p className="mt-3 text-sm sm:text-base text-[#666666] leading-relaxed font-normal">
                  Retrieve company context. Call the APIs your agent is allowed to use.
                </p>
              </div>

              {/* Illustration: 58% */}
              <div className="lg:col-span-7 flex justify-center items-center">
                <Cell1Illustration isAnimating={isAnimating} />
              </div>
            </div>
          </div>

          {/* ================= CELL 2 (TOP-RIGHT): Published versions ================= */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between md:border-b border-[#dedede] min-h-[300px]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Text: 42% */}
              <div className="lg:col-span-5">
                <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-[#262626]">
                  Published versions
                </h3>
                <p className="mt-3 text-sm sm:text-base text-[#666666] leading-relaxed font-normal">
                  Keep editing the draft. Run conversations against a frozen release.
                </p>
              </div>

              {/* Illustration: 58% */}
              <div className="lg:col-span-7 flex justify-center items-center">
                <Cell2Illustration isAnimating={isAnimating} />
              </div>
            </div>
          </div>

          {/* ================= CELL 3 (BOTTOM-LEFT): Workspace boundaries ================= */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[300px]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Text: 42% */}
              <div className="lg:col-span-5">
                <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-[#262626]">
                  Workspace boundaries
                </h3>
                <p className="mt-3 text-sm sm:text-base text-[#666666] leading-relaxed font-normal">
                  Scope knowledge, conversations, and permissions to each workspace.
                </p>
              </div>

              {/* Illustration: 58% */}
              <div className="lg:col-span-7 flex justify-center items-center">
                <Cell3Illustration isAnimating={isAnimating} />
              </div>
            </div>
          </div>

          {/* ================= CELL 4 (BOTTOM-RIGHT): Secrets + access roles ================= */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[300px]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Text: 42% */}
              <div className="lg:col-span-5">
                <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-[#262626]">
                  Secrets + access roles
                </h3>
                <p className="mt-3 text-sm sm:text-base text-[#666666] leading-relaxed font-normal">
                  Store encrypted credentials. Control what each workspace role can do.
                </p>
              </div>

              {/* Illustration & Permission Matrix: 58% */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                {/* Top: Key & Credential SVG */}
                <div className="w-full mb-3">
                  <Cell4Illustration isAnimating={isAnimating} />
                </div>

                {/* Bottom: Semantic HTML Permission Matrix */}
                <div className="w-full pt-2">
                  <div className="text-[11px] font-mono text-[#737373] mb-2 uppercase tracking-wider">
                    Example permissions
                  </div>

                  <table className="w-full text-xs font-mono border-t border-[#dedede]">
                    <thead>
                      <tr className="border-b border-[#dedede] text-[#737373]">
                        <th className="py-1.5 text-left font-normal">Role</th>
                        <th className="py-1.5 text-center font-normal w-20">Read</th>
                        <th className="py-1.5 text-center font-normal w-20">Write</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f0f0]">
                      <tr>
                        <td className="py-2 text-[#262626] font-medium">Owner</td>
                        <td className="py-2 text-center text-[#fa5d19]">
                          <span aria-hidden="true">&#9679;</span>
                          <span className="sr-only">Allowed</span>
                        </td>
                        <td className="py-2 text-center text-[#fa5d19]">
                          <span aria-hidden="true">&#9679;</span>
                          <span className="sr-only">Allowed</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-[#262626] font-medium">Admin</td>
                        <td className="py-2 text-center text-[#fa5d19]">
                          <span aria-hidden="true">&#9679;</span>
                          <span className="sr-only">Allowed</span>
                        </td>
                        <td className="py-2 text-center text-[#fa5d19]">
                          <span aria-hidden="true">&#9679;</span>
                          <span className="sr-only">Allowed</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-[#262626] font-medium">Analyst</td>
                        <td className="py-2 text-center text-[#fa5d19]">
                          <span aria-hidden="true">&#9679;</span>
                          <span className="sr-only">Allowed</span>
                        </td>
                        <td className="py-2 text-center text-[#a8a8a8]">
                          <span aria-hidden="true">&mdash;</span>
                          <span className="sr-only">Denied</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Bottom Rule & Footer */}
        <div className="border-t border-[#dedede] pt-6 mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm font-mono text-[#737373]">
          <div>Built into the agent lifecycle.</div>
          <Link
            href="#architecture"
            className="inline-flex items-center gap-1 text-[#262626] hover:text-[#fa5d19] transition-colors"
          >
            <span>Explore the architecture</span>
            <span>&nearr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
