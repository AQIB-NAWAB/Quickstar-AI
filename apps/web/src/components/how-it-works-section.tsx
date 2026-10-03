"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";

interface StepConfig {
  num: string;
  title: string;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    num: "01",
    title: "Connect your knowledge",
    description: "Add your company content so answers have context.",
  },
  {
    num: "02",
    title: "Configure the agent",
    description: "Set instructions, choose a model, and connect the APIs it can use.",
  },
  {
    num: "03",
    title: "Publish a version",
    description: "Freeze the configuration and run a conversation against it.",
  },
];

// --- Background Architectural Grid & Accent Particles ---
function ProcessBackground() {
  // Deterministic technical particle and plus coordinates
  const particles = [
    { x: "3%", y: "15%" }, { x: "5%", y: "45%" }, { x: "4%", y: "80%" },
    { x: "96%", y: "20%" }, { x: "94%", y: "55%" }, { x: "97%", y: "85%" },
    { x: "7%", y: "28%" }, { x: "93%", y: "38%" }, { x: "2%", y: "65%" },
    { x: "98%", y: "70%" }
  ];
  const pluses = [
    { x: "5%", y: "30%" }, { x: "95%", y: "30%" },
    { x: "6%", y: "72%" }, { x: "94%", y: "75%" }
  ];
  const orangePoints = [
    { x: "4.5%", y: "50%" }, { x: "95.5%", y: "48%" }
  ];

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {/* Edge Architectural Grid with Center Fade Mask */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, black 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, black 100%)",
        }}
      />

      {/* Static Subtle Edge Accent Particles */}
      {particles.map((p, i) => (
        <span
          key={`bp-${i}`}
          className="absolute w-1 h-1 rounded-full bg-neutral-600 opacity-40"
          style={{ left: p.x, top: p.y }}
        />
      ))}
      {pluses.map((pm, i) => (
        <span
          key={`bplus-${i}`}
          className="absolute text-[10px] font-mono text-neutral-600 opacity-45 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pm.x, top: pm.y }}
        >
          +
        </span>
      ))}
      {orangePoints.map((op, i) => (
        <span
          key={`orange-pt-${i}`}
          className="absolute w-1 h-1 rounded-full bg-[#fa5d19] opacity-75"
          style={{ left: op.x, top: op.y }}
        />
      ))}
    </div>
  );
}

