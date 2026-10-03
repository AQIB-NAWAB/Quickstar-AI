"use client";

import { useEffect, useRef, useState } from "react";

export function HeroAgentIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[620px] lg:max-w-[660px] mx-auto flex items-center justify-center select-none"
      aria-label="Illustration of QuickStart AI agent workflow: documents and API tools connect into a support agent which runs conversations"
      role="img"
    >
      <svg
        viewBox="0 0 680 710"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-sm"
        style={{
          // Pause SVG animations when offscreen or when reduced motion is preferred
          animationPlayState: isVisible ? "running" : "paused",
        }}
      >
        <defs>
          <style>{`
            @media (prefers-reduced-motion: reduce) {
              .hero-animated-packet { display: none !important; }
              .hero-pulse-badge { animation: none !important; }
              .hero-reveal-chat { animation: none !important; }
            }
            @keyframes agentPulse {
              0%, 28% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 87, 26, 0)); }
              33%, 42% { transform: scale(1.04); filter: drop-shadow(0 4px 12px rgba(255, 87, 26, 0.4)); }
              48%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 87, 26, 0)); }
            }
            .hero-agent-core {
              transform-origin: 380px 345px;
              animation: ${isVisible ? "agentPulse 9s cubic-bezier(0.16, 1, 0.3, 1) infinite" : "none"};
            }
          `}</style>

          {/* Paths for moving packets */}
          {/* 1. Policy doc to Agent */}
          <path
            id="path-policy-to-agent"
            d="M 120 235 L 120 310 L 330 310 L 330 345"
            fill="none"
          />
          {/* 2. Returns doc to Agent */}
          <path
            id="path-returns-to-agent"
            d="M 180 185 L 180 280 L 345 280 L 345 340"
            fill="none"
          />
          {/* 3. API to Agent */}
          <path
            id="path-api-to-agent"
            d="M 505 230 L 505 290 L 415 290 L 415 345"
            fill="none"
          />
          {/* 4. Agent to Conversation */}
          <path
            id="path-agent-to-conv"
            d="M 445 405 L 530 405 L 530 480"
            fill="none"
          />
        </defs>

        {/* ============================================================== */}
        {/* 1. AMBIENT BACKGROUND: Sparse deterministic dot field & crosshairs */}
        {/* ============================================================== */}
        <g opacity="0.45" stroke="#262626" strokeWidth="0.8">
          {/* Plus crosshairs */}
          <path d="M 40 40 H 48 M 44 36 V 44" />
          <path d="M 640 40 H 648 M 644 36 V 44" />
          <path d="M 40 670 H 48 M 44 666 V 674" />
          <path d="M 640 670 H 648 M 644 666 V 674" />
          <path d="M 340 120 H 346 M 343 117 V 123" />
          <path d="M 440 40 H 446 M 443 37 V 43" />
        </g>
        <g fill="#A3A39E" opacity="0.32">
          {/* Deterministic localized dot field */}
          {[
            [70, 70], [100, 70], [130, 70],
            [320, 50], [350, 50], [380, 50], [410, 50],
            [300, 80], [330, 80], [360, 80],
            [310, 150], [340, 150], [370, 150],
            [40, 340], [70, 340], [100, 340],
            [40, 380], [70, 380], [100, 380],
            [50, 420], [80, 420], [110, 420],
            [580, 270], [610, 270], [640, 270],
            [590, 310], [620, 310], [650, 310],
            [610, 350], [640, 350],
            [120, 620], [150, 620], [180, 620],
            [130, 650], [160, 650], [190, 650],
            [640, 620], [640, 650],
          ].map(([cx, cy], i) => (
            <circle key={`dot-${i}`} cx={cx} cy={cy} r="1.5" />
          ))}
        </g>

        {/* ============================================================== */}
        {/* 2. LOWER PLATFORM LAYERS (TOOLS, KNOWLEDGE, RUNTIME) */}
        {/* ============================================================== */}
        {/* Subtle vertical corner guide lines */}
        <g stroke="#262626" strokeWidth="1" strokeDasharray="3 3" opacity="0.25">
          <line x1="230" y1="355" x2="230" y2="530" />
          <line x1="380" y1="430" x2="380" y2="605" />
          <line x1="530" y1="355" x2="530" y2="530" />
        </g>

        {/* Layer 3 (RUNTIME) - Bottom Slab */}
        <g id="layer-runtime">
          {/* Pale peach offset frame under runtime */}
          <polygon
            points="380,480 545,562 380,645 215,562"
            fill="#FFF5F0"
            stroke="#FFBCA1"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          {/* Slab top face */}
          <polygon
            points="380,455 530,530 380,605 230,530"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Slab front-left edge */}
          <polygon
            points="230,530 380,605 380,617 230,542"
            fill="#F4F4F0"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Slab front-right edge */}
          <polygon
            points="380,605 530,530 530,542 380,617"
            fill="#EAEAE5"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Front-left edge label: RUNTIME */}
          <text
            x="272"
            y="566"
            transform="rotate(26.5 272 566)"
            fill="#737373"
            fontFamily="monospace"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.08em"
          >
            RUNTIME
          </text>
        </g>

        {/* Layer 2 (KNOWLEDGE) - Middle Slab */}
        <g id="layer-knowledge">
          {/* Pale peach offset spacer */}
          <polygon
            points="380,430 540,510 380,590 220,510"
            fill="#FFF6F1"
            stroke="#FFCCB5"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.85"
          />
          {/* Slab top face */}
          <polygon
            points="380,405 530,480 380,555 230,480"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Slab front-left edge */}
          <polygon
            points="230,480 380,555 380,567 230,492"
            fill="#F4F4F0"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Slab front-right edge */}
          <polygon
            points="380,555 530,480 530,492 380,567"
            fill="#EAEAE5"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Front-left edge label: KNOWLEDGE */}
          <text
            x="264"
            y="516"
            transform="rotate(26.5 264 516)"
            fill="#737373"
            fontFamily="monospace"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.08em"
          >
            KNOWLEDGE
          </text>
        </g>

        {/* Layer 1 (TOOLS) - Upper Slab */}
        <g id="layer-tools">
          {/* Pale peach offset spacer */}
          <polygon
            points="380,380 540,460 380,540 220,460"
            fill="#FFF7F3"
            stroke="#FFD5C2"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.9"
          />
          {/* Slab top face */}
          <polygon
            points="380,355 530,430 380,505 230,430"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Slab front-left edge */}
          <polygon
            points="230,430 380,505 380,517 230,442"
            fill="#F4F4F0"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Slab front-right edge */}
          <polygon
            points="380,505 530,430 530,442 380,517"
            fill="#EAEAE5"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Front-left edge label: TOOLS */}
          <text
            x="276"
            y="466"
            transform="rotate(26.5 276 466)"
            fill="#737373"
            fontFamily="monospace"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.08em"
          >
            TOOLS
          </text>
        </g>

        {/* ============================================================== */}
        {/* 3. CENTRAL AGENT PLATFORM (TOP SLAB) */}
        {/* ============================================================== */}
        <g id="platform-top-slab">
          {/* Top face */}
          <polygon
            points="380,280 530,355 380,430 230,355"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Front-left thickness */}
          <polygon
            points="230,355 380,430 380,444 230,369"
            fill="#F5F5F2"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Front-right thickness */}
          <polygon
            points="380,430 530,355 530,369 380,444"
            fill="#EBEBE7"
            stroke="#262626"
            strokeWidth="1.5"
          />

          {/* Central Orange Accent Tile with Brackets [ ] */}
          <g className="hero-agent-core">
            {/* Orange isometric diamond tile */}
            <polygon
              points="380,312 432,338 380,364 328,338"
              fill="#FF571A"
              stroke="#E0460D"
              strokeWidth="1"
            />
            {/* 3D bevel on orange tile */}
            <polygon
              points="328,338 380,364 380,370 328,344"
              fill="#D63F0B"
            />
            <polygon
              points="380,364 432,338 432,344 380,370"
              fill="#BF3506"
            />
            {/* White bracket glyph: [ ] */}
            <text
              x="380"
              y="346"
              fill="#FFFFFF"
              fontFamily="monospace"
              fontSize="20"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
            >
              [ ]
            </text>
          </g>

          {/* Platform Label: Support agent */}
          <text
            x="380"
            y="402"
            fill="#262626"
            fontFamily="Inter, sans-serif"
            fontSize="13"
            fontWeight="600"
            textAnchor="middle"
          >
            Support agent
          </text>
        </g>

        {/* ============================================================== */}
        {/* 4. PUBLISHED VERSION TAG (v1 · Published) */}
        {/* ============================================================== */}
        <g id="published-badge">
          {/* Guide line to platform */}
          <line
            x1="520"
            y1="360"
            x2="550"
            y2="378"
            stroke="#262626"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.4"
          />
          {/* Pill container */}
          <rect
            x="546"
            y="368"
            width="96"
            height="24"
            rx="12"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.2"
          />
          {/* Status dot (green) */}
          <circle cx="560" cy="380" r="3" fill="#10B981" />
          {/* Label */}
          <text
            x="570"
            y="384"
            fill="#262626"
            fontFamily="monospace"
            fontSize="10"
            fontWeight="600"
          >
            v1 · Published
          </text>
        </g>

        {/* ============================================================== */}
        {/* 5. INPUT PATHS (ORANGE DASHED CONNECTIONS) */}
        {/* ============================================================== */}
        <g stroke="#FF571A" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.95">
          {/* From Policy doc */}
          <path d="M 120 235 L 120 310 L 330 310 L 330 345" fill="none" />
          {/* From Returns doc */}
          <path d="M 180 185 L 180 280 L 345 280 L 345 340" fill="none" />
          {/* From FAQ doc */}
          <path d="M 240 135 L 240 255 L 360 255 L 360 335" fill="none" />
          {/* From API panel */}
          <path d="M 505 230 L 505 290 L 415 290 L 415 345" fill="none" />
          {/* From Agent to Conversation Window */}
          <path d="M 445 405 L 530 405 L 530 480" fill="none" />
        </g>

        {/* Orange stubs / anchor sockets */}
        <g fill="#FF571A">
          <rect x="117" y="232" width="6" height="5" rx="1" />
          <rect x="177" y="182" width="6" height="5" rx="1" />
          <rect x="237" y="132" width="6" height="5" rx="1" />
          <rect x="502" y="227" width="6" height="5" rx="1" />
          <circle cx="445" cy="405" r="3.5" />
        </g>

        {/* ============================================================== */}
        {/* 6. ANIMATED TRAVELING PACKETS */}
        {/* ============================================================== */}
        {isVisible && (
          <g className="hero-animated-packet">
            {/* Packet 1: Policy -> Agent */}
            <rect width="10" height="7" rx="2" fill="#FF571A" stroke="#FFFFFF" strokeWidth="1">
              <animateMotion
                dur="9s"
                repeatCount="indefinite"
                keyPoints="0;0.35;0.35;1"
                keyTimes="0;0.3;0.3;1"
                calcMode="linear"
              >
                <mpath href="#path-policy-to-agent" />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;1;1;0;0"
                keyTimes="0;0.05;0.28;0.32;1"
                dur="9s"
                repeatCount="indefinite"
              />
            </rect>

            {/* Packet 2: API -> Agent */}
            <rect width="10" height="7" rx="2" fill="#FF571A" stroke="#FFFFFF" strokeWidth="1">
              <animateMotion
                dur="9s"
                repeatCount="indefinite"
                keyPoints="0;0.35;0.35;1"
                keyTimes="0;0.3;0.3;1"
                calcMode="linear"
              >
                <mpath href="#path-api-to-agent" />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;1;1;0;0"
                keyTimes="0;0.05;0.28;0.32;1"
                dur="9s"
                repeatCount="indefinite"
              />
            </rect>

            {/* Packet 3: Agent -> Conversation Window */}
            <rect width="10" height="7" rx="2" fill="#FF571A" stroke="#FFFFFF" strokeWidth="1">
              <animateMotion
                dur="9s"
                repeatCount="indefinite"
                keyPoints="0;0;0.38;0.7;0.7;1"
                keyTimes="0;0.38;0.38;0.65;0.65;1"
                calcMode="linear"
              >
                <mpath href="#path-agent-to-conv" />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;0;1;1;0;0"
                keyTimes="0;0.36;0.4;0.63;0.67;1"
                dur="9s"
                repeatCount="indefinite"
              />
            </rect>
          </g>
        )}

        {/* ============================================================== */}
        {/* 7. KNOWLEDGE DOCUMENTS (UPPER LEFT) */}
        {/* Arranged diagonally: faq.md -> returns.md -> policy.md */}
        {/* ============================================================== */}
        {/* Document 3 (Back): faq.md */}
        <g id="doc-faq">
          {/* Right depth extrusion */}
          <polygon
            points="290,40 300,45 300,165 290,160"
            fill="#E5E5E0"
            stroke="#262626"
            strokeWidth="1.4"
          />
          {/* Front sheet face */}
          <polygon
            points="210,80 290,40 290,160 210,200"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.4"
          />
          {/* Label: faq.md */}
          <text
            x="222"
            y="94"
            transform="rotate(-26.5 222 94)"
            fill="#262626"
            fontFamily="monospace"
            fontSize="10"
            fontWeight="600"
          >
            faq.md
          </text>
          {/* Pale gray text lines */}
          <line x1="222" y1="120" x2="278" y2="92" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="222" y1="136" x2="274" y2="110" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="222" y1="152" x2="266" y2="130" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="222" y1="168" x2="256" y2="151" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Document 2 (Middle): returns.md */}
        <g id="doc-returns">
          {/* Right depth extrusion */}
          <polygon
            points="230,90 240,95 240,215 230,210"
            fill="#E5E5E0"
            stroke="#262626"
            strokeWidth="1.4"
          />
          {/* Front sheet face */}
          <polygon
            points="150,130 230,90 230,210 150,250"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.4"
          />
          {/* Label: returns.md */}
          <text
            x="162"
            y="144"
            transform="rotate(-26.5 162 144)"
            fill="#262626"
            fontFamily="monospace"
            fontSize="10"
            fontWeight="600"
          >
            returns.md
          </text>
          {/* Pale gray text lines */}
          <line x1="162" y1="170" x2="218" y2="142" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="162" y1="186" x2="214" y2="160" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="162" y1="202" x2="204" y2="181" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="162" y1="218" x2="196" y2="201" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Document 1 (Front): policy.md */}
        <g id="doc-policy">
          {/* Right depth extrusion */}
          <polygon
            points="170,140 180,145 180,265 170,260"
            fill="#E5E5E0"
            stroke="#262626"
            strokeWidth="1.4"
          />
          {/* Front sheet face */}
          <polygon
            points="90,180 170,140 170,260 90,300"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.4"
          />
          {/* Label: policy.md */}
          <text
            x="102"
            y="194"
            transform="rotate(-26.5 102 194)"
            fill="#262626"
            fontFamily="monospace"
            fontSize="10"
            fontWeight="600"
          >
            policy.md
          </text>
          {/* Pale gray text lines */}
          <line x1="102" y1="220" x2="158" y2="192" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="102" y1="236" x2="154" y2="210" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="102" y1="252" x2="148" y2="229" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="102" y1="268" x2="138" y2="250" stroke="#E2E2DE" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* ============================================================== */}
        {/* 8. API CODE PANEL (UPPER RIGHT) */}
        {/* ============================================================== */}
        <g id="orders-api-panel">
          {/* Left depth extrusion */}
          <polygon
            points="465,65 475,60 475,230 465,235"
            fill="#E5E5E0"
            stroke="#262626"
            strokeWidth="1.4"
          />
          {/* Front code panel face */}
          <polygon
            points="475,60 615,130 615,300 475,230"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.4"
          />

          {/* Header tab: orders API */}
          <text
            x="490"
            y="102"
            transform="rotate(26.5 490 102)"
            fill="#262626"
            fontFamily="monospace"
            fontSize="11"
            fontWeight="700"
          >
            orders API
          </text>

          {/* Header ellipses ... */}
          <circle cx="585" cy="150" r="1.5" fill="#737373" />
          <circle cx="591" cy="153" r="1.5" fill="#737373" />
          <circle cx="597" cy="156" r="1.5" fill="#737373" />

          {/* Opening orange curly brace { */}
          <text
            x="490"
            y="126"
            transform="rotate(26.5 490 126)"
            fill="#FF571A"
            fontFamily="monospace"
            fontSize="13"
            fontWeight="700"
          >
            {"{"}
          </text>

          {/* Code method 1: getOrder(id: string) */}
          <text
            x="504"
            y="144"
            transform="rotate(26.5 504 144)"
            fill="#262626"
            fontFamily="monospace"
            fontSize="8.5"
            fontWeight="500"
          >
            getOrder(id: string)
          </text>

          {/* Code method 2: getReturns(id: string) */}
          <text
            x="504"
            y="160"
            transform="rotate(26.5 504 160)"
            fill="#262626"
            fontFamily="monospace"
            fontSize="8.5"
            fontWeight="500"
          >
            getReturns(id: string)
          </text>

          {/* Code method 3: listOrders(customerId: string) */}
          <text
            x="504"
            y="176"
            transform="rotate(26.5 504 176)"
            fill="#262626"
            fontFamily="monospace"
            fontSize="8.5"
            fontWeight="500"
          >
            listOrders(customerId: string)
          </text>

          {/* Closing orange curly brace } */}
          <text
            x="490"
            y="200"
            transform="rotate(26.5 490 200)"
            fill="#FF571A"
            fontFamily="monospace"
            fontSize="13"
            fontWeight="700"
          >
            {"}"}
          </text>
        </g>

        {/* ============================================================== */}
        {/* 9. CONVERSATION WINDOW (FOREGROUND LOWER RIGHT) */}
        {/* ============================================================== */}
        <g id="conversation-window">
          {/* Subtle 3D bottom/right depth shadow */}
          <rect
            x="368"
            y="472"
            width="264"
            height="182"
            rx="12"
            fill="#E5E5E0"
            stroke="#262626"
            strokeWidth="1.5"
          />
          {/* Front white window panel */}
          <rect
            x="364"
            y="468"
            width="264"
            height="182"
            rx="12"
            fill="#FFFFFF"
            stroke="#262626"
            strokeWidth="1.5"
          />

          {/* Window header dots */}
          <g>
            <circle cx="384" cy="486" r="3.5" fill="#EF4444" />
            <circle cx="396" cy="486" r="3.5" fill="#F59E0B" />
            <circle cx="408" cy="486" r="3.5" fill="#10B981" />
          </g>

          {/* Window header divider */}
          <line x1="364" y1="499" x2="628" y2="499" stroke="#EDEDEA" strokeWidth="1" />

          {/* User message (top right) */}
          <g id="conv-user-bubble">
            {/* Bubble */}
            <rect
              x="440"
              y="511"
              width="156"
              height="28"
              rx="14"
              fill="#F6F6F4"
              stroke="#E8E8E4"
              strokeWidth="1"
            />
            {/* Query text */}
            <text
              x="452"
              y="529"
              fill="#262626"
              fontFamily="Inter, sans-serif"
              fontSize="10"
              fontWeight="500"
            >
              Can I return order #1042?
            </text>
            {/* User avatar circle with silhouette */}
            <circle cx="609" cy="525" r="9" fill="#E8E8E4" stroke="#D8D8D4" strokeWidth="1" />
            <circle cx="609" cy="522" r="3" fill="#888885" />
            <path
              d="M 603 531 C 603 527, 615 527, 615 531"
              stroke="#888885"
              strokeWidth="1.2"
              fill="none"
            />
          </g>

          {/* Assistant Reply (lower left) */}
          <g id="conv-assistant-reply">
            {/* Orange square assistant avatar */}
            <rect
              x="380"
              y="552"
              width="24"
              height="24"
              rx="6"
              fill="#FF571A"
            />
            <text
              x="392"
              y="568"
              fill="#FFFFFF"
              fontFamily="monospace"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
            >
              [ ]
            </text>

            {/* Assistant message text */}
            <text
              x="414"
              y="566"
              fill="#262626"
              fontFamily="Inter, sans-serif"
              fontSize="11"
              fontWeight="500"
            >
              I found your order and return policy.
            </text>

            {/* Source / Tool chips */}
            <g transform="translate(414, 582)">
              {/* Chip 1: policy.md */}
              <g>
                <rect
                  x="0"
                  y="0"
                  width="78"
                  height="22"
                  rx="6"
                  fill="#F5F5F2"
                  stroke="#E2E2DE"
                  strokeWidth="1"
                />
                {/* Document icon */}
                <path
                  d="M 7 6 H 13 L 16 9 V 16 H 7 Z"
                  fill="none"
                  stroke="#737373"
                  strokeWidth="1"
                />
                <text
                  x="20"
                  y="15"
                  fill="#525252"
                  fontFamily="monospace"
                  fontSize="9.5"
                  fontWeight="500"
                >
                  policy.md
                </text>
              </g>

              {/* Chip 2: check_order */}
              <g transform="translate(86, 0)">
                <rect
                  x="0"
                  y="0"
                  width="86"
                  height="22"
                  rx="6"
                  fill="#F5F5F2"
                  stroke="#E2E2DE"
                  strokeWidth="1"
                />
                {/* Code icon </ > */}
                <text
                  x="8"
                  y="15"
                  fill="#FF571A"
                  fontFamily="monospace"
                  fontSize="10"
                  fontWeight="700"
                >
                  {"</>"}
                </text>
                <text
                  x="28"
                  y="15"
                  fill="#525252"
                  fontFamily="monospace"
                  fontSize="9.5"
                  fontWeight="500"
                >
                  check_order
                </text>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
