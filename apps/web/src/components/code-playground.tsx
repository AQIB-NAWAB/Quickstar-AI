"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, RotateCw, Check, Copy, X } from "lucide-react";

// --- Scenario Definitions ---
interface ScenarioConfig {
  id: string;
  num: string;
  title: string;
  assistantHeader: string;
  defaultPrompt: string;
  steps: string[];
  mainAnswerLine1: string;
  mainAnswerLine2: string;
  supportingText: string;
  sourceText: string;
  sourceRecordTitle: string;
  sourceRecordFields: { label: string; value: string }[];
  leftDescription: string;
  leftDocLabel: string;
  leftRecordLabel: string;
  toolName: string;
  stage1InputLabel: string;
  stage3ResultLabel: string;
  curlSnippet: string;
  fetchSnippet: string;
}

const SCENARIOS: Record<string, ScenarioConfig> = {
  api: {
    id: "api",
    num: "03",
    title: "Call your APIs",
    assistantHeader: "ORDER ASSISTANT",
    defaultPrompt: "Where is my order #1042?",
    steps: ["Read order identifier", "Call check_order", "Return delivery record"],
    mainAnswerLine1: "Your order was delivered",
    mainAnswerLine2: "14 days ago.",
    supportingText: "The delivery record shows it was received at the front porch.",
    sourceText: "Order #1042 • Delivery record",
    sourceRecordTitle: "Delivery Record · Order #1042",
    sourceRecordFields: [
      { label: "Order ID", value: "#1042" },
      { label: "Status", value: "Delivered (Signed by recipient)" },
      { label: "Delivered Age", value: "14 days ago" },
      { label: "Location", value: "Front porch" },
      { label: "Carrier", value: "FedEx Ground (FX-928104)" },
    ],
    leftDescription: "Look up an order through an API tool.\nReturn the result in the conversation.",
    leftDocLabel: "Order #1042",
    leftRecordLabel: "Delivery record",
    toolName: "check_order",
    stage1InputLabel: "order_id: 1042",
    stage3ResultLabel: "Delivered",
    curlSnippet: `curl -X POST https://GATEWAY_URL/v1/workspaces/WORKSPACE_ID/conversations/CONVERSATION_ID/turns \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: msg_8f92a1_replay" \\
  -d '{
    "message": "Where is my order #1042?"
  }'`,
    fetchSnippet: `const response = await fetch(
  "https://GATEWAY_URL/v1/workspaces/WORKSPACE_ID/conversations/CONVERSATION_ID/turns",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer ACCESS_TOKEN",
      "Content-Type": "application/json",
      "Idempotency-Key": "msg_8f92a1_replay",
    },
    body: JSON.stringify({
      message: "Where is my order #1042?",
    }),
  }
);
const data = await response.json();
console.log(data.turn.assistant_message.content);`,
  },
  support: {
    id: "support",
    num: "01",
    title: "Customer support",
    assistantHeader: "SUPPORT ASSISTANT",
    defaultPrompt: "Can I return my headphones?",
    steps: ["Verify purchase date", "Evaluate return window against policy", "Confirm packaging conditions"],
    mainAnswerLine1: "Your order is within the",
    mainAnswerLine2: "30-day return window.",
    supportingText: "The headphones must be unopened. Keep the original packaging and order confirmation.",
    sourceText: "Return policy § 3.2 • Policy document",
    sourceRecordTitle: "Return Policy § 3.2 · Headphones & Electronics",
    sourceRecordFields: [
      { label: "Policy Section", value: "§ 3.2 Return Windows" },
      { label: "Return Eligibility", value: "Active (Within 30 calendar days of delivery)" },
      { label: "Condition Required", value: "Unopened with original manufacturer packaging" },
      { label: "Proof of Purchase", value: "Order receipt or confirmation email" },
    ],
    leftDescription: "Validate customer requests against company policy.\nDraft contextual replies instantly.",
    leftDocLabel: "Return Policy",
    leftRecordLabel: "Eligibility check",
    toolName: "evaluate_policy",
    stage1InputLabel: "order: #1042 (14d ago)",
    stage3ResultLabel: "Eligible (30d window)",
    curlSnippet: `curl -X POST https://GATEWAY_URL/v1/workspaces/WORKSPACE_ID/conversations/CONVERSATION_ID/turns \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: msg_supp_01" \\
  -d '{
    "message": "Can I return my headphones?"
  }'`,
    fetchSnippet: `const response = await fetch(
  "https://GATEWAY_URL/v1/workspaces/WORKSPACE_ID/conversations/CONVERSATION_ID/turns",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer ACCESS_TOKEN",
      "Content-Type": "application/json",
      "Idempotency-Key": "msg_supp_01",
    },
    body: JSON.stringify({
      message: "Can I return my headphones?",
    }),
  }
);
const data = await response.json();
console.log(data.turn.assistant_message.content);`,
  },
  docs: {
    id: "docs",
    num: "02",
    title: "Search company docs",
    assistantHeader: "DOCS ASSISTANT",
    defaultPrompt: "What does our return policy say?",
    steps: ["Tokenize question semantics", "Query vector & BM25 indices", "Extract authoritative passage"],
    mainAnswerLine1: "Unopened items can be",
    mainAnswerLine2: "returned within 30 days.",
    supportingText: "Original packaging and proof of purchase are required for all returns.",
    sourceText: "Company wiki • Return guidelines",
    sourceRecordTitle: "Knowledge Base · Return Guidelines (rev. 2026)",
    sourceRecordFields: [
      { label: "Document", value: "kb/operations/return_guidelines.md" },
      { label: "Index Score", value: "0.96 (Hybrid Vector + BM25)" },
      { label: "Key Clause", value: "Standard 30-day return window from verified delivery" },
      { label: "Exceptions", value: "Custom engraved and opened consumable items excluded" },
    ],
    leftDescription: "Query unstructured enterprise documentation.\nExtract verified answers with citations.",
    leftDocLabel: "Docs archive",
    leftRecordLabel: "Matched citation",
    toolName: "hybrid_search",
    stage1InputLabel: "query: return policy",
    stage3ResultLabel: "Citation verified",
    curlSnippet: `curl -X POST https://GATEWAY_URL/v1/workspaces/WORKSPACE_ID/conversations/CONVERSATION_ID/turns \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: msg_docs_02" \\
  -d '{
    "message": "What does our return policy say?"
  }'`,
    fetchSnippet: `const response = await fetch(
  "https://GATEWAY_URL/v1/workspaces/WORKSPACE_ID/conversations/CONVERSATION_ID/turns",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer ACCESS_TOKEN",
      "Content-Type": "application/json",
      "Idempotency-Key": "msg_docs_02",
    },
    body: JSON.stringify({
      message: "What does our return policy say?",
    }),
  }
);
const data = await response.json();
console.log(data.turn.assistant_message.content);`,
  },
};

