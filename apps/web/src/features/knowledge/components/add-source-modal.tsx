"use client";

import { useState } from "react";
import { AlertCircle, FileUp, Globe, AlignLeft } from "lucide-react";
import { FeatureDialog } from "./feature-dialog";
import { createSource } from "../lib/client";
import { KNOWLEDGE_CAPABILITIES } from "../lib/capabilities";
import type { KnowledgeSource } from "../lib/types";

interface AddSourceModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onSourceCreated: (newSource: KnowledgeSource) => void;
}

type TabType = "url" | "file" | "text";

export function AddSourceModal({
  open,
  onClose,
  workspaceId,
  onSourceCreated,
}: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("url");

  // Keep drafts across tab switches
  const [sourceName, setSourceName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [textContent, setTextContent] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    // Clear validation messages when switching tabs
    setNameError(null);
    setContentError(null);
    setApiError(null);
  }

  function handleClose() {
    if (isSubmitting) return;
    // Reset state on close
    setSourceName("");
    setUrlInput("");
    setTextContent("");
    setNameError(null);
    setContentError(null);
    setApiError(null);
    setActiveTab("url");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (activeTab === "url") {
      // URL tab submission is unavailable
      return;
    }

    if (activeTab === "file") {
      // File upload tab submission is unavailable
      return;
    }

    // Plain text submission
    const trimmedName = sourceName.trim();
    const trimmedContent = textContent.trim();

    let valid = true;
    if (!trimmedName) {
      setNameError("Source name is required.");
      valid = false;
    } else {
      setNameError(null);
    }

    if (!trimmedContent) {
      setContentError("Content is required.");
      valid = false;
    } else {
      setContentError(null);
    }

    if (!valid) return;

    setIsSubmitting(true);
    setApiError(null);

    const res = await createSource(workspaceId, {
      name: trimmedName,
      content: trimmedContent,
      type: "text",
      content_type: "text/plain",
    });

    setIsSubmitting(false);

    if (res.source) {
      onSourceCreated(res.source);
      setSourceName("");
      setTextContent("");
      setActiveTab("url");
      onClose();
    } else {
      setApiError(res.error?.message || "Failed to create knowledge source.");
    }
  }

  return (
    <FeatureDialog
      open={open}
      onClose={handleClose}
      title="Add source"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[520px]"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Source input method"
          onKeyDown={event => {
            const tabs: TabType[] = ["url", "file", "text"];
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const index = event.key === "Home" ? 0 : event.key === "End" ? 2 : (tabs.indexOf(activeTab) + (event.key === "ArrowRight" ? 1 : 2)) % 3;
            handleTabChange(tabs[index]);
            document.getElementById(`tab-${tabs[index]}`)?.focus();
          }}
          className="flex overflow-x-auto border-b border-border-faint -mx-6 px-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "url"}
            aria-controls="tab-panel-url"
            id="tab-url"
            tabIndex={activeTab === "url" ? 0 : -1}
            onClick={() => handleTabChange("url")}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === "url"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-accent-black"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>URL</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "file"}
            aria-controls="tab-panel-file"
            id="tab-file"
            tabIndex={activeTab === "file" ? 0 : -1}
            onClick={() => handleTabChange("file")}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === "file"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-accent-black"
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>File upload</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "text"}
            aria-controls="tab-panel-text"
            id="tab-text"
            tabIndex={activeTab === "text" ? 0 : -1}
            onClick={() => handleTabChange("text")}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === "text"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-accent-black"
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Plain text</span>
          </button>
        </div>

        {/* Common Source Name Field */}
        <div className="space-y-1.5">
          <label htmlFor="source-name-input" className="block text-xs font-semibold text-accent-black">
            Source name
          </label>
          <input
            id="source-name-input"
            type="text"
            value={sourceName}
            onChange={(e) => {
              setSourceName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder={
              activeTab === "url"
                ? "e.g. Help center"
                : activeTab === "file"
                ? "e.g. Company handbook.pdf"
                : "e.g. Return policy"
            }
            className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
          />
          {nameError ? <p className="text-xs text-accent-crimson">{nameError}</p> : null}
        </div>

        {/* URL Tab Content */}
        {activeTab === "url" ? (
          <div
            id="tab-panel-url"
            role="tabpanel"
            aria-labelledby="tab-url"
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="url-input" className="block text-xs font-semibold text-accent-black">
                URL
              </label>
              <input
                id="url-input"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/help"
                className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
              />
              <p className="text-[11px] text-neutral-500">
                Add a public page as a knowledge source.
              </p>
            </div>

            {!KNOWLEDGE_CAPABILITIES.urlIngest ? (
              <div
                role="note"
                className="flex items-start gap-2.5 p-3 rounded-10 bg-neutral-50 border border-border-faint text-xs text-neutral-600"
              >
                <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-accent-black">URL ingestion is not available yet.</p>
                  <p className="text-[11px] text-neutral-500">
                    Switch to Plain text to add information.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* File Upload Tab Content */}
        {activeTab === "file" ? (
          <div
            id="tab-panel-file"
            role="tabpanel"
            aria-labelledby="tab-file"
            className="space-y-4"
          >
            <div className="border border-dashed border-border-faint rounded-12 p-6 flex flex-col items-center justify-center text-center bg-neutral-50/50">
              <FileUp className="w-8 h-8 text-neutral-400 mb-2" />
              <p className="text-xs font-semibold text-accent-black">
                Choose a file or drag it here
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">
                PDF, DOCX, or text files
              </p>
            </div>

            {!KNOWLEDGE_CAPABILITIES.fileUpload ? (
              <div
                role="note"
                className="flex items-start gap-2.5 p-3 rounded-10 bg-neutral-50 border border-border-faint text-xs text-neutral-600"
              >
                <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-accent-black">File uploads are not available yet.</p>
                  <p className="text-[11px] text-neutral-500">
                    Binary multipart file uploads and parsers are not yet implemented on the server. Switch to Plain text to paste your document contents.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Plain Text Tab Content */}
        {activeTab === "text" ? (
          <div
            id="tab-panel-text"
            role="tabpanel"
            aria-labelledby="tab-text"
            className="space-y-1.5"
          >
            <label htmlFor="text-content-input" className="block text-xs font-semibold text-accent-black">
              Content
            </label>
            <textarea
              id="text-content-input"
              rows={8}
              value={textContent}
              onChange={(e) => {
                setTextContent(e.target.value);
                if (contentError) setContentError(null);
              }}
              placeholder="Paste the information your agent should use."
              className="w-full rounded-10 border border-border-faint bg-white p-3 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow leading-relaxed"
            />
            {contentError ? (
              <p className="text-xs text-accent-crimson">{contentError}</p>
            ) : null}
          </div>
        ) : null}

        {/* Global API Error */}
        {apiError ? (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson">
            {apiError}
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-faint">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (activeTab === "url" && !KNOWLEDGE_CAPABILITIES.urlIngest) ||
              (activeTab === "file" && !KNOWLEDGE_CAPABILITIES.fileUpload)
            }
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isSubmitting ? "Adding..." : "Add source"}
          </button>
        </div>
      </form>
    </FeatureDialog>
  );
}