// --- Step 02 Main Artwork: Knowledge -> Agent -> API Tools ---
function Step2Illustration({ isAnimating }: { isAnimating: boolean }) {
  // Deterministic SVG particles inside illustration canvas
  const innerDots = [
    { x: 45, y: 35 }, { x: 140, y: 25 }, { x: 260, y: 40 }, { x: 380, y: 30 },
    { x: 520, y: 25 }, { x: 640, y: 35 }, { x: 750, y: 30 }, { x: 860, y: 40 },
    { x: 50, y: 120 }, { x: 360, y: 110 }, { x: 540, y: 120 }, { x: 855, y: 125 },
    { x: 40, y: 215 }, { x: 180, y: 230 }, { x: 330, y: 220 }, { x: 570, y: 225 },
    { x: 720, y: 215 }, { x: 840, y: 230 }
  ];
  const innerPluses = [
    { x: 300, y: 70 }, { x: 600, y: 65 }, { x: 490, y: 210 }, { x: 810, y: 80 }
  ];

  return (
    <svg
      viewBox="0 0 900 280"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Configuration diagram connecting Knowledge documents to Support Agent and API tools"
    >
      {/* Background Particles & Pluses */}
      <g opacity="0.45">
        {innerDots.map((d, i) => (
          <circle key={`id-${i}`} cx={d.x} cy={d.y} r="1" fill="#737373" />
        ))}
        {innerPluses.map((pm, i) => (
          <g key={`ip-${i}`} stroke="#737373" strokeWidth="0.8">
            <line x1={pm.x - 2.5} y1={pm.y} x2={pm.x + 2.5} y2={pm.y} />
            <line x1={pm.x} y1={pm.y - 2.5} x2={pm.x + 2.5} y2={pm.y + 2.5} />
          </g>
        ))}
        <circle cx="615" cy="100" r="1.5" fill="#fa5d19" />
        <circle cx="280" cy="155" r="1.5" fill="#fa5d19" />
      </g>

      {/* Dotted Vertical Axis Behind Central Agent */}
      <line
        x1="450"
        y1="20"
        x2="450"
        y2="240"
        stroke="#333333"
        strokeWidth="1"
        strokeDasharray="2 3"
      />

      {/* Curved Dotted Connecting Strands Behind Agent */}
      <g fill="none">
        {/* Upper Strand */}
        <path
          d="M 230 115 C 330 115, 360 85, 450 85 C 540 85, 570 115, 670 115"
          stroke="#404040"
          strokeWidth="1.2"
          strokeDasharray="3 3.5"
        />

        {/* Center Active Strand (Knowledge -> Agent -> Tools) */}
        <path
          d="M 230 135 C 320 135, 360 135, 450 135 C 540 135, 580 135, 670 135"
          stroke="#fa5d19"
          strokeWidth="1.4"
          strokeDasharray="3 3.5"
        />

        {/* Lower Strand */}
        <path
          d="M 230 155 C 330 155, 360 185, 450 185 C 540 185, 570 155, 670 155"
          stroke="#404040"
          strokeWidth="1.2"
          strokeDasharray="3 3.5"
        />

        {/* Traveling Orange Packets along the active strand */}
        <circle
          cx={isAnimating ? 440 : 330}
          cy="135"
          r="3"
          fill="#fa5d19"
          className="transition-all duration-700 ease-out"
        />
        <circle
          cx={isAnimating ? 660 : 570}
          cy="135"
          r="3"
          fill="#fa5d19"
          className="transition-all duration-700 ease-out"
        />
      </g>

      {/* ================= LEFT: KNOWLEDGE DOCUMENTS ================= */}
      <g id="knowledge-group" transform="translate(130, 40)">
        {/* Rear Document 3 */}
        <path
          d="M 25 -10 L 95 -10 L 115 10 L 115 140 L 25 140 Z"
          fill="#171717"
          stroke="#404040"
          strokeWidth="1.2"
        />
        {/* Middle Document 2 */}
        <path
          d="M -15 8 L 55 8 L 75 28 L 75 158 L -15 158 Z"
          fill="#171717"
          stroke="#4a4a4a"
          strokeWidth="1.2"
        />

        {/* Front Document 1 with Dog-Ear Corner */}
        <path
          d="M 0 0 L 75 0 L 95 20 L 95 165 L 0 165 Z"
          fill="#171717"
          stroke="#737373"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Dog-ear fold */}
        <path
          d="M 75 0 L 75 20 L 95 20 Z"
          fill="#242424"
          stroke="#737373"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Front Doc Content: Return policy */}
        <text
          x="12"
          y="28"
          fill="#f5f5f2"
          fontSize="10.5"
          fontFamily="monospace"
          fontWeight="500"
        >
          Return policy
        </text>

        {/* Document Content Lines */}
        <line x1="12" y1="45" x2="80" y2="45" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="58" x2="68" y2="58" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" />

        {/* Retrieved Passage Lines (Orange Highlights) */}
        <line x1="12" y1="74" x2="82" y2="74" stroke="#fa5d19" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="87" x2="72" y2="87" stroke="#fa5d19" strokeWidth="1.8" strokeLinecap="round" />

        {/* Remaining Gray Content Lines */}
        <line x1="12" y1="103" x2="78" y2="103" stroke="#484848" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="116" x2="55" y2="116" stroke="#484848" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="129" x2="74" y2="129" stroke="#484848" strokeWidth="1.5" strokeLinecap="round" />

        {/* Stage Caption: KNOWLEDGE */}
        <text
          x="47"
          y="198"
          textAnchor="middle"
          fill="#858585"
          fontSize="11"
          fontFamily="monospace"
          letterSpacing="0.08em"
        >
          KNOWLEDGE
        </text>
      </g>

      {/* ================= CENTER: SUPPORT AGENT ================= */}
      <g id="agent-group" transform="translate(398, 85)">
        {/* Outlined Agent Square with Orange Border */}
        <rect
          x="0"
          y="0"
          width="104"
          height="104"
          rx="12"
          fill="#171717"
          stroke="#fa5d19"
          strokeWidth="2"
        />

        {/* Large Orange [ ] Symbol */}
        <text
          x="52"
          y="64"
          textAnchor="middle"
          fill="#fa5d19"
          fontSize="32"
          fontFamily="monospace"
          fontWeight="bold"
        >
          [ ]
        </text>

        {/* Agent Label Below Square */}
        <text
          x="52"
          y="126"
          textAnchor="middle"
          fill="#d4d4d4"
          fontSize="13"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          Support agent
        </text>

        {/* Stage Caption: AGENT */}
        <text
          x="52"
          y="153"
          textAnchor="middle"
          fill="#858585"
          fontSize="11"
          fontFamily="monospace"
          letterSpacing="0.08em"
        >
          AGENT
        </text>
      </g>

      {/* ================= RIGHT: API TOOL DOCUMENTS ================= */}
      <g id="tools-group" transform="translate(685, 45)">
        {/* Rear Code Document */}
        <path
          d="M 30 -5 L 95 -5 L 115 15 L 115 145 L 30 145 Z"
          fill="#171717"
          stroke="#404040"
          strokeWidth="1.2"
        />
        <text x="80" y="22" fill="#525252" fontSize="13" fontFamily="monospace">
          &#123; &#125;
        </text>

        {/* Front Code Document with Dog-Ear */}
        <path
          d="M 0 15 L 75 15 L 95 35 L 95 165 L 0 165 Z"
          fill="#171717"
          stroke="#737373"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Dog-ear fold */}
        <path
          d="M 75 15 L 75 35 L 95 35 Z"
          fill="#242424"
          stroke="#737373"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Curly Braces Icon */}
        <text x="14" y="44" fill="#fa5d19" fontSize="14" fontFamily="monospace" fontWeight="600">
          &#123; &#125;
        </text>

        {/* check_order title */}
        <text
          x="14"
          y="70"
          fill="#f5f5f2"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="500"
        >
          check_order
        </text>

        {/* Divider inside code doc */}
        <line x1="14" y1="84" x2="80" y2="84" stroke="#383838" strokeWidth="1" />

        {/* Parameter: order_id */}
        <text
          x="14"
          y="102"
          fill="#858585"
          fontSize="9.5"
          fontFamily="monospace"
        >
          order_id
        </text>
        <line x1="14" y1="116" x2="65" y2="116" stroke="#484848" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="14" y1="128" x2="52" y2="128" stroke="#484848" strokeWidth="1.4" strokeLinecap="round" />

        {/* Stage Caption: API TOOLS */}
        <text
          x="47"
          y="193"
          textAnchor="middle"
          fill="#858585"
          fontSize="11"
          fontFamily="monospace"
          letterSpacing="0.08em"
        >
          API TOOLS
        </text>
      </g>
    </svg>
  );
}