// --- Left Column SVG Illustration ---
function LeftIllustration({ scenario, isAnimating }: { scenario: ScenarioConfig; isAnimating: boolean }) {
  // Deterministic subtle background particles
  const particles = [
    { x: 30, y: 30 }, { x: 70, y: 18 }, { x: 160, y: 25 }, { x: 220, y: 20 }, { x: 330, y: 35 },
    { x: 15, y: 90 }, { x: 175, y: 80 }, { x: 200, y: 95 }, { x: 340, y: 90 },
    { x: 25, y: 150 }, { x: 160, y: 160 }, { x: 195, y: 175 }, { x: 330, y: 160 },
    { x: 40, y: 210 }, { x: 90, y: 215 }, { x: 150, y: 210 }, { x: 210, y: 215 }, { x: 320, y: 210 },
  ];
  const plusMarks = [
    { x: 110, y: 25 }, { x: 290, y: 40 }, { x: 45, y: 180 }, { x: 170, y: 120 }, { x: 225, y: 195 }
  ];

  return (
    <div className="w-full relative my-5 max-w-[360px] mx-auto select-none">
      <svg
        viewBox="0 0 360 230"
        className="w-full h-auto overflow-visible"
        aria-label="Order document to delivery record connection illustration"
      >
        {/* Background Subtle Particle Grid */}
        <g opacity="0.6">
          {particles.map((p, i) => (
            <circle key={`p-${i}`} cx={p.x} cy={p.y} r="1" fill="#d4d4d4" />
          ))}
          {plusMarks.map((pm, i) => (
            <g key={`pm-${i}`} stroke="#d4d4d4" strokeWidth="0.8">
              <line x1={pm.x - 2.5} y1={pm.y} x2={pm.x + 2.5} y2={pm.y} />
              <line x1={pm.x} y1={pm.y - 2.5} x2={pm.x} y2={pm.y + 2.5} />
            </g>
          ))}
        </g>

        {/* 1. Left Document: Order #1042 */}
        <g id="left-document">
          {/* Main Card with Dog-Ear corner */}
          <path
            d="M 38 42 L 108 42 L 126 60 L 126 156 L 38 156 Z"
            fill="#ffffff"
            stroke="#b8b8b8"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          {/* Dog-ear fold */}
          <path
            d="M 108 42 L 108 60 L 126 60 Z"
            fill="#f7f7f7"
            stroke="#b8b8b8"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />

          {/* Label inside document */}
          <text
            x="48"
            y="64"
            fill="#262626"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="500"
          >
            {scenario.leftDocLabel}
          </text>

          {/* Document Content Lines */}
          <line x1="48" y1="80" x2="114" y2="80" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="94" x2="104" y2="94" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="108" x2="110" y2="108" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="122" x2="90" y2="122" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" />

          {/* Orange Connection Node on Right Edge */}
          <circle cx="126" cy="100" r="3.5" fill="#fa5d19" />
        </g>

        {/* 2. Curved Dotted Connector from Document to Parcel */}
        <g id="left-connector">
          <path
            d="M 126 100 C 165 100, 185 145, 235 145"
            fill="none"
            stroke="#fa5d19"
            strokeWidth="1.4"
            strokeDasharray="3 3.5"
          />

          {/* Orange Accent Packet on Path */}
          <circle
            cx={isAnimating ? 230 : 205}
            cy={isAnimating ? 144 : 138}
            r="3"
            fill="#fa5d19"
            className="transition-all duration-700 ease-out"
          />

          {/* Tiny accent spark lines near parcel */}
          <line x1="228" y1="110" x2="234" y2="104" stroke="#fa5d19" strokeWidth="1" strokeLinecap="round" />
          <line x1="235" y1="118" x2="242" y2="116" stroke="#fa5d19" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* 3. Right Isometric Parcel Box */}
        <g id="left-parcel" transform="translate(235, 100)">
          {/* Top Face */}
          <polygon
            points="35,0 70,18 35,36 0,18"
            fill="#ffffff"
            stroke="#333333"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          {/* Top Tape Seam */}
          <line x1="17.5" y1="9" x2="52.5" y2="27" stroke="#b8b8b8" strokeWidth="1.2" />

          {/* Left Front Face */}
          <polygon
            points="0,18 35,36 35,76 0,58"
            fill="#ffffff"
            stroke="#333333"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />

          {/* Right Front Face */}
          <polygon
            points="35,36 70,18 70,58 35,76"
            fill="#ffffff"
            stroke="#333333"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />

          {/* Orange Shipping Label on Left Face */}
          <polygon
            points="22,34 32,39 32,46 22,41"
            fill="#fa5d19"
          />

          {/* Caption Underneath Parcel */}
          <text
            x="35"
            y="94"
            textAnchor="middle"
            fill="#666666"
            fontSize="10"
            fontFamily="monospace"
          >
            {scenario.leftRecordLabel}
          </text>
        </g>
      </svg>
    </div>
  );
}

