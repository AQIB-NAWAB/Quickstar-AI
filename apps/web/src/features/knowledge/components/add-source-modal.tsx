"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Upload, Globe, AlignLeft, FileUp, Trash2, Loader2, Info } from "lucide-react";
import { FeatureDialog } from "./feature-dialog";
import { createSource, uploadSource } from "../lib/client";
import type { KnowledgeSource } from "../lib/types";
import { formatBytes, estimateTokens } from "../lib/format";

interface AddSourceModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  initialTemplate?: { name: string; content: string } | null;
  onSourceCreated: (newSource: KnowledgeSource) => void;
}

type TabType = "text" | "file" | "url";

const MAX_PLAIN_TEXT_CHARS = 50_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_FILE_EXTENSIONS = [".pdf", ".txt", ".md", ".docx"];

export function AddSourceModal({
  open,
  onClose,
  workspaceId,
  initialTemplate,
  onSourceCreated,
}: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("text");

  // Tab 1: Plain text draft
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isTemplateActive, setIsTemplateActive] = useState(false);

  // Tab 2: File upload draft
  const [fileNameInput, setFileNameInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewText, setFilePreviewText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 3: URL draft
  const [urlName, setUrlName] = useState("");
  const [urlInput, setUrlInput] = useState("");

  // Validation & Submission
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill from template if provided
  useEffect(() => {
    if (initialTemplate && open) {
      setActiveTab("text");
      setTextName(initialTemplate.name);
      setTextContent(initialTemplate.content);
      setIsTemplateActive(true);
    }
  }, [initialTemplate, open]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setTextName("");
      setTextContent("");
      setIsTemplateActive(false);
      setFileNameInput("");
      setSelectedFile(null);
      setFilePreviewText(null);
      setUrlName("");
      setUrlInput("");
      setValidationError(null);
      setApiError(null);
      setIsSubmitting(false);
      setActiveTab("text");
    }
  }, [open]);

  function handleTabChange(tab: TabType) {
    if (isSubmitting) return;
    setActiveTab(tab);
    setValidationError(null);
    setApiError(null);
  }

  function handleFileSelected(file: File) {
    setValidationError(null);
    setApiError(null);

    const name = file.name.toLowerCase();
    const hasValidExt = ALLOWED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!hasValidExt) {
      setValidationError(
        `Unsupported file type. Allowed formats: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`
      );
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setValidationError(
        `File exceeds maximum limit of 25 MB (${formatBytes(file.size)}).`
      );
      return;
    }

    setSelectedFile(file);
    if (!fileNameInput.trim()) {
      // Auto-populate name from filename, stripping extension
      const base = file.name.replace(/\.[^/.]+$/, "");
      setFileNameInput(base);
    }

    // If txt or md, load local preview
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          setFilePreviewText(text);
        }
      };
      reader.readAsText(file);
    } else {
      setFilePreviewText(null);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setValidationError(null);
    setApiError(null);

    if (activeTab === "text") {
      const trimmedName = textName.trim();
      const trimmedContent = textContent.trim();

      if (!trimmedName) {
        setValidationError("Source name is required.");
        return;
      }
      if (!trimmedContent) {
        setValidationError("Source content is required.");
        return;
      }
      if (trimmedContent.length > MAX_PLAIN_TEXT_CHARS) {
        setValidationError(
          `Content exceeds maximum limit of 50,000 characters (current: ${trimmedContent.length.toLocaleString()}).`
        );
        return;
      }

      setIsSubmitting(true);
      const res = await createSource(workspaceId, {
        name: trimmedName,
        content: trimmedContent,
        type: "text",
        content_type: "text/plain",
      });
      setIsSubmitting(false);

      if (res.source) {
        onSourceCreated(res.source);
        onClose();
      } else {
        setApiError(res.error?.message || "Failed to create plain text source.");
      }
      return;
    }

    if (activeTab === "file") {
      const trimmedName = fileNameInput.trim();
      if (!selectedFile) {
        setValidationError("Please select a file to upload.");
        return;
      }
      if (!trimmedName) {
        setValidationError("Source name is required.");
        return;
      }

      setIsSubmitting(true);
      const res = await uploadSource(workspaceId, selectedFile, trimmedName);
      setIsSubmitting(false);

      if (res.source) {
        onSourceCreated(res.source);
        onClose();
      } else {
        setApiError(res.error?.message || "Failed to upload and ingest file.");
      }
      return;
    }

    if (activeTab === "url") {
      const trimmedName = urlName.trim();
      const trimmedUrl = urlInput.trim();

      if (!trimmedName) {
        setValidationError("Source name is required.");
        return;
      }
      if (!trimmedUrl) {
        setValidationError("Web page URL is required.");
        return;
      }

      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== "https:") {
          setValidationError("Only secure HTTPS URLs are allowed (e.g. https://example.com).");
          return;
        }
      } catch {
        setValidationError("Please enter a valid URL (e.g. https://example.com/faq).");
        return;
      }

      setIsSubmitting(true);
      const res = await createSource(workspaceId, {
        name: trimmedName,
        type: "url",
        url: trimmedUrl,
      });
      setIsSubmitting(false);

      if (res.source) {
        onSourceCreated(res.source);
        onClose();
      } else {
        setApiError(res.error?.message || "Failed to import web page.");
      }
      return;
    }
  }

  const textCharCount = textContent.length;
  const textTokenEstimate = textCharCount > 0 ? estimateTokens(textCharCount) : 0;

  return (
    <FeatureDialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Add knowledge source"
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[560px]"
    >
      <div className="space-y-5">
        <p className="text-xs text-neutral-500 -mt-2">
          Give agents reliable business context.
        </p>

        {/* Accessible Tab Navigation */}
        <div
          role="tablist"
          aria-label="Source creation method"
          className="flex border-b border-border-faint -mx-6 px-6"
          onKeyDown={(e) => {
            const tabs: TabType[] = ["text", "file", "url"];
            const currentIdx = tabs.indexOf(activeTab);
            if (e.key === "ArrowRight") {
              const next = tabs[(currentIdx + 1) % tabs.length];
              handleTabChange(next);
            } else if (e.key === "ArrowLeft") {
              const prev = tabs[(currentIdx - 1 + tabs.length) % tabs.length];
              handleTabChange(prev);
            }
          }}
        >
          <button
            type="button"
            role="tab"
            id="tab-text"
            aria-selected={activeTab === "text"}
            aria-controls="tabpanel-text"
            onClick={() => handleTabChange("text")}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "text"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-accent-black"
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Plain text</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-file"
            aria-selected={activeTab === "file"}
            aria-controls="tabpanel-file"
            onClick={() => handleTabChange("file")}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
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
            id="tab-url"
            aria-selected={activeTab === "url"}
            aria-controls="tabpanel-url"
            onClick={() => handleTabChange("url")}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "url"
                ? "border-heat-100 text-heat-100"
                : "border-transparent text-neutral-500 hover:text-accent-black"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>URL</span>
          </button>
        </div>

        {/* Tab 1: Plain Text */}
        {activeTab === "text" && (
          <form
            id="tabpanel-text"
            role="tabpanel"
            aria-labelledby="tab-text"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {isTemplateActive && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-10 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Review starter text before saving. Templates are not your company policies. Replace bracketed placeholders like [Company Name].
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="text-source-name"
                className="block text-xs font-semibold text-accent-black"
              >
                Source name <span className="text-heat-100">*</span>
              </label>
              <input
                id="text-source-name"
                type="text"
                maxLength={255}
                value={textName}
                onChange={(e) => {
                  setTextName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Return & Cancellation Policy"
                className="w-full rounded-10 border border-border-faint bg-white px-3.5 py-2.5 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="text-source-content"
                  className="block text-xs font-semibold text-accent-black"
                >
                  Content <span className="text-heat-100">*</span>
                </label>
                <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
                  <span
                    className={
                      textCharCount > MAX_PLAIN_TEXT_CHARS ? "text-accent-crimson font-bold" : ""
                    }
                  >
                    {textCharCount.toLocaleString()} / {MAX_PLAIN_TEXT_CHARS.toLocaleString()} characters
                  </span>
                  <span>•</span>
                  <span>Estimated tokens: ~{textTokenEstimate.toLocaleString()}</span>
                </div>
              </div>
              <textarea
                id="text-source-content"
                rows={9}
                value={textContent}
                onChange={(e) => {
                  setTextContent(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Paste the ground-truth text your agents should use to answer questions..."
                className="w-full rounded-10 border border-border-faint bg-white p-3.5 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow font-mono leading-relaxed"
              />
              <p className="text-[11px] text-neutral-400">
                Content will be split into chunks and indexed after creation.
              </p>
            </div>
          </form>
        )}

        {/* Tab 2: File Upload */}
        {activeTab === "file" && (
          <form
            id="tabpanel-file"
            role="tabpanel"
            aria-labelledby="tab-file"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="file-source-name"
                className="block text-xs font-semibold text-accent-black"
              >
                Source name <span className="text-heat-100">*</span>
              </label>
              <input
                id="file-source-name"
                type="text"
                maxLength={255}
                value={fileNameInput}
                onChange={(e) => {
                  setFileNameInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Employee Handbook"
                className="w-full rounded-10 border border-border-faint bg-white px-3.5 py-2.5 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
              />
            </div>

            {/* Dropzone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-12 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-heat-100 bg-heat-12/20"
                    : "border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 hover:border-neutral-300"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white border border-border-faint flex items-center justify-center mb-3 shadow-xs">
                  <Upload className="w-5 h-5 text-neutral-500" />
                </div>
                <p className="text-xs font-semibold text-accent-black">
                  Click to upload or drag and drop
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  PDF, DOCX, TXT, or MD (up to 25 MB)
                </p>
              </div>
            ) : (
              <div className="rounded-12 border border-border-faint bg-neutral-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-10 bg-white border border-border-faint flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-accent-black truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreviewText(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1.5 rounded-8 text-neutral-400 hover:text-accent-crimson hover:bg-red-50 transition-colors"
                    aria-label="Remove selected file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {filePreviewText ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Preview (first 400 chars)</span>
                      <span>~{estimateTokens(filePreviewText.length)} estimated tokens</span>
                    </div>
                    <pre className="p-3 bg-white border border-border-faint rounded-8 text-[11px] font-mono text-neutral-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {filePreviewText.slice(0, 400)}
                      {filePreviewText.length > 400 ? "..." : ""}
                    </pre>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500">
                    PDF and Word documents are extracted after upload. Text and Markdown files can be previewed before creation.
                  </p>
                )}
              </div>
            )}
          </form>
        )}

        {/* Tab 3: URL */}
        {activeTab === "url" && (
          <form
            id="tabpanel-url"
            role="tabpanel"
            aria-labelledby="tab-url"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="url-source-name"
                className="block text-xs font-semibold text-accent-black"
              >
                Source name <span className="text-heat-100">*</span>
              </label>
              <input
                id="url-source-name"
                type="text"
                maxLength={255}
                value={urlName}
                onChange={(e) => {
                  setUrlName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Frequently Asked Questions"
                className="w-full rounded-10 border border-border-faint bg-white px-3.5 py-2.5 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="url-source-input"
                className="block text-xs font-semibold text-accent-black"
              >
                Public URL <span className="text-heat-100">*</span>
              </label>
              <input
                id="url-source-input"
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="https://myclinic.com/faq"
                className="w-full rounded-10 border border-border-faint bg-white px-3.5 py-2.5 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
              />
              <p className="text-[11px] text-neutral-400">
                Enter a public HTTPS page.
              </p>
            </div>

            {/* Scope / Info Card */}
            <div className="p-4 rounded-10 bg-neutral-50 border border-border-faint space-y-2 text-xs text-neutral-600">
              <p className="font-semibold text-accent-black">
                Fetches public web page content and extracts text for indexing.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-neutral-500">
                <li>Imports this page only. Linked pages are not included.</li>
                <li>Pages requiring a login cannot be imported.</li>
              </ul>
            </div>
          </form>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson leading-relaxed"
          >
            {validationError}
          </div>
        )}

        {/* API Error Banner */}
        {apiError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson leading-relaxed"
          >
            {apiError}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-faint">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {activeTab === "file"
                    ? "Uploading..."
                    : activeTab === "url"
                    ? "Importing..."
                    : "Creating..."}
                </span>
              </>
            ) : (
              <span>
                {activeTab === "file"
                  ? "Upload file"
                  : activeTab === "url"
                  ? "Import URL"
                  : "Create source"}
              </span>
            )}
          </button>
        </div>
      </div>
    </FeatureDialog>
  );
}