// --- Step 01 Artwork: Source -> Passages -> Knowledge Store ---
function Step1Illustration({ isAnimating }: { isAnimating: boolean }) {
  return (
    <svg
      viewBox="0 0 900 280"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Knowledge ingestion diagram: Source documents chunked into passages and indexed"
    >
      <line x1="450" y1="20" x2="450" y2="240" stroke="#333333" strokeWidth="1" strokeDasharray="2 3" />

      {/* Dotted Connectors */}
      <path
        d="M 230 135 C 310 135, 340 135, 410 135"
        fill="none"
        stroke="#fa5d19"
        strokeWidth="1.4"
        strokeDasharray="3 3.5"
      />
      <circle
        cx={isAnimating ? 390 : 310}
        cy="135"
        r="3"
        fill="#fa5d19"
        className="transition-all duration-700 ease-out"
      />

      <path
        d="M 490 135 C 570 135, 600 135, 670 135"
        fill="none"
        stroke="#fa5d19"
        strokeWidth="1.4"
        strokeDasharray="3 3.5"
      />
      <circle
        cx={isAnimating ? 650 : 570}
        cy="135"
        r="3"
        fill="#fa5d19"
        className="transition-all duration-700 ease-out"
      />

      {/* LEFT: SOURCE DOCUMENT */}
      <g transform="translate(130, 45)">
        <path d="M 0 0 L 75 0 L 95 20 L 95 160 L 0 160 Z" fill="#171717" stroke="#737373" strokeWidth="1.3" />
        <path d="M 75 0 L 75 20 L 95 20 Z" fill="#242424" stroke="#737373" strokeWidth="1.3" />
        <text x="12" y="28" fill="#f5f5f2" fontSize="10.5" fontFamily="monospace">
          Return policy
        </text>
        <line x1="12" y1="46" x2="82" y2="46" stroke="#fa5d19" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="60" x2="72" y2="60" stroke="#fa5d19" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="76" x2="80" y2="76" stroke="#484848" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="90" x2="60" y2="90" stroke="#484848" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="104" x2="75" y2="104" stroke="#484848" strokeWidth="1.4" strokeLinecap="round" />
        <text x="47" y="190" textAnchor="middle" fill="#858585" fontSize="11" fontFamily="monospace" letterSpacing="0.08em">
          SOURCE
        </text>
      </g>

      {/* CENTER: CHUNKED PASSAGE STRIPS */}
      <g transform="translate(415, 65)">
        <rect x="0" y="0" width="70" height="34" rx="4" fill="#171717" stroke="#fa5d19" strokeWidth="1.5" />
        <line x1="8" y1="13" x2="62" y2="13" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="23" x2="48" y2="23" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />

        <rect x="0" y="44" width="70" height="34" rx="4" fill="#171717" stroke="#484848" strokeWidth="1.2" />
        <line x1="8" y1="57" x2="62" y2="57" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="67" x2="40" y2="67" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" />

        <rect x="0" y="88" width="70" height="34" rx="4" fill="#171717" stroke="#484848" strokeWidth="1.2" />
        <line x1="8" y1="101" x2="58" y2="101" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="111" x2="46" y2="111" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" />

        <text x="35" y="170" textAnchor="middle" fill="#858585" fontSize="11" fontFamily="monospace" letterSpacing="0.08em">
          PASSAGES
        </text>
      </g>

      {/* RIGHT: INDEXED KNOWLEDGE STORE */}
      <g transform="translate(685, 55)">
        {/* Layered Index Cards */}
        <rect x="15" y="-10" width="80" height="120" rx="6" fill="#171717" stroke="#404040" strokeWidth="1.2" />
        <rect x="8" y="0" width="80" height="120" rx="6" fill="#171717" stroke="#525252" strokeWidth="1.2" />
        <rect x="0" y="10" width="80" height="120" rx="6" fill="#171717" stroke="#737373" strokeWidth="1.4" />

        <text x="40" y="38" textAnchor="middle" fill="#f5f5f2" fontSize="10" fontFamily="monospace">
          BM25 + Vector
        </text>
        <line x1="12" y1="56" x2="68" y2="56" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="72" x2="58" y2="72" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="12" y1="88" x2="64" y2="88" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" />

        <text x="40" y="180" textAnchor="middle" fill="#858585" fontSize="11" fontFamily="monospace" letterSpacing="0.08em">
          KNOWLEDGE
        </text>
      </g>
    </svg>
  );
}