// --- Main 3-Stage SVG Execution Illustration ---
function MainExecutionIllustration({
  scenario,
  isAnimating,
}: {
  scenario: ScenarioConfig;
  isAnimating: boolean;
}) {
  // Sparse technical background particles
  const dots = [
    { x: 40, y: 40 }, { x: 120, y: 25 }, { x: 210, y: 35 }, { x: 320, y: 30 }, { x: 420, y: 20 },
    { x: 530, y: 30 }, { x: 640, y: 25 }, { x: 740, y: 35 }, { x: 860, y: 40 },
    { x: 50, y: 110 }, { x: 260, y: 120 }, { x: 370, y: 100 }, { x: 570, y: 110 },
    { x: 45, y: 195 }, { x: 180, y: 205 }, { x: 280, y: 190 }, { x: 390, y: 200 },
    { x: 510, y: 190 }, { x: 620, y: 205 }, { x: 740, y: 195 }, { x: 855, y: 200 },
  ];
  const pluses = [
    { x: 310, y: 70 }, { x: 680, y: 60 }, { x: 650, y: 190 }, { x: 830, y: 90 }, { x: 140, y: 180 }
  ];

  return (
    <div className="w-full relative my-4 overflow-visible select-none">
      <svg
        viewBox="0 0 900 240"
        className="w-full h-auto overflow-visible"
        aria-label="Agent execution sequence from input document to API tool and verified result"
      >
        {/* Subtle Background Field */}
        <g opacity="0.55">
          {dots.map((d, i) => (
            <circle key={`md-${i}`} cx={d.x} cy={d.y} r="1" fill="#c7c7c7" />
          ))}
          {pluses.map((pm, i) => (
            <g key={`mp-${i}`} stroke="#c7c7c7" strokeWidth="0.8">
              <line x1={pm.x - 2.5} y1={pm.y} x2={pm.x + 2.5} y2={pm.y} />
              <line x1={pm.x} y1={pm.y - 2.5} x2={pm.x} y2={pm.y + 2.5} />
            </g>
          ))}
        </g>

        {/* ================= STAGE 1: 01 INPUT ================= */}
        <g id="stage-01-input" transform="translate(145, 30)">
          {/* Document 4 (Backmost layer) */}
          <rect x="-12" y="12" width="76" height="96" fill="#ffffff" stroke="#d4d4d4" strokeWidth="1" rx="2" />
          {/* Document 3 (Middle layer) */}
          <rect x="-6" y="6" width="76" height="96" fill="#ffffff" stroke="#d4d4d4" strokeWidth="1" rx="2" />

          {/* Document 1 (Front Document with Dog-Ear Corner) */}
          <path
            d="M 0 0 L 56 0 L 76 20 L 76 102 L 0 102 Z"
            fill="#ffffff"
            stroke="#8c8c8c"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          {/* Dog-ear fold */}
          <path
            d="M 56 0 L 56 20 L 76 20 Z"
            fill="#f7f7f7"
            stroke="#8c8c8c"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />

          {/* Front Document Text */}
          <text
            x="8"
            y="28"
            fill="#262626"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="500"
          >
            {scenario.stage1InputLabel}
          </text>

          {/* Gray content lines */}
          <line x1="8" y1="42" x2="64" y2="42" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="8" y1="54" x2="56" y2="54" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="8" y1="66" x2="62" y2="66" stroke="#d4d4d4" strokeWidth="1.4" strokeLinecap="round" />

          {/* Right Orange Connection Node */}
          <circle cx="76" cy="51" r="3.5" fill="#fa5d19" />

          {/* Stage Caption Underneath */}
          <text
            x="38"
            y="132"
            textAnchor="middle"
            fill="#8c8c8c"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="0.08em"
          >
            01 INPUT
          </text>
        </g>

        {/* Dotted Connector 1: Input -> API Tool */}
        <g id="connector-1">
          <path
            d="M 221 81 C 285 81, 335 95, 412 95"
            fill="none"
            stroke="#fa5d19"
            strokeWidth="1.4"
            strokeDasharray="3 3.5"
          />

          {/* Traveling Orange Packet */}
          <circle
            cx={isAnimating ? 405 : 325}
            cy={isAnimating ? 95 : 88}
            r="3"
            fill="#fa5d19"
            className="transition-all duration-700 ease-out"
          />
        </g>

        {/* ================= STAGE 2: 02 API TOOL ================= */}
        <g id="stage-02-tool" transform="translate(415, 60)">
          {/* Square Tool Box with Orange Outline */}
          <rect
            x="0"
            y="0"
            width="70"
            height="70"
            rx="6"
            fill="#ffffff"
            stroke="#fa5d19"
            strokeWidth="1.75"
          />

          {/* Orange Brackets Symbol [ ] */}
          <text
            x="35"
            y="43"
            textAnchor="middle"
            fill="#fa5d19"
            fontSize="22"
            fontFamily="monospace"
            fontWeight="bold"
          >
            [ ]
          </text>

          {/* Caption Directly Below Square */}
          <text
            x="35"
            y="90"
            textAnchor="middle"
            fill="#262626"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="500"
          >
            {scenario.toolName}
          </text>

          {/* Stage Caption Underneath */}
          <text
            x="35"
            y="122"
            textAnchor="middle"
            fill="#8c8c8c"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="0.08em"
          >
            02 API TOOL
          </text>
        </g>

        {/* Dotted Connector 2: API Tool -> Result */}
        <g id="connector-2">
          <path
            d="M 485 95 L 670 95"
            fill="none"
            stroke={isAnimating ? "#fa5d19" : "#a8a8a8"}
            strokeWidth="1.4"
            strokeDasharray="3 3.5"
            className="transition-colors duration-500"
          />
          {/* Arrowhead pointing to Result */}
          <polygon points="675,95 667,91 667,99" fill="#262626" />
        </g>

        {/* ================= STAGE 3: 03 RESULT ================= */}
        <g id="stage-03-result" transform="translate(685, 45)">
          {/* Behind: Line-Art Delivery Truck (Light stroke) */}
          <g id="delivery-truck" stroke="#a3a3a3" strokeWidth="1.2" fill="none">
            {/* Cargo Box */}
            <rect x="40" y="8" width="70" height="60" rx="1" fill="#fafafa" strokeLinejoin="round" />
            <line x1="40" y1="38" x2="110" y2="38" stroke="#d4d4d4" strokeWidth="0.8" />

            {/* Cab Section */}
            <path
              d="M 110 24 L 126 24 L 138 42 L 138 68 L 110 68 Z"
              fill="#fafafa"
              strokeLinejoin="round"
            />
            {/* Windshield */}
            <polygon points="113,28 123,28 132,41 113,41" stroke="#a3a3a3" strokeWidth="1" fill="#f0f0f0" />

            {/* Wheels */}
            <circle cx="65" cy="72" r="7" fill="#ffffff" stroke="#737373" strokeWidth="1.5" />
            <circle cx="65" cy="72" r="2.5" fill="#737373" />

            <circle cx="124" cy="72" r="7" fill="#ffffff" stroke="#737373" strokeWidth="1.5" />
            <circle cx="124" cy="72" r="2.5" fill="#737373" />
          </g>

          {/* Motion Lines to the left of the parcel */}
          <g stroke="#8c8c8c" strokeWidth="1" strokeLinecap="round">
            <line x1="-16" y1="36" x2="-3" y2="36" />
            <line x1="-22" y1="44" x2="-3" y2="44" />
            <line x1="-14" y1="52" x2="-3" y2="52" />
          </g>

          {/* Foreground: Isometric Parcel Box */}
          <g id="result-parcel" transform="translate(0, 18)">
            {/* Top Face */}
            <polygon
              points="35,0 70,18 35,36 0,18"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Top Seam */}
            <line x1="17.5" y1="9" x2="52.5" y2="27" stroke="#b8b8b8" strokeWidth="1.2" />

            {/* Left Front Face */}
            <polygon
              points="0,18 35,36 35,76 0,58"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />

            {/* Right Front Face */}
            <polygon
              points="35,36 70,18 70,58 35,76"
              fill="#ffffff"
              stroke="#262626"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />

            {/* Tape Band on Front Edge */}
            <line x1="35" y1="36" x2="35" y2="76" stroke="#b8b8b8" strokeWidth="1" />

            {/* Orange Badge with Checkmark */}
            <g transform="translate(68, 48)">
              <circle cx="0" cy="0" r="9" fill="#fa5d19" />
              <path
                d="M -3.5 -0.5 L -1 2 L 4 -3"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Label Underneath Parcel */}
            <text
              x="35"
              y="94"
              textAnchor="middle"
              fill="#262626"
              fontSize="12"
              fontFamily="sans-serif"
              fontWeight="600"
            >
              {scenario.stage3ResultLabel}
            </text>
          </g>

          {/* Stage Caption Underneath */}
          <text
            x="35"
            y="137"
            textAnchor="middle"
            fill="#8c8c8c"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="0.08em"
          >
            03 RESULT
          </text>
        </g>
      </svg>
    </div>
  );
}

