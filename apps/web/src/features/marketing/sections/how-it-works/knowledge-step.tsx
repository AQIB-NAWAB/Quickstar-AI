"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  UploadCloud,
  Plus,
  MoreVertical,
  Eye,
  Trash2,
  X,
  MessageSquare,
  Globe,
  RotateCcw,
} from "lucide-react";
import type { ExampleSource } from "../../content/how-it-works-steps";
import { INITIAL_SOURCES } from "../../content/how-it-works-steps";

interface KnowledgeStepProps {
  sources: ExampleSource[];
  setSources: React.Dispatch<React.SetStateAction<ExampleSource[]>>;
  isReducedMotion?: boolean;
}

export function KnowledgeStep({
  sources,
  setSources,
  isReducedMotion = false,
}: KnowledgeStepProps) {
  // Modal states
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [addMode, setAddMode] = useState<"document" | "website">("document");
  const [websiteUrl, setWebsiteUrl] = useState("https://example.com/help");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ top: 0, left: 0 });
  const [viewingSource, setViewingSource] = useState<ExampleSource | null>(null);

  // Trigger refs for focus restoration
  const addSourceTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAddSourceOpen) {
          setIsAddSourceOpen(false);
          addSourceTriggerRef.current?.focus();
        }
        if (viewingSource) {
          const srcId = viewingSource.id;
          setViewingSource(null);
          menuTriggerRefs.current.get(srcId)?.focus();
        }
        setActiveMenuId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddSourceOpen, viewingSource]);

  useEffect(() => {
    if (!activeMenuId) return;
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".hiw-source-menu-wrap, .hiw-source-dropdown")) {
        setActiveMenuId(null);
      }
    };
    const closeOnResize = () => setActiveMenuId(null);
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [activeMenuId]);

  // Dialog focus trap and background lock
  const isAnyDialogOpen = isAddSourceOpen || !!viewingSource;
  useEffect(() => {
    if (!isAnyDialogOpen) return;
    const prevActiveElement = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = document.querySelector<HTMLElement>("[data-hiw-dialog]");
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = dialog?.querySelectorAll<HTMLElement>(focusableSelector);
    focusables?.[0]?.focus();

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialog || !focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTrap);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleTrap);
      if (prevActiveElement && prevActiveElement.isConnected) {
        prevActiveElement.focus();
      }
    };
  }, [isAnyDialogOpen]);

  // Add sample document handler
  const handleAddSampleDoc = useCallback(() => {
    const nextIdx = sources.length + 1;
    const docNames = [
      "Staff onboarding guide.pdf",
      "Company FAQ and policies.pdf",
      "Operational guidelines.docx",
      "Customer service manual.txt",
    ];
    const pickedName = docNames[(nextIdx - INITIAL_SOURCES.length - 1) % docNames.length];
    const newId = `src-${Date.now()}`;

    const newSource: ExampleSource = {
      id: newId,
      name: pickedName,
      category: "Operations & HR",
      status: isReducedMotion ? "Ready" : "Queued",
      sampleSnippet:
        "Standard operating procedure: Escalate complex inquiries directly to the tier-2 support desk after confirming customer reference number.",
      isExample: true,
    };

    setSources((prev) => [...prev, newSource]);
    setIsAddSourceOpen(false);
    addSourceTriggerRef.current?.focus();

    if (!isReducedMotion) {
      // Scripted status progression: Queued -> Processing -> Ready
      const t1 = setTimeout(() => {
        setSources((current) =>
          current.map((s) => (s.id === newId ? { ...s, status: "Processing" } : s))
        );
      }, 450);

      const t2 = setTimeout(() => {
        setSources((current) =>
          current.map((s) => (s.id === newId ? { ...s, status: "Ready" } : s))
        );
      }, 1200);

      timersRef.current.push(t1, t2);
    }
  }, [sources.length, isReducedMotion, setSources]);

  // Add website handler
  const handleAddWebsite = useCallback(() => {
    const rawUrl = websiteUrl.trim() || "https://example.com/help";
    let formattedName = rawUrl;
    try {
      const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
      formattedName = `${parsed.hostname}${parsed.pathname.length > 1 ? parsed.pathname : ""}`;
    } catch {
      formattedName = rawUrl;
    }

    const newId = `src-${Date.now()}`;
    const newSource: ExampleSource = {
      id: newId,
      name: formattedName,
      category: "Web knowledge",
      status: isReducedMotion ? "Ready" : "Queued",
      sampleSnippet: `Extracted public content from ${formattedName}: Answers general customer queries regarding store hours, product availability, and standard service levels.`,
      isExample: true,
    };

    setSources((prev) => [...prev, newSource]);
    setIsAddSourceOpen(false);
    addSourceTriggerRef.current?.focus();

    if (!isReducedMotion) {
      const t1 = setTimeout(() => {
        setSources((current) =>
          current.map((s) => (s.id === newId ? { ...s, status: "Processing" } : s))
        );
      }, 500);

      const t2 = setTimeout(() => {
        setSources((current) =>
          current.map((s) => (s.id === newId ? { ...s, status: "Ready" } : s))
        );
      }, 1300);

      timersRef.current.push(t1, t2);
    }
  }, [websiteUrl, isReducedMotion, setSources]);

  // Remove source
  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setActiveMenuId(null);
    menuTriggerRefs.current.delete(id);
  };

  // Restore defaults
  const handleResetDefaults = () => {
    setSources(INITIAL_SOURCES);
    setActiveMenuId(null);
  };

  return (
    <div className="hiw-step-view hiw-knowledge-view">
      {/* Step Heading & Description */}
      <div className="hiw-step-header">
        <h3 className="hiw-step-heading">Start with what you already know.</h3>
        <p className="hiw-step-description">
          Your documents give every answer a reliable source.
        </p>
      </div>

      {/* Upload Drop Zone Box */}
      <div className="hiw-upload-box">
        <div className="hiw-upload-icon-wrap" aria-hidden="true">
          <svg
            className="hiw-upload-svg"
            viewBox="0 0 40 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Document sheet with folded top-right corner */}
            <path
              d="M8 4C6.89543 4 6 4.89543 6 6V38C6 39.1046 6.89543 40 8 40H32C33.1046 40 34 39.1046 34 38V14L24 4H8Z"
              stroke="#666666"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M24 4V14H34"
              stroke="#666666"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Upward arrow inside document */}
            <path
              d="M20 30V20M20 20L15.5 24.5M20 20L24.5 24.5"
              stroke="#262626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="hiw-upload-title">Add documents or a website</p>
        <p className="hiw-upload-subtitle">PDF, DOCX, TXT or a web address</p>
        <button
          ref={addSourceTriggerRef}
          type="button"
          onClick={() => setIsAddSourceOpen(true)}
          className="hiw-upload-button"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.4]" aria-hidden="true" />
          <span>Add a source</span>
        </button>
      </div>

      {/* Sources List */}
      <div className="hiw-sources-list">
        {sources.length === 0 ? (
          <div className="hiw-sources-empty">
            <p>No preview sources remaining.</p>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="hiw-reset-button"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Restore example sources</span>
            </button>
          </div>
        ) : (
          sources.map((src) => {
            const isMenuOpen = activeMenuId === src.id;
            return (
              <div key={src.id} className="hiw-source-row">
                <div className="hiw-source-left">
                  <div className="hiw-source-icon" aria-hidden="true">
                    <FileText className="w-4 h-4 stroke-[1.8] text-[#262626]" />
                  </div>
                  <div className="hiw-source-meta">
                    <p className="hiw-source-name">{src.name}</p>
                    <p className="hiw-source-category">{src.category}</p>
                  </div>
                </div>

                <div className="hiw-source-right">
                  <div className="hiw-source-status">
                    <span
                      className={`hiw-status-dot ${
                        src.status === "Ready"
                          ? "hiw-status-ready"
                          : src.status === "Processing"
                          ? "hiw-status-processing"
                          : "hiw-status-queued"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="hiw-status-label">{src.status}</span>
                  </div>

                  <div className="hiw-source-menu-wrap">
                    <button
                      ref={(el) => {
                        if (el) menuTriggerRefs.current.set(src.id, el);
                        else menuTriggerRefs.current.delete(src.id);
                      }}
                      type="button"
                      aria-label={`Options for ${src.name}`}
                      aria-expanded={isMenuOpen}
                      aria-haspopup="true"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setMenuAnchor({
                          top: Math.min(rect.bottom + 4, window.innerHeight - 110),
                          left: Math.max(16, Math.min(rect.right - 180, window.innerWidth - 196)),
                        });
                        setActiveMenuId((curr) => (curr === src.id ? null : src.id));
                      }}
                      className="hiw-source-menu-trigger"
                    >
                      <MoreVertical className="w-4 h-4" aria-hidden="true" />
                    </button>

                    {isMenuOpen && createPortal(
                      <div
                        style={{ position: "fixed", top: menuAnchor.top, left: menuAnchor.left, right: "auto", marginTop: 0 }}
                        className="hiw-source-dropdown"
                        role="menu"
                        aria-label={`Options for ${src.name}`}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setViewingSource(src);
                            setActiveMenuId(null);
                          }}
                          className="hiw-dropdown-item"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#666666]" aria-hidden="true" />
                          <span>View example</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleRemoveSource(src.id)}
                          className="hiw-dropdown-item hiw-dropdown-danger"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Remove from preview</span>
                        </button>
                      </div>
                    , document.body)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Answer Preview Card Grounded in Information */}
      <div className="hiw-answer-card">
        <div className="hiw-answer-left">
          <div className="hiw-answer-chat-icon" aria-hidden="true">
            <svg
              className="w-4 h-4 text-[#fa5d19]"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4.5C3 3.67157 3.67157 3 4.5 3H15.5C16.3284 3 17 3.67157 17 4.5V12.5C17 13.3284 16.3284 14 15.5 14H6.5L3 17.5V4.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M6.5 7H13.5M6.5 10H11.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="hiw-answer-text-wrap">
            <p className="hiw-answer-title">An answer grounded in your information</p>
            <p className="hiw-answer-body">
              Our team is available Monday to Friday, 9 AM–5 PM.
            </p>
          </div>
        </div>

        <div className="hiw-answer-citation-chip">
          <FileText className="w-3 h-3 stroke-[1.8] text-[#666666]" aria-hidden="true" />
          <span>Business handbook.pdf</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Local Modal: Add a Source                                    */}
      {/* ============================================================ */}
      {isAddSourceOpen && createPortal(
        <div
          role="dialog"
          data-hiw-dialog
          aria-modal="true"
          aria-labelledby="add-source-title"
          className="hiw-dialog-overlay"
        >
          <div className="hiw-dialog-card">
            <div className="hiw-dialog-header">
              <h4 id="add-source-title" className="hiw-dialog-title">
                Add a source
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddSourceOpen(false);
                  addSourceTriggerRef.current?.focus();
                }}
                className="hiw-dialog-close"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="hiw-dialog-note">
              This preview keeps changes in this browser session. It does not upload files to a
              backend or fetch external URLs.
            </p>

            <div className="hiw-dialog-tabs" role="tablist" aria-label="Source types">
              <button
                type="button"
                role="tab"
                aria-selected={addMode === "document"}
                onClick={() => setAddMode("document")}
                className={`hiw-dialog-tab ${addMode === "document" ? "hiw-dialog-tab-active" : ""}`}
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sample document</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={addMode === "website"}
                onClick={() => setAddMode("website")}
                className={`hiw-dialog-tab ${addMode === "website" ? "hiw-dialog-tab-active" : ""}`}
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Website URL</span>
              </button>
            </div>

            {addMode === "document" ? (
              <div className="hiw-dialog-form">
                <p className="hiw-dialog-hint">
                  Attaches a prepared fictional document to demonstrate the extraction and
                  indexing process.
                </p>
                <div className="hiw-dialog-preset-preview">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#fa5d19]" aria-hidden="true" />
                    <span className="font-medium text-[#262626]">
                      Staff onboarding guide.pdf
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#666666] bg-neutral-100 px-1.5 py-0.5 rounded">
                    Example source
                  </span>
                </div>
              </div>
            ) : (
              <div className="hiw-dialog-form">
                <label htmlFor="website-url-input" className="hiw-input-label">
                  Web address
                </label>
                <input
                  id="website-url-input"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourbusiness.com/faq"
                  className="hiw-input-text"
                />
                <p className="hiw-dialog-hint mt-1.5">
                  Creates an example web source row without requesting the network.
                </p>
              </div>
            )}

            <div className="hiw-dialog-actions">
              <button
                type="button"
                onClick={() => {
                  setIsAddSourceOpen(false);
                  addSourceTriggerRef.current?.focus();
                }}
                className="hiw-button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addMode === "document" ? handleAddSampleDoc : handleAddWebsite}
                className="hiw-button-primary"
              >
                Add to preview
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ============================================================ */}
      {/* Local Modal: View Example Details                            */}
      {/* ============================================================ */}
      {viewingSource && createPortal(
        <div
          role="dialog"
          data-hiw-dialog
          aria-modal="true"
          aria-labelledby="view-source-title"
          className="hiw-dialog-overlay"
        >
          <div className="hiw-dialog-card">
            <div className="hiw-dialog-header">
              <h4 id="view-source-title" className="hiw-dialog-title">
                {viewingSource.name}
              </h4>
              <button
                type="button"
                onClick={() => {
                  const srcId = viewingSource.id;
                  setViewingSource(null);
                  menuTriggerRefs.current.get(srcId)?.focus();
                }}
                className="hiw-dialog-close"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] font-medium text-[#666666]">
                Category: {viewingSource.category}
              </span>
              <span className="text-[11px] font-mono text-[#16a34a] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                Indexed · Ready
              </span>
            </div>

            <div className="hiw-dialog-snippet-box">
              <p className="text-[11px] font-mono uppercase text-[#666666] mb-1.5">
                Example excerpt
              </p>
              <p className="text-[13px] text-[#262626] leading-relaxed m-0">
                {viewingSource.sampleSnippet ||
                  "Sample business knowledge indexed for search and citations."}
              </p>
            </div>

            <p className="text-[12px] text-[#666666] mt-3 mb-5">
              This preview excerpt represents simulated grounding context. No actual documents
              were parsed.
            </p>

            <div className="hiw-dialog-actions">
              <button
                type="button"
                onClick={() => {
                  const srcId = viewingSource.id;
                  setViewingSource(null);
                  menuTriggerRefs.current.get(srcId)?.focus();
                }}
                className="hiw-button-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