// --- Step 03 Artwork: Draft -> Published v3 -> Active Conversation ---
function Step3Illustration({ isAnimating }: { isAnimating: boolean }) {
  return (
    <svg
      viewBox="0 0 900 280"
      className="w-full h-auto overflow-visible select-none"
      aria-label="Release lifecycle: Mutable Draft separated from frozen Published v3 running active conversations"
    >
      <line x1="450" y1="20" x2="450" y2="240" stroke="#333333" strokeWidth="1" strokeDasharray="2 3" />

      {/* Connecting Path: Draft branching independently */}
      <path
        d="M 230 115 C 310 115, 340 70, 410 70"
        fill="none"
        stroke="#484848"
        strokeWidth="1.2"
        strokeDasharray="3 3.5"
      />

      {/* Primary Path: Published Release to Conversation */}
      <path
        d="M 490 135 C 570 135, 600 135, 670 135"
        fill="none"
        stroke="#fa5d19"
        strokeWidth="1.4"
        strokeDasharray="3 3.5"
      />
      <circle
        cx={isAnimating ? 650 : 570}
        cy="135"
        r="3"
        fill="#fa5d19"
        className="transition-all duration-700 ease-out"
      />

      {/* LEFT: MUTABLE DRAFT */}
      <g transform="translate(130, 45)">
        <path d="M 10 -5 L 85 -5 L 105 15 L 105 145 L 10 145 Z" fill="#171717" stroke="#404040" strokeWidth="1.2" />
        <path d="M 0 10 L 75 10 L 95 30 L 95 160 L 0 160 Z" fill="#171717" stroke="#525252" strokeWidth="1.3" strokeDasharray="3 2" />
        <text x="14" y="38" fill="#858585" fontSize="10.5" fontFamily="monospace">
          Draft (editable)
        </text>
        <line x1="14" y1="56" x2="78" y2="56" stroke="#404040" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="14" y1="70" x2="64" y2="70" stroke="#404040" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="14" y1="84" x2="72" y2="84" stroke="#404040" strokeWidth="1.4" strokeLinecap="round" />
        <text x="47" y="190" textAnchor="middle" fill="#858585" fontSize="11" fontFamily="monospace" letterSpacing="0.08em">
          EDIT
        </text>
      </g>

      {/* CENTER: PUBLISHED v3 SNAPSHOT */}
      <g transform="translate(402, 85)">
        <rect x="0" y="0" width="96" height="96" rx="10" fill="#171717" stroke="#fa5d19" strokeWidth="2" />
        <text x="48" y="58" textAnchor="middle" fill="#fa5d19" fontSize="28" fontFamily="monospace" fontWeight="bold">
          v3
        </text>
        <text x="48" y="80" textAnchor="middle" fill="#858585" fontSize="9.5" fontFamily="monospace">
          frozen snapshot
        </text>

        <text x="48" y="125" textAnchor="middle" fill="#d4d4d4" fontSize="12.5" fontFamily="sans-serif" fontWeight="500">
          Published
        </text>
        <text x="48" y="153" textAnchor="middle" fill="#858585" fontSize="11" fontFamily="monospace" letterSpacing="0.08em">
          PUBLISH
        </text>
      </g>

      {/* RIGHT: CONVERSATION RUN */}
      <g transform="translate(680, 75)">
        {/* User Turn */}
        <rect x="0" y="0" width="120" height="34" rx="4" fill="#1e1e1e" stroke="#333333" strokeWidth="1" />
        <line x1="10" y1="17" x2="80" y2="17" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" />

        {/* Assistant Turn Linked to v3 */}
        <rect x="20" y="46" width="120" height="42" rx="4" fill="#171717" stroke="#fa5d19" strokeWidth="1.2" />
        <line x1="30" y1="62" x2="110" y2="62" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="74" x2="90" y2="74" stroke="#fa5d19" strokeWidth="1.5" strokeLinecap="round" />

        <text x="70" y="163" textAnchor="middle" fill="#858585" fontSize="11" fontFamily="monospace" letterSpacing="0.08em">
          RUN
        </text>
      </g>
    </svg>
  );
}

