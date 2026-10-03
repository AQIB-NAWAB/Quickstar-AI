"use client";

import React from "react";

// =========================================================================
// 1. FREE PLAN ILLUSTRATION
// Single folded-corner paper document with brackets [ ] and orange highlight
// =========================================================================
export function FreePlanIllustration() {
  return (
    <svg
      viewBox="0 0 260 120"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Free plan illustration: single agent document bounded by brackets"
    >
      {/* Background Particles */}
      <g opacity="0.45" aria-hidden="true">
        <circle cx="50" cy="40" r="1.2" fill="#a8a8a8" />
        <circle cx="50" cy="55" r="1.2" fill="#a8a8a8" />
        <circle cx="210" cy="40" r="1.2" fill="#a8a8a8" />
        <circle cx="210" cy="55" r="1.2" fill="#a8a8a8" />
        <g stroke="#999999" strokeWidth="0.9">
          <line x1="65" y1="20" x2="71" y2="20" />
          <line x1="68" y1="17" x2="68" y2="23" />
          <line x1="195" y1="95" x2="201" y2="95" />
          <line x1="198" y1="92" x2="198" y2="98" />
        </g>
      </g>

      {/* Left Outer Bracket */}
      <path
        d="M 85 36 L 76 36 L 76 84 L 85 84"
        fill="none"
        stroke="#262626"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Single Document with Folded Corner */}
      <g transform="translate(102, 18)">
        <path
          d="M 0 0 L 42 0 L 54 12 L 54 84 L 0 84 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 42 0 L 42 12 L 54 12 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Content Strokes */}
        <line x1="10" y1="24" x2="44" y2="24" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="36" x2="36" y2="36" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        {/* Orange Highlight Line */}
        <line x1="10" y1="48" x2="40" y2="48" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="10" y1="60" x2="42" y2="60" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="70" x2="32" y2="70" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* Right Outer Bracket */}
      <path
        d="M 175 36 L 184 36 L 184 84 L 175 84"
        fill="none"
        stroke="#262626"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================================
// 2. STARTER PLAN ILLUSTRATION
// Three overlapping documents with orange outlined publish-arrow square
// =========================================================================
export function StarterPlanIllustration() {
  return (
    <svg
      viewBox="0 0 260 120"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Starter plan illustration: overlapping documents with publish arrow"
    >
      {/* Background Particles */}
      <g opacity="0.45" aria-hidden="true">
        <circle cx="55" cy="45" r="1.2" fill="#a8a8a8" />
        <circle cx="215" cy="45" r="1.2" fill="#a8a8a8" />
        <g stroke="#999999" strokeWidth="0.9">
          <line x1="198" y1="25" x2="204" y2="25" />
          <line x1="201" y1="22" x2="201" y2="28" />
        </g>
      </g>

      {/* Document Stack Group */}
      <g transform="translate(85, 16)">
        {/* Back Sheet 3 */}
        <path
          d="M 16 -10 L 58 -10 L 68 0 L 68 76 L 16 76 Z"
          fill="#ffffff"
          stroke="#c8c8c8"
          strokeWidth="1.1"
        />
        {/* Middle Sheet 2 */}
        <path
          d="M 8 -5 L 50 -5 L 60 5 L 60 81 L 8 81 Z"
          fill="#ffffff"
          stroke="#a0a0a0"
          strokeWidth="1.1"
        />

        {/* Front Sheet 1 (Dog-Eared) */}
        <path
          d="M 0 0 L 44 0 L 56 12 L 56 86 L 0 86 Z"
          fill="#ffffff"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 44 0 L 44 12 L 56 12 Z"
          fill="#f0f0f0"
          stroke="#262626"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Content Strokes */}
        <line x1="10" y1="22" x2="46" y2="22" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="34" x2="40" y2="34" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        {/* Orange Highlight Line */}
        <line x1="10" y1="46" x2="42" y2="46" stroke="#fa5d19" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="10" y1="58" x2="44" y2="58" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="70" x2="34" y2="70" stroke="#c0c0c0" strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* Subtle Connector to Publish Arrow */}
      <line
        x1="145"
        y1="68"
        x2="160"
        y2="68"
        stroke="#fa5d19"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />

      {/* Orange Outlined Publish-Arrow Square */}
      <g transform="translate(162, 54)">
        <rect
          x="0"
          y="0"
          width="26"
          height="26"
          rx="3.5"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.5"
        />
        {/* Diagonal Arrow ↗ */}
        <g stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="18" x2="18" y2="8" />
          <polyline points="12,8 18,8 18,14" fill="none" />
        </g>
      </g>
    </svg>
  );
}

