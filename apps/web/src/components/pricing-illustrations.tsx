"use client";

import React from "react";

// =========================================================================
// 1. FREE PLAN ICON
// Simple orange outline circle matching the reference specification
// =========================================================================
export function FreePlanIcon({ className = "w-7 h-7 text-[#FF571A]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Free plan icon"
    >
      <circle cx="16" cy="16" r="11" />
    </svg>
  );
}

// =========================================================================
// 2. STARTER PLAN ICON
// Orange outline sprout with two leaf loops meeting at a stem
// =========================================================================
export function StarterPlanIcon({ className = "w-7 h-7 text-[#FF571A]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Starter plan icon"
    >
      {/* Vertical stem */}
      <path d="M16 16 L16 26" />
      {/* Left leaf loop */}
      <path d="M16 16 C10 16 6 15 6 12 C6 8.5 11 8.5 16 16 Z" />
      {/* Right leaf loop */}
      <path d="M16 16 C22 16 26 15 26 12 C26 8.5 21 8.5 16 16 Z" />
    </svg>
  );
}

// =========================================================================
// 3. SCALE PLAN ICON
// Orange outline stacked layers (3 isometric rhombuses)
// =========================================================================
export function ScalePlanIcon({ className = "w-7 h-7 text-[#FF571A]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Scale plan icon"
    >
      {/* Top rhombus */}
      <polygon points="16 6 26 11 16 16 6 11" />
      {/* Middle chevron */}
      <path d="M6 16 L16 21 L26 16" />
      {/* Bottom chevron */}
      <path d="M6 21 L16 26 L26 21" />
    </svg>
  );
}

// =========================================================================
// 4. ENTERPRISE PLAN ICON
// Orange outline stepped building with windows
// =========================================================================
export function EnterprisePlanIcon({ className = "w-7 h-7 text-[#FF571A]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Enterprise plan icon"
    >
      {/* Left section */}
      <path d="M6 26 V11 H15 V26" />
      {/* Right section (taller) */}
      <path d="M15 26 V6 H26 V26" />
      {/* Windows in left section */}
      <line x1="10" y1="16" x2="11" y2="16" strokeWidth="2.2" />
      <line x1="10" y1="21" x2="11" y2="21" strokeWidth="2.2" />
      {/* Windows in right section */}
      <line x1="19" y1="11" x2="22" y2="11" strokeWidth="2.2" />
      <line x1="19" y1="16" x2="22" y2="16" strokeWidth="2.2" />
      <line x1="19" y1="21" x2="22" y2="21" strokeWidth="2.2" />
    </svg>
  );
}

// Retain legacy illustration exports for backward compatibility
export { FreePlanIcon as FreePlanIllustration };
export { StarterPlanIcon as StarterPlanIllustration };
export { ScalePlanIcon as ScalePlanIllustration };
export { EnterprisePlanIcon as EnterprisePlanIllustration };
