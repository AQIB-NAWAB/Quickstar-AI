"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  CheckCircle2,
  MoreVertical,
  Plus,
  ArrowUpRight,
  X,
  Check,
  Wrench,
  Trash2,
  Eye,
} from "lucide-react";

export type StepType = "information" | "instructions" | "test";

interface DocumentItem {
  id: string;
  name: string;
  status: "Ready";
}

interface ConnectedTool {
  id: string;
  name: string;
}

interface StepMeta {
  key: StepType;
  num: string;
  title: string;
  label: string;
  heading: string;
}

const STEPS: StepMeta[] = [
  {
    key: "information",
    num: "01",
    title: "Information",
    label: "INFORMATION",
    heading: "Give your agent something to work with.",
  },
  {
    key: "instructions",
    num: "02",
    title: "Instructions",
    label: "INSTRUCTIONS",
    heading: "Give it a job.",
  },
  {
    key: "test",
    num: "03",
    title: "Test",
    label: "TEST",
    heading: "Example conversation",
  },
];

const INITIAL_DOCUMENTS: DocumentItem[] = [
  { id: "doc-1", name: "Company handbook.pdf", status: "Ready" },
  { id: "doc-2", name: "Product guide.pdf", status: "Ready" },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState<StepType>("information");

  // Local state for documents and tools (persisted across tabs in session)
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [tools, setTools] = useState<ConnectedTool[]>([]);

  // Dialog states
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isConnectToolOpen, setIsConnectToolOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [viewDetailsDoc, setViewDetailsDoc] = useState<DocumentItem | null>(null);

  // Trigger element refs for accessible focus restoration
  const addDocTriggerRef = useRef<HTMLButtonElement>(null);
  const connectToolTriggerRef = useRef<HTMLButtonElement>(null);
  const publishTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Instructions state (persisted across tab switches)
  const agentRole = "Customer support";
  const [instructionsText, setInstructionsText] = useState(
    "Help customers with product questions and orders. Use the company’s information. Ask for confirmation before taking an action.",
  );
  const [allowOrderLookup, setAllowOrderLookup] = useState(true);
  const [allowFollowUpTask, setAllowFollowUpTask] = useState(true);

  // Test state
  const [testInput, setTestInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string; source?: string }[]
  >([
    {
      role: "user",
      text: "What is your return policy?",
    },
    {
      role: "assistant",
      text: "Unopened items can be returned within 30 days with proof of purchase.",
      source: "Company handbook.pdf",
    },
  ]);

  // Tablist refs for keyboard arrow navigation
  const sideTabListRef = useRef<HTMLDivElement>(null);
  const mobileTabListRef = useRef<HTMLDivElement>(null);

  // Close menus and modals on Escape key + restore trigger focus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAddDocOpen) {
          setIsAddDocOpen(false);
          addDocTriggerRef.current?.focus();
        }
        if (isConnectToolOpen) {
          setIsConnectToolOpen(false);
          connectToolTriggerRef.current?.focus();
        }
        if (isPublishOpen) {
          setIsPublishOpen(false);
          publishTriggerRef.current?.focus();
        }
        if (viewDetailsDoc) {
          const docId = viewDetailsDoc.id;
          setViewDetailsDoc(null);
          menuTriggerRefs.current.get(docId)?.focus();
        }
        setActiveMenuDocId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAddDocOpen, isConnectToolOpen, isPublishOpen, viewDetailsDoc]);

  const dialogOpen = isAddDocOpen || isConnectToolOpen || isPublishOpen || !!viewDetailsDoc;
  useEffect(() => {
    if (!dialogOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector<HTMLElement>("[data-setup-dialog]");
    const selector = 'button:not([disabled]), input, textarea, select, a[href], [tabindex="0"]';
    dialog?.querySelector<HTMLElement>(selector)?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const elements = Array.from(dialog.querySelectorAll<HTMLElement>(selector));
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trapFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [dialogOpen]);

  // Handlers for Add Document
  const handleAddSampleDoc = () => {
    const nextCount = documents.length + 1;
    const docName =
      nextCount === 3 ? "Sample document.pdf" : `Sample document ${nextCount - 2}.pdf`;
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      name: docName,
      status: "Ready",
    };
    setDocuments((prev) => [...prev, newDoc]);
    setIsAddDocOpen(false);
    addDocTriggerRef.current?.focus();
  };

  // Handlers for Tool Toggle
  const handleToggleTool = (toolName: string) => {
    setTools((prev) => {
      const exists = prev.some((t) => t.name === toolName);
      if (exists) return prev.filter((t) => t.name !== toolName);
      return [...prev, { id: `tool-${Date.now()}`, name: toolName }];
    });
  };

  // Handlers for Document Removal
  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setActiveMenuDocId(null);
    menuTriggerRefs.current.delete(id);
  };

  // Test prompt deterministic submission
  const handleRunExample = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = testInput.trim().toLowerCase();
    if (!query) return;

    let responseText = "";
    let responseSource: string | undefined = undefined;

    if (query.includes("return") || query.includes("refund")) {
      responseText = "Unopened items can be returned within 30 days with proof of purchase.";
      responseSource = "Company handbook.pdf";
    } else if (
      query.includes("product") ||
      query.includes("guide") ||
      query.includes("install") ||
      query.includes("feature")
    ) {
      responseText =
        "QuickStartAI connects your company handbook and product documentation to intelligent agents.";
      responseSource = "Product guide.pdf";
    } else if (
      query.includes("order") ||
      query.includes("lookup") ||
      query.includes("track") ||
      query.includes("status")
    ) {
      responseText = "Orders can be retrieved using your customer order reference.";
      responseSource = "Order lookup tool";
    } else {
      responseText = "This preview supports return-policy, product, and order examples.";
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", text: testInput.trim() },
      { role: "assistant", text: responseText, source: responseSource },
    ]);
    setTestInput("");
  };

  // Vertical arrow key navigation for side tabs
  const handleVerticalTabKeyDown = (e: React.KeyboardEvent, currentStep: StepType) => {
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
    let targetIndex = currentIndex;

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % STEPS.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + STEPS.length) % STEPS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = STEPS.length - 1;
    }

    if (targetIndex !== currentIndex) {
      const nextStep = STEPS[targetIndex].key;
      setActiveStep(nextStep);
      const tabList = e.currentTarget.closest('[role="tablist"]');
      tabList?.querySelector<HTMLButtonElement>(`[data-step="${nextStep}"]`)?.focus();
    }
  };

  return (
    <section
      id="how-it-works"
      className="landing-section w-full bg-[#FAFAF8]"
    >
      <div className="landing-container">
        {/* ============================================================ */}
        {/* Two-Column Section Layout: Left Copy & Right Setup Sheet     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)] gap-10 min-[1100px]:gap-12 xl:gap-12 items-start">
          {/* ========================================================== */}
          {/* LEFT COLUMN: Eyebrow, Heading, Description, Selectors      */}
          {/* ========================================================== */}
          <div className="landing-intro flex flex-col">
            {/* Eyebrow */}
            <div className="landing-eyebrow-row">
              <span className="landing-eyebrow">
                HOW IT WORKS
              </span>
            </div>

            {/* Heading with exact desktop 3-line breaks */}
            <h2 className="landing-title">
              <span className="block">Your knowledge.</span>
              <span className="block">An agent</span>
              <span className="block">
                that <span className="text-[#FF571A]">acts.</span>
              </span>
            </h2>

            {/* Description */}
            <p className="landing-description landing-description-spaced max-w-[440px]">
              Connect your information. Give it a job.
              <span className="block">Try it before you publish.</span>
            </p>

            {/* Three Step Selectors */}
            <div
              role="region"
              aria-label="How it works step selectors"
              className="hidden min-[1100px]:flex mt-8 flex-col gap-2"
            >
              {STEPS.map((step) => {
                const isActive = activeStep === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setActiveStep(step.key)}
                    aria-current={isActive ? "step" : undefined}
                    className="flex items-center gap-6 min-h-[44px] py-1 text-left transition-colors group focus-visible:outline-2 focus-visible:outline-[#FF571A]"
                  >
                    <span
                      className={`font-mono text-[16px] sm:text-[17px] xl:text-[20px] font-medium w-7 transition-colors ${
                        isActive ? "text-[#FF571A]" : "text-[#74746F] group-hover:text-[#262626]"
                      }`}
                    >
                      {step.num}
                    </span>
                    <span
                      className={`text-[16px] sm:text-[17px] xl:text-[20px] font-medium transition-colors ${
                        isActive ? "text-[#FF571A]" : "text-[#74746F] group-hover:text-[#262626]"
                      }`}
                    >
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: Tilted Setup Sheet with Vertical Side Tabs   */}
          {/* ========================================================== */}
          <div className="w-full flex justify-center min-[1100px]:justify-end">
            {/* Unified Rotated Assembly Container */}
            <div className="w-full max-w-[840px] relative transition-transform duration-300 min-[1100px]:-rotate-[2deg] origin-top-left">
              {/* Mobile Horizontal Tabs (Attached above sheet on small screens) */}
              <div
                ref={mobileTabListRef}
                role="tablist"
                aria-label="Agent setup steps"
                className="flex min-[1100px]:hidden items-center border border-[#262626] rounded-t-[12px] overflow-hidden bg-[#FAFAF8] mb-[-1px] relative z-10"
              >
                {STEPS.map((tab) => {
                  const isActive = activeStep === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      data-step={tab.key}
                      id={`mobile-step-tab-${tab.key}`}
                      aria-selected={isActive}
                      aria-controls="setup-sheet-panel"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActiveStep(tab.key)}
                      onKeyDown={(e) => handleVerticalTabKeyDown(e, tab.key)}
                      className={`flex-1 min-h-[44px] py-2.5 px-3 text-[14px] font-semibold transition-colors text-center ${
                        isActive
                          ? "bg-[#FF571A] text-[#262626]"
                          : "text-[#74746F] hover:text-[#262626] border-r last:border-r-0 border-[#262626]/20"
                      }`}
                    >
                      {tab.title}
                    </button>
                  );
                })}
              </div>

              {/* Flex row of Sheet Body + Attached Side Tabs */}
              <div className="flex items-start">
                {/* 1. Main Sheet Surface */}
                <div
                  id="setup-sheet-panel"
                  role="tabpanel"
                  aria-label={`${STEPS.find((step) => step.key === activeStep)?.title} preview`}
                  className="flex-1 bg-white border border-[#262626] rounded-b-[12px] min-[1100px]:rounded-[12px] shadow-[0_2px_2px_rgba(0,0,0,0.06)] relative z-10 overflow-hidden flex flex-col justify-between min-h-[460px] sm:min-h-[510px] xl:min-h-[560px] min-w-0"
                >
                  {/* Top Orange Strip (clipped to rounded corners) */}
                  <div className="w-full h-[7px] bg-[#FF571A] shrink-0" />

                  {/* Sheet Header */}
                  <div className="px-6 sm:px-8 pt-6 pb-5 xl:pt-8 xl:pb-6 flex items-center gap-3.5 xl:gap-5">
                    {/* Small empty orange circle, decorative */}
                    <div
                      className="w-[22px] h-[22px] rounded-full border-[1.8px] border-[#FF571A] shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="text-[22px] sm:text-[24px] xl:text-[30px] font-bold text-[#262626] leading-tight m-0">
                        Customer support
                      </h3>
                      <p className="text-[14px] xl:text-[16px] text-[#74746F] m-0 mt-0.5">
                        Example agent
                      </p>
                    </div>
                  </div>

                  {/* Full-width fine divider beneath header */}
                  <div className="mx-6 sm:mx-8 border-b border-[#DEDED8]" />

                  {/* Dynamic State Content Body */}
                  <div className="p-6 sm:px-8 sm:py-7 flex-1 flex flex-col justify-between">
                    {/* ------------------------------------------------ */}
                    {/* STATE 1: INFORMATION                             */}
                    {/* ------------------------------------------------ */}
                    {activeStep === "information" && (
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <span className="text-[12px] sm:text-[12px] xl:text-[14px] font-semibold tracking-wider text-[#74746F] uppercase block mb-1">
                            INFORMATION
                          </span>
                          <h4 className="text-[21px] sm:text-[23px] xl:text-[28px] font-semibold text-[#262626] leading-snug mb-5 m-0">
                            Give your agent something to work with.
                          </h4>

                          {/* Document Rows */}
                          <div className="flex flex-col">
                            {documents.length === 0 ? (
                              <div className="py-6 border-b border-[#DEDED8] text-center text-[14px] text-[#74746F]">
                                No documents attached. Click below to add sample information.
                              </div>
                            ) : (
                              documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="py-3 sm:py-3.5 flex items-center justify-between border-b border-[#DEDED8] min-h-[72px] xl:min-h-[86px]"
                                >
                                  {/* Left: Document icon in neutral box + filename */}
                                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                                    <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-[8px] bg-[#F4F4F0] flex items-center justify-center shrink-0 text-[#262626]">
                                      <FileText className="w-6 h-6 xl:w-7 xl:h-7 stroke-[1.5]" />
                                    </div>
                                    <span className="min-w-0 text-[15px] sm:text-[16px] xl:text-[18px] font-normal text-[#262626] [overflow-wrap:anywhere] sm:truncate">
                                      {doc.name}
                                    </span>
                                  </div>

                                  {/* Right: Green check + Ready + Ellipsis menu */}
                                  <div className="flex items-center gap-3.5 shrink-0">
                                    <div className="inline-flex items-center gap-1.5">
                                      <CheckCircle2 className="w-5 h-5 xl:w-6 xl:h-6 text-[#16A34A] stroke-[2] shrink-0" />
                                      <span className="text-[14px] sm:text-[14px] xl:text-[16px] text-[#74746F] font-normal">
                                        {doc.status}
                                      </span>
                                    </div>

                                    <div className="relative">
                                      <button
                                        ref={(el) => {
                                          if (el) menuTriggerRefs.current.set(doc.id, el);
                                          else menuTriggerRefs.current.delete(doc.id);
                                        }}
                                        type="button"
                                        aria-label={`Options for ${doc.name}`}
                                        aria-expanded={activeMenuDocId === doc.id}
                                        aria-haspopup="true"
                                        onClick={() =>
                                          setActiveMenuDocId((curr) =>
                                            curr === doc.id ? null : doc.id,
                                          )
                                        }
                                        className="h-11 w-11 inline-flex items-center justify-center rounded hover:bg-neutral-100 text-[#74746F] transition-colors focus-visible:outline-2 focus-visible:outline-[#FF571A]"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>

                                      {/* Dropdown menu */}
                                      {activeMenuDocId === doc.id && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#DEDED8] rounded-[8px] shadow-lg py-1 z-30">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setViewDetailsDoc(doc);
                                              setActiveMenuDocId(null);
                                            }}
                                            className="w-full px-3 py-1.5 text-left text-[13px] text-[#262626] hover:bg-[#FAFAF8] flex items-center gap-2"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-[#74746F]" />
                                            <span>View example details</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveDoc(doc.id)}
                                            className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Remove from preview</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Connected Tools Chips */}
                          {tools.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-3">
                              {tools.map((t) => (
                                <span
                                  key={t.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] bg-[#FAFAF8] text-[#262626] border border-[#DEDED8] font-medium"
                                >
                                  <Wrench className="w-3 h-3 text-[#FF571A]" />
                                  <span>{t.name}</span>
                                  <button
                                    type="button"
                                    aria-label={`Disconnect ${t.name}`}
                                    onClick={() => handleToggleTool(t.name)}
                                    className="hover:opacity-75 focus-visible:outline-none"
                                  >
                                    <X className="w-3 h-3 text-[#74746F]" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Actions Row */}
                          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                            <button
                              ref={addDocTriggerRef}
                              type="button"
                              onClick={() => setIsAddDocOpen(true)}
                              className="inline-flex items-center gap-2 h-[48px] px-4 xl:px-5 rounded-[8px] border border-[#262626] bg-white text-[14px] xl:text-[16px] font-medium text-[#262626] hover:bg-neutral-50 transition-colors focus-visible:outline-2 focus-visible:outline-[#FF571A]"
                            >
                              <Plus className="w-4 h-4 stroke-[2.2]" />
                              <span>Add a document</span>
                            </button>

                            <button
                              ref={connectToolTriggerRef}
                              type="button"
                              onClick={() => setIsConnectToolOpen(true)}
                              className="inline-flex items-center gap-1.5 text-[14px] xl:text-[16px] font-medium text-[#262626] hover:text-[#FF571A] transition-colors py-2 focus-visible:outline-2 focus-visible:outline-[#FF571A]"
                            >
                              <span>Connect a tool</span>
                              <ArrowUpRight className="w-4 h-4 stroke-[2]" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Note */}
                        <div className="pt-6 mt-4">
                          <p className="text-[13px] sm:text-[13px] xl:text-[14px] text-[#74746F] m-0">
                            Preview uses example information
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------ */}
                    {/* STATE 2: INSTRUCTIONS                           */}
                    {/* ------------------------------------------------ */}
                    {activeStep === "instructions" && (
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <span className="text-[12px] sm:text-[12px] xl:text-[14px] font-semibold tracking-wider text-[#74746F] uppercase block mb-1">
                            INSTRUCTIONS
                          </span>
                          <h4 className="text-[21px] sm:text-[23px] xl:text-[28px] font-semibold text-[#262626] leading-snug mb-4 m-0">
                            Give it a job.
                          </h4>

                          {/* Role Header */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-[13px] font-medium text-[#74746F]">Role:</span>
                            <span className="px-2.5 py-1 rounded-[6px] bg-[#F4F4F0] border border-[#DEDED8] text-[13px] font-semibold text-[#262626]">
                              {agentRole}
                            </span>
                          </div>

                          {/* Instructions Textarea */}
                          <div className="flex flex-col gap-1.5 mb-4">
                            <label
                              htmlFor="instructions-field"
                              className="text-[13px] font-semibold text-[#262626]"
                            >
                              Instructions
                            </label>
                            <textarea
                              id="instructions-field"
                              rows={3}
                              value={instructionsText}
                              onChange={(e) => setInstructionsText(e.target.value)}
                              className="w-full min-h-[86px] p-3 rounded-[8px] border border-[#DEDED8] bg-white text-[14px] text-[#262626] leading-relaxed focus:outline-none focus:border-[#FF571A] focus:ring-1 focus:ring-[#FF571A] transition-colors resize-none"
                            />
                          </div>

                          {/* Allowed Actions Toggles */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <button
                              type="button"
                              aria-pressed={allowOrderLookup}
                              onClick={() => setAllowOrderLookup((p) => !p)}
                              className={`px-3.5 py-2.5 rounded-[8px] border text-left flex items-center justify-between transition-colors min-h-[44px] ${
                                allowOrderLookup
                                  ? "border-[#262626] bg-[#FAFAF8] text-[#262626]"
                                  : "border-[#DEDED8] bg-white text-[#74746F]"
                              }`}
                            >
                              <span className="text-[13.5px] font-medium">Look up an order</span>
                              <div
                                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center ${
                                  allowOrderLookup
                                    ? "bg-[#FF571A] border-[#FF571A] text-white"
                                    : "border-[#DEDED8] bg-white"
                                }`}
                              >
                                {allowOrderLookup && <Check className="w-3 h-3 stroke-[2.5]" />}
                              </div>
                            </button>

                            <button
                              type="button"
                              aria-pressed={allowFollowUpTask}
                              onClick={() => setAllowFollowUpTask((p) => !p)}
                              className={`px-3.5 py-2.5 rounded-[8px] border text-left flex items-center justify-between transition-colors min-h-[44px] ${
                                allowFollowUpTask
                                  ? "border-[#262626] bg-[#FAFAF8] text-[#262626]"
                                  : "border-[#DEDED8] bg-white text-[#74746F]"
                              }`}
                            >
                              <span className="text-[13.5px] font-medium">
                                Create a follow-up task
                              </span>
                              <div
                                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center ${
                                  allowFollowUpTask
                                    ? "bg-[#FF571A] border-[#FF571A] text-white"
                                    : "border-[#DEDED8] bg-white"
                                }`}
                              >
                                {allowFollowUpTask && <Check className="w-3 h-3 stroke-[2.5]" />}
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Bottom Note */}
                        <div className="pt-4">
                          <p className="text-[13px] sm:text-[13px] xl:text-[14px] text-[#74746F] m-0">
                            Changes apply to this preview only.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------ */}
                    {/* STATE 3: TEST                                    */}
                    {/* ------------------------------------------------ */}
                    {activeStep === "test" && (
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-[12px] sm:text-[12px] xl:text-[14px] font-semibold tracking-wider text-[#74746F] uppercase block mb-0.5">
                                TEST
                              </span>
                              <h4 className="text-[20px] sm:text-[22px] font-semibold text-[#262626] leading-snug m-0">
                                Example conversation
                              </h4>
                            </div>

                            <button
                              ref={publishTriggerRef}
                              type="button"
                              onClick={() => setIsPublishOpen(true)}
                              className="inline-flex items-center h-[34px] px-3.5 rounded-[6px] border border-[#FF571A] text-[13px] font-semibold text-[#FF571A] hover:bg-[#FF571A] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#FF571A]"
                            >
                              Publish preview
                            </button>
                          </div>

                          {/* Messages stream container */}
                          <div className="w-full bg-[#FAFAF8] rounded-[8px] p-3 flex flex-col gap-2.5 max-h-[175px] overflow-y-auto border border-[#DEDED8] mb-3.5">
                            {messages.map((m, idx) => (
                              <div
                                key={idx}
                                className={`flex flex-col ${
                                  m.role === "user" ? "items-end" : "items-start"
                                }`}
                              >
                                <div
                                  className={`p-2.5 rounded-[8px] text-[13px] leading-relaxed max-w-[85%] ${
                                    m.role === "user"
                                      ? "bg-[#262626] text-white"
                                      : "bg-white border border-[#DEDED8] text-[#262626]"
                                  }`}
                                >
                                  <p className="m-0">{m.text}</p>
                                  {m.source && (
                                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#74746F] bg-neutral-100 px-1.5 py-0.5 rounded">
                                      <FileText className="w-3 h-3" />
                                      <span>{m.source}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Input form */}
                          <form onSubmit={handleRunExample} className="flex items-center gap-2">
                            <input
                              type="text"
                              aria-label="Example question"
                              value={testInput}
                              onChange={(e) => setTestInput(e.target.value)}
                              placeholder="Ask a question (e.g. return policy, product info)..."
                              className="flex-1 min-w-0 h-[44px] px-3 rounded-[6px] border border-[#DEDED8] bg-white text-[13.5px] text-[#262626] focus:outline-none focus:border-[#FF571A] transition-colors"
                            />
                            <button
                              type="submit"
                              className="h-[44px] shrink-0 px-3 rounded-[6px] bg-[#FF571A] text-white text-[13.5px] font-semibold hover:bg-[#E04810] transition-colors focus-visible:outline-2 focus-visible:outline-[#FF571A]"
                            >
                              Run example
                            </button>
                          </form>
                        </div>

                        {/* Bottom Note */}
                        <div className="pt-4">
                          <p className="text-[13px] sm:text-[13px] xl:text-[14px] text-[#74746F] m-0">
                            Preview uses example information
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Desktop Vertical Side Tabs (Attached to right edge) */}
                <div
                  ref={sideTabListRef}
                  role="tablist"
                  aria-orientation="vertical"
                  aria-label="Agent setup steps"
                  className="hidden min-[1100px]:flex flex-col -ml-[1px] pt-[20px] z-20"
                >
                  {STEPS.map((tab) => {
                    const isActive = activeStep === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        data-step={tab.key}
                        id={`side-tab-${tab.key}`}
                        aria-selected={isActive}
                        aria-controls="setup-sheet-panel"
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => setActiveStep(tab.key)}
                        onKeyDown={(e) => handleVerticalTabKeyDown(e, tab.key)}
                        className={`w-[44px] h-[130px] xl:w-[46px] xl:h-[145px] rounded-r-[10px] border border-l-0 border-[#262626] flex items-center justify-center transition-colors relative mb-[-1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF571A] ${
                          isActive
                            ? "bg-[#FF571A] text-[#262626] z-30"
                            : "bg-[#FAFAF8] text-[#262626] hover:bg-white z-10"
                        }`}
                      >
                        <span className="[writing-mode:vertical-rl] select-none text-[13.5px] xl:text-[16px] font-medium tracking-wide">
                          {tab.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Accessible Local Modals                                      */}
      {/* ============================================================ */}

      {/* 1. Add Document Dialog */}
      {isAddDocOpen && (
        <div
          role="dialog"
          data-setup-dialog
          aria-modal="true"
          aria-labelledby="add-doc-title"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#DEDED8] rounded-[12px] p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 id="add-doc-title" className="text-[17px] font-semibold text-[#262626] m-0">
                Add a document to preview
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddDocOpen(false);
                  addDocTriggerRef.current?.focus();
                }}
                className="p-1 rounded text-[#74746F] hover:text-[#262626]"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[14px] text-[#74746F] mb-6 leading-relaxed m-0">
              This preview simulates document attachment without uploading real files. Clicking
              below will add a sample document to your workspace view.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddDocOpen(false);
                  addDocTriggerRef.current?.focus();
                }}
                className="px-4 py-2 text-[14px] font-medium text-[#74746F] hover:text-[#262626]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSampleDoc}
                className="px-4 py-2 rounded-[6px] bg-[#FF571A] text-white text-[14px] font-semibold hover:bg-[#E04810] transition-colors"
              >
                Add sample document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Connect Tool Dialog */}
      {isConnectToolOpen && (
        <div
          role="dialog"
          data-setup-dialog
          aria-modal="true"
          aria-labelledby="connect-tool-title"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#DEDED8] rounded-[12px] p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 id="connect-tool-title" className="text-[17px] font-semibold text-[#262626] m-0">
                Connect a tool
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsConnectToolOpen(false);
                  connectToolTriggerRef.current?.focus();
                }}
                className="p-1 rounded text-[#74746F] hover:text-[#262626]"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[14px] text-[#74746F] mb-5 leading-relaxed m-0">
              Enable simulated tools your preview agent can invoke to look up records or create
              tasks:
            </p>
            <div className="flex flex-col gap-2.5 mb-6">
              {["Order lookup", "Follow-up tasks"].map((toolName) => {
                const isConnected = tools.some((t) => t.name === toolName);
                return (
                  <button
                    key={toolName}
                    type="button"
                    onClick={() => handleToggleTool(toolName)}
                    className={`px-4 py-3 rounded-[8px] border text-left flex items-center justify-between transition-colors min-h-[44px] ${
                      isConnected
                        ? "border-[#FF571A] bg-[#FAFAF8]"
                        : "border-[#DEDED8] hover:border-[#74746F]"
                    }`}
                  >
                    <span className="text-[14px] xl:text-[16px] font-medium text-[#262626]">
                      {toolName}
                    </span>
                    <span
                      className={`text-[12px] font-semibold px-2 py-0.5 rounded ${
                        isConnected ? "bg-[#FF571A] text-white" : "bg-neutral-100 text-[#74746F]"
                      }`}
                    >
                      {isConnected ? "Connected" : "Connect"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsConnectToolOpen(false);
                  connectToolTriggerRef.current?.focus();
                }}
                className="px-4 py-2 rounded-[6px] bg-[#262626] text-white text-[14px] font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Publish Preview Dialog */}
      {isPublishOpen && (
        <div
          role="dialog"
          data-setup-dialog
          aria-modal="true"
          aria-labelledby="publish-dialog-title"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#DEDED8] rounded-[12px] p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3
                id="publish-dialog-title"
                className="text-[17px] font-semibold text-[#262626] m-0"
              >
                Preview complete
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsPublishOpen(false);
                  publishTriggerRef.current?.focus();
                }}
                className="p-1 rounded text-[#74746F] hover:text-[#262626]"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[14px] text-[#74746F] mb-6 leading-relaxed m-0">
              This demonstration does not publish a live agent.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsPublishOpen(false);
                  publishTriggerRef.current?.focus();
                }}
                className="px-5 py-2 rounded-[6px] bg-[#262626] text-white text-[14px] font-semibold hover:bg-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. View Document Details Dialog */}
      {viewDetailsDoc && (
        <div
          role="dialog"
          data-setup-dialog
          aria-modal="true"
          aria-labelledby="view-doc-title"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#DEDED8] rounded-[12px] p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 id="view-doc-title" className="text-[17px] font-semibold text-[#262626] m-0">
                {viewDetailsDoc.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  const docId = viewDetailsDoc.id;
                  setViewDetailsDoc(null);
                  menuTriggerRefs.current.get(docId)?.focus();
                }}
                className="p-1 rounded text-[#74746F] hover:text-[#262626]"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[14px] text-[#74746F] mb-4 leading-relaxed m-0">
              Example document attached to the workspace knowledge store. Status is{" "}
              <span className="font-semibold text-[#16A34A]">Ready</span> for agent retrieval.
            </p>
            <div className="p-3 bg-[#FAFAF8] rounded border border-[#DEDED8] text-[12.5px] text-[#74746F] mb-6 font-mono">
              Status: Ready • Vectors indexed: 42 chunks
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const docId = viewDetailsDoc.id;
                  setViewDetailsDoc(null);
                  menuTriggerRefs.current.get(docId)?.focus();
                }}
                className="px-4 py-2 rounded-[6px] bg-[#262626] text-white text-[14px] font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