// --- Main HowItWorksSection Component ---
export function HowItWorksSection() {
  // Step 02 ("Configure the agent") is selected by default matching the visual specification
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const sectionRef = useRef<HTMLElement>(null);

  const handleNext = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % STEPS.length);
    triggerAnimation();
  }, []);

  const handlePrev = useCallback(() => {
    setActiveStep((prev) => (prev - 1 + STEPS.length) % STEPS.length);
    triggerAnimation();
  }, []);

  const triggerAnimation = () => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1500);
    return () => clearTimeout(timer);
  };

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    triggerAnimation();
  };

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative w-full bg-[#191919] text-[#f5f5f2] pt-14 pb-20 sm:pt-20 sm:pb-28 overflow-hidden"
    >
      {/* Background Architectural Grid with Center Fade Mask */}
      <ProcessBackground />

      <div className="relative z-10 max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Monospace Section Label */}
        <div className="flex items-center justify-between pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#858585] uppercase">
          <span>02 / HOW IT WORKS</span>
          <span className="hidden sm:inline">FROM KNOWLEDGE TO FIRST REPLY</span>
        </div>

        {/* Top Full-Width Horizontal Rule */}
        <div className="w-full h-px bg-[#333333]" />

        {/* Main Two-Line Heading */}
        <div className="pt-8 pb-12 sm:pb-16 max-w-3xl">
          <h2 className="text-4xl sm:text-5xl lg:text-[62px] font-medium tracking-tight leading-[1.08]">
            <span className="text-[#f5f5f2] block">Your knowledge. Your tools.</span>
            <span className="text-[#8a8a8a] block">One published agent.</span>
          </h2>
        </div>

        {/* Two-Column Composition: Left Steps List (32%) vs Right Panel (68%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ================= LEFT STEP LIST ================= */}
          <div className="lg:col-span-4 flex flex-col justify-between" role="tablist" aria-label="Process steps">
            <div className="divide-y divide-[#2d2d2d] border-t border-b border-[#2d2d2d]">
              {STEPS.map((step, idx) => {
                const isSelected = activeStep === idx;

                return (
                  <button
                    key={step.num}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleStepClick(idx)}
                    className="w-full text-left py-7 sm:py-8 transition-colors group focus:outline-none flex items-start gap-4"
                  >
                    {/* Number on Left */}
                    <span
                      className={`font-mono text-lg sm:text-xl font-medium shrink-0 transition-colors pt-0.5 ${
                        isSelected ? "text-[#fa5d19]" : "text-[#666666] group-hover:text-neutral-400"
                      }`}
                    >
                      {step.num}
                    </span>

                    {/* Slim Orange Vertical Marker */}
                    <div
                      className={`w-[3px] h-6 shrink-0 transition-colors mt-1 ${
                        isSelected ? "bg-[#fa5d19]" : "bg-transparent"
                      }`}
                    />

                    {/* Title and Description */}
                    <div>
                      <div
                        className={`text-lg sm:text-[22px] tracking-tight transition-colors ${
                          isSelected
                            ? "text-[#f5f5f2] font-medium"
                            : "text-[#d4d4d4] font-normal group-hover:text-white"
                        }`}
                      >
                        {step.title}
                      </div>

                      <p
                        className={`mt-2 text-sm sm:text-base leading-relaxed transition-colors ${
                          isSelected ? "text-[#ababab]" : "text-[#858585] group-hover:text-neutral-400"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step Arrow Controls */}
            <div className="flex items-center justify-between pt-5 mt-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous step"
                className="p-1 text-[#858585] hover:text-[#f5f5f2] transition-colors focus:outline-none"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="text-xs font-mono text-[#858585]">
                <span className="text-[#f5f5f2] font-medium">0{activeStep + 1}</span> / 03
              </div>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next step"
                className="p-1 text-[#858585] hover:text-[#f5f5f2] transition-colors focus:outline-none"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ================= RIGHT DEMONSTRATION PANEL ================= */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="bg-[#171717] border border-[#383838] rounded-lg p-5 sm:p-7 shadow-xl">
              {/* Panel Header */}
              <div className="flex items-center justify-between text-xs font-mono tracking-wider pb-3 border-b border-[#2d2d2d]">
                <span className="text-[#d4d4d4] font-medium">SUPPORT ASSISTANT</span>
                <span className="text-[#858585]">
                  {activeStep === 0
                    ? "Knowledge preview"
                    : activeStep === 1
                    ? "Configuration preview"
                    : "Published version preview"}
                </span>
              </div>

              {/* Step 02 Configuration Rows (Instructions & Model Profile) */}
              {activeStep === 1 && (
                <div className="mt-5 mb-4 space-y-3">
                  {/* Row 1: Instructions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm text-[#ababab] w-28 sm:w-36 shrink-0">
                      Instructions
                    </span>
                    <div className="flex-1 h-[42px] px-3.5 bg-[#141414] border border-[#333333] rounded-md text-xs sm:text-sm text-[#f5f5f2] flex items-center font-normal">
                      Answer using company policy. Check orders when needed.
                    </div>
                  </div>

                  {/* Row 2: Model profile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm text-[#ababab] w-28 sm:w-36 shrink-0">
                      Model profile
                    </span>
                    <div className="flex-1 h-[42px] px-3.5 bg-[#141414] border border-[#333333] rounded-md text-xs sm:text-sm text-[#f5f5f2] flex items-center justify-between font-normal">
                      <span>Configured provider</span>
                      <ChevronDown className="w-4 h-4 text-[#858585]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 01 Rows */}
              {activeStep === 0 && (
                <div className="mt-5 mb-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm text-[#ababab] w-28 sm:w-36 shrink-0">
                      Source document
                    </span>
                    <div className="flex-1 h-[42px] px-3.5 bg-[#141414] border border-[#333333] rounded-md text-xs sm:text-sm text-[#f5f5f2] flex items-center font-mono">
                      Return policy (PDF &amp; Markdown)
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm text-[#ababab] w-28 sm:w-36 shrink-0">
                      Ingestion index
                    </span>
                    <div className="flex-1 h-[42px] px-3.5 bg-[#141414] border border-[#333333] rounded-md text-xs sm:text-sm text-[#f5f5f2] flex items-center font-mono">
                      Hybrid BM25 + Vector embedding
                    </div>
                  </div>
                </div>
              )}

              {/* Step 03 Rows */}
              {activeStep === 2 && (
                <div className="mt-5 mb-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm text-[#ababab] w-28 sm:w-36 shrink-0">
                      Draft status
                    </span>
                    <div className="flex-1 h-[42px] px-3.5 bg-[#141414] border border-[#333333] rounded-md text-xs sm:text-sm text-[#f5f5f2] flex items-center font-mono">
                      Workspace sandbox (unrestricted edits)
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm text-[#ababab] w-28 sm:w-36 shrink-0">
                      Release snapshot
                    </span>
                    <div className="flex-1 h-[42px] px-3.5 bg-[#141414] border border-[#333333] rounded-md text-xs sm:text-sm text-[#f5f5f2] flex items-center font-mono text-[#fa5d19]">
                      v3 (Locked immutable release snapshot)
                    </div>
                  </div>
                </div>
              )}

              {/* Main SVG Artwork based on active step */}
              <div className="w-full my-2">
                {activeStep === 0 && <Step1Illustration isAnimating={isAnimating} />}
                {activeStep === 1 && <Step2Illustration isAnimating={isAnimating} />}
                {activeStep === 2 && <Step3Illustration isAnimating={isAnimating} />}
              </div>

              {/* Panel Footer */}
              <div className="border-t border-[#2d2d2d] pt-4 mt-4 grid grid-cols-2 divide-x divide-[#2d2d2d] text-xs font-mono">
                {activeStep === 1 && (
                  <>
                    <div className="pr-4">
                      <div className="text-[11px] uppercase tracking-wider text-[#858585] mb-1">
                        Enabled tool
                      </div>
                      <div className="text-[#f5f5f2] font-medium text-sm">
                        check_order
                      </div>
                    </div>

                    <div className="pl-6">
                      <div className="text-[11px] uppercase tracking-wider text-[#858585] mb-1">
                        Next step
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStepClick(2)}
                        className="text-[#fa5d19] hover:underline font-medium text-sm inline-flex items-center gap-1 focus:outline-none"
                      >
                        <span>Publish version</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </>
                )}

                {activeStep === 0 && (
                  <>
                    <div className="pr-4">
                      <div className="text-[11px] uppercase tracking-wider text-[#858585] mb-1">
                        Source content
                      </div>
                      <div className="text-[#f5f5f2] font-medium text-sm">
                        Return policy
                      </div>
                    </div>

                    <div className="pl-6">
                      <div className="text-[11px] uppercase tracking-wider text-[#858585] mb-1">
                        Next step
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStepClick(1)}
                        className="text-[#fa5d19] hover:underline font-medium text-sm inline-flex items-center gap-1 focus:outline-none"
                      >
                        <span>Configure agent</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </>
                )}

                {activeStep === 2 && (
                  <>
                    <div className="pr-4">
                      <div className="text-[11px] uppercase tracking-wider text-[#858585] mb-1">
                        Production version
                      </div>
                      <div className="text-[#fa5d19] font-medium text-sm">
                        v3 (Active release)
                      </div>
                    </div>

                    <div className="pl-6">
                      <div className="text-[11px] uppercase tracking-wider text-[#858585] mb-1">
                        Explore again
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStepClick(0)}
                        className="text-[#fa5d19] hover:underline font-medium text-sm inline-flex items-center gap-1 focus:outline-none"
                      >
                        <span>Connect knowledge</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sub-panel Muted Label */}
            <div className="text-right text-[11px] font-mono text-[#737373] mt-2 pr-1">
              Illustrative configuration
            </div>
          </div>
        </div>

        {/* Bottom Section Note */}
        <div className="w-full border-t border-[#333333] pt-6 mt-14 sm:mt-18">
          <div className="flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#fa5d19] shrink-0" />
            <p className="text-sm sm:text-base text-[#d4d4d4] font-normal leading-normal">
              Keep editing your draft. Production uses the published version.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