// --- Main CodePlayground Section Component ---
export function CodePlayground() {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>("api");
  const [promptText, setPromptText] = useState<string>(SCENARIOS.api.defaultPrompt);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isDisclosureOpen, setIsDisclosureOpen] = useState<boolean>(false);
  const [showApiModal, setShowApiModal] = useState<boolean>(false);
  const [showSourceModal, setShowSourceModal] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "fetch">("curl");
  const [copied, setCopied] = useState<boolean>(false);
  const [customInputNotice, setCustomInputNotice] = useState<string>("");

  const sectionRef = useRef<HTMLElement>(null);
  const scenario = SCENARIOS[selectedScenarioKey] || SCENARIOS.api;

  // Handle switching scenario
  const handleSelectScenario = (key: string) => {
    setSelectedScenarioKey(key);
    const target = SCENARIOS[key];
    setPromptText(target.defaultPrompt);
    setCustomInputNotice("");
    triggerAnimation();
  };

  const triggerAnimation = () => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1800);
    return () => clearTimeout(timer);
  };

  const handleRunPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptText.trim() !== scenario.defaultPrompt) {
      setCustomInputNotice(`Simulated example: Demonstrating verified workflow for "${scenario.title}".`);
    } else {
      setCustomInputNotice("");
    }
    triggerAnimation();
  };

  const handleCopyCode = () => {
    const textToCopy = activeCodeTab === "curl" ? scenario.curlSnippet : scenario.fetchSnippet;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="playground"
      ref={sectionRef}
      className="w-full bg-[#f9f9f9] text-[#262626] border-t border-[#e5e5e5] pt-12 pb-20 sm:pt-16 sm:pb-24 overflow-hidden"
    >
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Monospace Meta Labels */}
        <div className="flex items-center justify-between pb-3 text-[11px] sm:text-[12px] font-mono tracking-wider text-[#737373] uppercase">
          <span>01 / TRY QUICKSTART</span>
          <span>INTERACTIVE EXAMPLE</span>
        </div>

        {/* Top Horizontal Rule */}
        <div className="w-full h-px bg-[#e5e5e5]" />

        {/* Heading Row: Large Left Heading + Right Supporting Statement */}
        <div className="pt-8 pb-12 sm:pb-16 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <h2 className="text-4xl sm:text-6xl lg:text-[76px] font-medium tracking-tight text-[#262626] leading-[1.05]">
            Give it a job.
          </h2>
          <div className="text-xl sm:text-2xl lg:text-[26px] font-normal text-[#262626] leading-snug lg:text-right pt-2 lg:pt-3">
            Company knowledge in.
            <br />
            Useful answers out.
          </div>
        </div>

        {/* Main Editorial Grid: Left Scenario (30%) + Right Demo (70%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-[#e5e5e5] divide-y lg:divide-y-0 lg:divide-x divide-[#e5e5e5]">
          {/* ================= LEFT COLUMN ================= */}
          <div className="lg:col-span-4 pt-8 lg:pr-8 pb-10 flex flex-col justify-between">
            <div>
              <div className="text-[13px] text-[#737373] mb-6 font-normal">
                Choose an example
              </div>

              {/* Unboxed Selectable Rows */}
              <div className="space-y-4" role="tablist" aria-label="Select demonstration example">
                {Object.keys(SCENARIOS).map((key) => {
                  const item = SCENARIOS[key];
                  const isSelected = item.id === scenario.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => handleSelectScenario(item.id)}
                      className="w-full text-left flex items-center justify-between group focus:outline-none transition-all py-1.5"
                    >
                      <div className="flex items-center gap-3">
                        {/* Slim Orange Vertical Marker Immediately Left of Selected Row */}
                        <div
                          className={`w-[3px] h-5 transition-colors ${
                            isSelected ? "bg-[#fa5d19]" : "bg-transparent"
                          }`}
                        />
                        <span
                          className={`font-mono text-sm sm:text-base font-medium transition-colors ${
                            isSelected ? "text-[#fa5d19]" : "text-[#737373] group-hover:text-[#262626]"
                          }`}
                        >
                          {item.num}
                        </span>
                        <span
                          className={`text-base sm:text-[19px] tracking-tight transition-colors ${
                            isSelected
                              ? "text-[#fa5d19] font-medium"
                              : "text-[#262626] group-hover:text-black font-normal"
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      {/* Right Arrow only for the Selected Row */}
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 text-[#fa5d19] shrink-0 mr-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Required Left Custom Illustration */}
              <LeftIllustration scenario={scenario} isAnimating={isAnimating} />

              {/* Explanatory Copy Below Illustration */}
              <p className="text-xs sm:text-sm text-[#525252] leading-relaxed whitespace-pre-line mt-2">
                {scenario.leftDescription}
              </p>

              {/* Understated API Request Link */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowApiModal(true)}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#262626] hover:text-[#fa5d19] transition-colors border-b border-[#fa5d19] pb-0.5"
                >
                  <span>View API request</span>
                  <span className="text-[12px] font-mono">↗</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="lg:col-span-8 pt-8 lg:pl-10 pb-10 flex flex-col justify-between">
            <div>
              {/* Right Demonstration Header */}
              <div className="flex items-center justify-between text-[11px] font-mono tracking-wider uppercase text-[#737373] mb-3">
                <span className="text-[#262626] font-medium">{scenario.assistantHeader}</span>
                <span>Example data</span>
              </div>

              {/* Fine Horizontal Rule */}
              <div className="w-full h-px bg-[#e5e5e5] mb-6" />

              {/* Prompt Composer */}
              <form onSubmit={handleRunPrompt} className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[58px] sm:h-[64px] bg-white border border-[#d4d4d4] rounded-lg px-4 sm:px-5 flex items-center transition-all focus-within:border-[#262626]">
                    <input
                      type="text"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Type a question..."
                      className="w-full bg-transparent text-base sm:text-lg font-normal text-[#262626] placeholder:text-neutral-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    aria-label="Run example"
                    className="w-[58px] h-[58px] sm:w-[64px] sm:h-[64px] bg-[#fa5d19] hover:bg-[#e04f14] active:scale-[0.98] rounded-lg flex items-center justify-center text-white transition-all shrink-0"
                  >
                    <ArrowRight className="w-6 h-6 text-white" />
                  </button>
                </div>

                {customInputNotice && (
                  <p className="mt-2 text-xs font-mono text-[#737373]">
                    {customInputNotice}
                  </p>
                )}
              </form>

              {/* Required Main 3-Stage Execution Illustration */}
              <div className="w-full">
                <MainExecutionIllustration scenario={scenario} isAnimating={isAnimating} />
              </div>

              {/* Understated Execution Disclosure Row */}
              <div className="border-t border-[#e5e5e5] pt-4 mb-6">
                <button
                  type="button"
                  onClick={() => setIsDisclosureOpen(!isDisclosureOpen)}
                  className="flex items-center gap-2 text-xs font-mono text-[#525252] hover:text-[#262626] transition-colors focus:outline-none"
                >
                  <span className="text-[10px] text-[#737373]">
                    {isDisclosureOpen ? "▲" : "▼"}
                  </span>
                  <span>Inspect execution &middot; {scenario.steps.length} steps</span>
                </button>

                {isDisclosureOpen && (
                  <div className="mt-3 pl-4 border-l border-[#fa5d19] space-y-1.5 py-1 text-xs font-mono text-[#525252]">
                    {scenario.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[#fa5d19]">0{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prominent Answer Area (Unboxed, directly on page) */}
              <div className="pt-2 pb-6">
                <div className="text-2xl sm:text-4xl lg:text-[40px] font-semibold text-[#262626] tracking-tight leading-[1.15]">
                  {scenario.mainAnswerLine1}
                  <br />
                  {scenario.mainAnswerLine2}
                </div>

                <p className="mt-3 text-sm sm:text-base text-[#525252] leading-relaxed max-w-2xl">
                  {scenario.supportingText}
                </p>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowSourceModal(true)}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#262626] hover:text-[#fa5d19] transition-colors border-b border-[#fa5d19] pb-0.5"
                  >
                    <span>{scenario.sourceText}</span>
                    <span className="text-[12px] font-mono">↗</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Metadata Bar */}
            <div className="border-t border-[#e5e5e5] pt-4 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#737373]">
              <div>Published version 3</div>

              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={triggerAnimation}
                  className="inline-flex items-center gap-1.5 text-[#fa5d19] hover:underline focus:outline-none"
                >
                  <span>Replay example</span>
                  <RotateCw className={`w-3 h-3 ${isAnimating ? "animate-spin" : ""}`} />
                </button>

                <span className="text-[#8c8c8c]">Simulated example</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= API REQUEST MODAL ================= */}
      {showApiModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl bg-white border border-[#e5e5e5] rounded-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
              <div>
                <span className="text-xs font-mono text-[#fa5d19] font-medium block">
                  GATEWAY HTTP CONTRACT
                </span>
                <h3 className="text-base font-semibold text-[#262626] mt-0.5">
                  POST /v1/workspaces/:workspaceId/conversations/:conversationId/turns
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-black transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code Tabs */}
            <div className="flex items-center justify-between my-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("curl")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeCodeTab === "curl"
                      ? "bg-[#262626] text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  cURL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("fetch")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeCodeTab === "fetch"
                      ? "bg-[#262626] text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  JavaScript (fetch)
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-border-faint rounded hover:bg-neutral-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
              {activeCodeTab === "curl" ? scenario.curlSnippet : scenario.fetchSnippet}
            </pre>

            <div className="mt-4 pt-3 border-t border-[#e5e5e5] text-[11px] font-mono text-neutral-500 flex items-center justify-between">
              <span>Authentication: Bearer JWT token</span>
              <span>Body: &#123; message: string &#125;</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= SOURCE RECORD MODAL ================= */}
      {showSourceModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-white border border-[#e5e5e5] rounded-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
              <h3 className="text-sm font-semibold text-[#262626]">
                {scenario.sourceRecordTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowSourceModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-black transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[#f0f0f0] my-3">
              {scenario.sourceRecordFields.map((field, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-mono">{field.label}</span>
                  <span className="text-neutral-900 font-medium text-right">{field.value}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#e5e5e5] text-[10px] font-mono text-neutral-400 text-center">
              Verified simulated record &middot; QuickStart AI runtime state
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