// =========================================================================
// 3. SCALE PLAN ILLUSTRATION
// Three horizontally aligned bracket-style agent nodes over a dotted baseline
// =========================================================================
export function ScalePlanIllustration() {
  return (
    <svg
      viewBox="0 0 260 120"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Scale plan illustration: multiple agent nodes coordinating across a baseline"
    >
      {/* Background Particles */}
      <g opacity="0.45" aria-hidden="true">
        <circle cx="50" cy="30" r="1.2" fill="#a8a8a8" />
        <circle cx="210" cy="30" r="1.2" fill="#a8a8a8" />
        <g stroke="#999999" strokeWidth="0.9">
          <line x1="202" y1="28" x2="208" y2="28" />
          <line x1="205" y1="25" x2="205" y2="31" />
        </g>
      </g>

      {/* Agent Node 1 (Left) */}
      <g transform="translate(62, 36)">
        <rect x="0" y="0" width="34" height="34" rx="4" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        <text x="17" y="21" textAnchor="middle" fill="#262626" fontSize="12" fontFamily="monospace" fontWeight="600">
          [ &middot; ]
        </text>
      </g>

      {/* Agent Node 2 (Center) */}
      <g transform="translate(113, 36)">
        <rect x="0" y="0" width="34" height="34" rx="4" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        <text x="17" y="21" textAnchor="middle" fill="#262626" fontSize="12" fontFamily="monospace" fontWeight="600">
          [ &middot; ]
        </text>
      </g>

      {/* Agent Node 3 (Right) */}
      <g transform="translate(164, 36)">
        <rect x="0" y="0" width="34" height="34" rx="4" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        <text x="17" y="21" textAnchor="middle" fill="#262626" fontSize="12" fontFamily="monospace" fontWeight="600">
          [ &middot; ]
        </text>
      </g>

      {/* Dotted Baseline */}
      <line
        x1="45"
        y1="88"
        x2="215"
        y2="88"
        stroke="#8c8c8c"
        strokeWidth="1.2"
        strokeDasharray="2.5 2.5"
      />

      {/* Vertical Connectors with Orange Request Packets */}
      {/* Node 1 connector */}
      <line x1="79" y1="70" x2="79" y2="88" stroke="#8c8c8c" strokeWidth="1.2" />
      <circle cx="79" cy="88" r="2.8" fill="#fa5d19" />

      {/* Node 2 connector */}
      <line x1="130" y1="70" x2="130" y2="88" stroke="#8c8c8c" strokeWidth="1.2" />
      <circle cx="130" cy="88" r="2.8" fill="#fa5d19" />

      {/* Node 3 connector */}
      <line x1="181" y1="70" x2="181" y2="88" stroke="#8c8c8c" strokeWidth="1.2" />
      <circle cx="181" cy="88" r="2.8" fill="#fa5d19" />
    </svg>
  );
}

// =========================================================================
// 4. ENTERPRISE PLAN ILLUSTRATION
// Stepped architectural building outline with an orange key drawing
// =========================================================================
export function EnterprisePlanIllustration() {
  return (
    <svg
      viewBox="0 0 260 120"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Enterprise plan illustration: organizational building with security key"
    >
      {/* Background Particles */}
      <g opacity="0.45" aria-hidden="true">
        <circle cx="65" cy="35" r="1.2" fill="#a8a8a8" />
        <circle cx="215" cy="90" r="1.2" fill="#a8a8a8" />
        <g stroke="#999999" strokeWidth="0.9">
          <line x1="85" y1="28" x2="91" y2="28" />
          <line x1="88" y1="25" x2="88" y2="31" />
          <line x1="210" y1="36" x2="216" y2="36" />
          <line x1="213" y1="33" x2="213" y2="39" />
        </g>
      </g>

      {/* Stepped Architectural Building */}
      <g transform="translate(90, 20)">
        {/* Left Lower Tower */}
        <rect x="0" y="44" width="22" height="46" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
        <line x1="11" y1="52" x2="11" y2="76" stroke="#c0c0c0" strokeWidth="1" strokeDasharray="3 3" />

        {/* Center Tall Tower */}
        <rect x="22" y="10" width="34" height="80" fill="#ffffff" stroke="#262626" strokeWidth="1.3" />
        {/* Vertical Window Stripes */}
        <line x1="33" y1="22" x2="33" y2="74" stroke="#c0c0c0" strokeWidth="1.2" strokeDasharray="4 3" />
        <line x1="45" y1="22" x2="45" y2="74" stroke="#c0c0c0" strokeWidth="1.2" strokeDasharray="4 3" />
        {/* Central Entrance Door */}
        <rect x="34" y="80" width="10" height="10" fill="#262626" />

        {/* Right Stepped Tower */}
        <rect x="56" y="28" width="24" height="62" fill="#ffffff" stroke="#262626" strokeWidth="1.2" />
        <line x1="68" y1="38" x2="68" y2="76" stroke="#c0c0c0" strokeWidth="1" strokeDasharray="3 3" />
      </g>

      {/* Ground Line */}
      <line x1="50" y1="110" x2="210" y2="110" stroke="#8c8c8c" strokeWidth="1.2" />

      {/* Small Outlined Key Drawing on the Right */}
      <g transform="translate(182, 48)">
        <rect
          x="0"
          y="0"
          width="26"
          height="26"
          rx="3.5"
          fill="#ffffff"
          stroke="#fa5d19"
          strokeWidth="1.5"
        />
        {/* Key Glyph */}
        <g stroke="#fa5d19" strokeWidth="1.3" strokeLinecap="round" fill="none">
          <circle cx="10" cy="11" r="3.5" />
          <line x1="13.5" y1="11" x2="20" y2="17" />
          <line x1="17.5" y1="14.5" x2="19.5" y2="12.5" />
        </g>
      </g>
    </svg>
  );
}
