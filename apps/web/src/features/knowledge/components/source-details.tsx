"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  X,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Copy,
  Check,
  ChevronRight,
  FileText,
  Globe,
  ExternalLink,
  HardDrive,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { KnowledgeSource, ChunkItem } from "../lib/types";
import { getSource, listSourceChunks } from "../lib/client";
import { SourceStatusBadge } from "./source-status-badge";
import { SourceTypeLabel, SourceTypeIconTile } from "./source-type-label";
import { ChunkInspector } from "./chunk-inspector";
import { useSourceStatus } from "../hooks/use-source-status";
import { formatDateTime, formatBytes, estimateTokens } from "../lib/format";

interface SourceDetailsProps {
  workspaceId: string;
  sourceId: string | null;
  open?: boolean;
  onClose?: () => void;
  onDeleteRequest?: (source: KnowledgeSource) => void;
  onSourceUpdated?: (updated: KnowledgeSource) => void;
  isPreview?: boolean;
}

export function SourceDetails({
  workspaceId,
  sourceId,
  open = true,
  onClose = () => {},
  onDeleteRequest = () => {},
  onSourceUpdated,
}: SourceDetailsProps) {
  const [source, setSource] = useState<KnowledgeSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"details" | "chunks">("details");
  const [previewChunks, setPreviewChunks] = useState<ChunkItem[]>([]);
  const [copiedContent, setCopiedContent] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset mode to details when sourceId changes or drawer opens
  useEffect(() => {
    if (open) {
      setMode("details");
      setIsContentExpanded(false);
    }
  }, [open, sourceId]);

  const loadSource = useCallback(async () => {
    if (!sourceId) return;
    setIsLoading(true);
    setError(null);
    const res = await getSource(workspaceId, sourceId);
    setIsLoading(false);

    if (res.source) {
      setSource(res.source);
      if (onSourceUpdated) onSourceUpdated(res.source);
    } else {
      setError(res.error?.message || "Failed to load knowledge source");
    }
  }, [workspaceId, sourceId, onSourceUpdated]);

  useEffect(() => {
    if (open && sourceId) {
      void loadSource();
    } else if (!open) {
      setSource(null);
    }
  }, [open, sourceId, loadSource]);

  // Load preview chunks when source is ready
  useEffect(() => {
    if (open && source?.id && (source.status === "ready" || source.chunk_count > 0)) {
      let cancelled = false;
      void listSourceChunks(workspaceId, source.id, 3).then((res) => {
        if (!cancelled && res.chunks) {
          setPreviewChunks(res.chunks);
        }
      });
      return () => {
        cancelled = true;
      };
    } else {
      setPreviewChunks([]);
    }
  }, [open, workspaceId, source?.id, source?.status, source?.chunk_count]);

  // Live polling for queued/processing status
  const { source: liveSource, refreshError } = useSourceStatus({
    workspaceId,
    initialSource: source,
    onUpdate: (updated) => {
      setSource(updated);
      if (onSourceUpdated) onSourceUpdated(updated);
    },
    enabled: Boolean(
      open && source && (source.status === "queued" || source.status === "processing")
    ),
  });

  const displaySource = liveSource || source;

  // Handle ESC key to close drawer or return from chunks
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mode === "chunks") {
          setMode("details");
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, mode, onClose]);

  // Body scroll lock while drawer is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!open) return null;

  async function handleCopyContent() {
    if (!displaySource?.content_text) return;
    try {
      await navigator.clipboard.writeText(displaySource.content_text);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  }

  const charCount = displaySource?.char_count ?? displaySource?.content_text?.length ?? 0;
  const tokenEstimate = charCount > 0 ? estimateTokens(charCount) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displaySource ? `Details for ${displaySource.name}` : "Source details"}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-accent-black/30 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-[680px] bg-white border-l border-border-faint shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
        >
          {/* Mode Switch: Chunks View */}
          {mode === "chunks" && displaySource ? (
            <ChunkInspector
              workspaceId={workspaceId}
              source={displaySource}
              onBack={() => setMode("details")}
              onClose={onClose}
            />
          ) : (
            /* Mode Switch: Details Overview */
            <div className="flex flex-col h-full">
              {/* Drawer Top Header */}
              <div className="px-6 py-4 border-b border-border-faint flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  {displaySource && (
                    <SourceTypeIconTile kind={displaySource.kind} size="md" />
                  )}
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-accent-black truncate tracking-tight">
                      {isLoading ? "Loading source..." : displaySource?.name || "Source details"}
                    </h2>
                    {displaySource && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <SourceTypeLabel kind={displaySource.kind} showIcon={false} />
                        <span className="text-neutral-300">•</span>
                        <SourceStatusBadge status={displaySource.status} />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="p-1.5 rounded-8 text-neutral-400 hover:text-accent-black hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoading ? (
                  <div className="space-y-5 animate-pulse">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-12 bg-neutral-100" />
                      ))}
                    </div>
                    <div className="h-44 rounded-12 bg-neutral-100" />
                    <div className="h-32 rounded-12 bg-neutral-100" />
                  </div>
                ) : error ? (
                  <div className="p-8 bg-red-50 border border-red-200 rounded-12 text-center space-y-3">
                    <p className="text-xs font-semibold text-accent-crimson">{error}</p>
                    <button
                      type="button"
                      onClick={() => void loadSource()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-border-faint text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : displaySource ? (
                  <div className="space-y-6">
                    {/* Status Alerts if applicable */}
                    {displaySource.status === "failed" ? (
                      <div
                        role="alert"
                        className="p-4 rounded-12 bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-accent-crimson"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="space-y-1">
                          <p className="font-semibold">Ingestion failed</p>
                          <p className="text-[11px] text-red-700 leading-relaxed">
                            {displaySource.error_message ||
                              "Ingestion failed. No additional reason was reported."}
                          </p>
                        </div>
                      </div>
                    ) : displaySource.status === "queued" || displaySource.status === "processing" ? (
                      <div
                        role="status"
                        className="p-4 rounded-12 bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-xs text-amber-900"
                      >
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="space-y-1">
                          <p className="font-semibold">This source is being prepared for retrieval.</p>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            Background worker is extracting, chunking, and embedding content. Status refreshes automatically.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {refreshError && (
                      <p className="text-[11px] text-neutral-400 italic">
                        Notice: {refreshError} (will retry automatically)
                      </p>
                    )}

                    {/* Overview 2x2 / 4-Col Grid */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-accent-black tracking-wide uppercase">
                        Document Overview
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-10 bg-neutral-50 border border-border-faint space-y-1">
                          <span className="text-[11px] text-neutral-500 font-medium">Extracted text</span>
                          <p className="text-xs font-semibold text-accent-black font-mono">
                            {charCount.toLocaleString()} chars
                          </p>
                        </div>

                        <div className="p-3.5 rounded-10 bg-neutral-50 border border-border-faint space-y-1">
                          <span className="text-[11px] text-neutral-500 font-medium">Estimated tokens</span>
                          <p className="text-xs font-semibold text-accent-black font-mono">
                            ~{tokenEstimate.toLocaleString()}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-10 bg-neutral-50 border border-border-faint space-y-1">
                          <span className="text-[11px] text-neutral-500 font-medium">Indexed chunks</span>
                          <p className="text-xs font-semibold text-accent-black font-mono">
                            {displaySource.chunk_count}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-10 bg-neutral-50 border border-border-faint space-y-1">
                          <span className="text-[11px] text-neutral-500 font-medium">Version</span>
                          <p className="text-xs font-semibold text-accent-black font-mono">
                            v{displaySource.version}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Details (File, URL, Storage) */}
                    <div className="rounded-12 border border-border-faint bg-white divide-y divide-border-faint text-xs">
                      {displaySource.file_name && (
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                          <span className="text-neutral-500 font-medium flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-neutral-400" />
                            Original file
                          </span>
                          <span className="font-semibold text-accent-black truncate max-w-[280px]">
                            {displaySource.file_name}{" "}
                            {displaySource.file_size_bytes
                              ? `(${formatBytes(displaySource.file_size_bytes)})`
                              : ""}
                          </span>
                        </div>
                      )}

                      {displaySource.source_url && (
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                          <span className="text-neutral-500 font-medium flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-neutral-400" />
                            Source URL
                          </span>
                          <a
                            href={displaySource.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-heat-100 hover:underline inline-flex items-center gap-1 truncate max-w-[280px]"
                          >
                            <span className="truncate">{displaySource.source_url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-neutral-500 font-medium flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                          Storage location
                        </span>
                        <span className="text-neutral-700 font-medium">
                          Workspace document storage
                        </span>
                      </div>

                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-neutral-500 font-medium">Added</span>
                        <span className="text-neutral-700">
                          {formatDateTime(displaySource.created_at)}
                        </span>
                      </div>

                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-neutral-500 font-medium">Last updated</span>
                        <span className="text-neutral-700">
                          {formatDateTime(displaySource.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Raw Normalized Content Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-accent-black tracking-wide uppercase">
                            Extracted Text
                          </h3>
                          <span className="px-2 py-0.5 rounded-4 bg-neutral-100 text-[11px] font-mono text-neutral-500">
                            {displaySource.content_type || "text/plain"}
                          </span>
                        </div>

                        {displaySource.content_text && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsContentExpanded((prev) => !prev)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-accent-black transition-colors"
                            >
                              {isContentExpanded ? (
                                <>
                                  <Minimize2 className="w-3 h-3" />
                                  <span>Collapse</span>
                                </>
                              ) : (
                                <>
                                  <Maximize2 className="w-3 h-3" />
                                  <span>Expand</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleCopyContent()}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-accent-black transition-colors"
                            >
                              {copiedContent ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-neutral-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {displaySource.content_text ? (
                        <div
                          className={`rounded-10 border border-border-faint bg-neutral-50 p-3.5 overflow-y-auto font-mono text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap break-words transition-all ${
                            isContentExpanded ? "max-h-[500px]" : "max-h-52"
                          }`}
                        >
                          {displaySource.content_text}
                        </div>
                      ) : (
                        <div className="p-6 rounded-10 border border-dashed border-border-faint text-center bg-neutral-50/50">
                          <p className="text-xs text-neutral-400 italic">
                            {displaySource.status === "failed"
                              ? "Content extraction failed. No extracted text is available."
                              : "Extracted text will appear once processing completes."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Indexed Chunks Preview Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-accent-black tracking-wide uppercase">
                            Indexed Chunks
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200/60">
                            {displaySource.chunk_count}
                          </span>
                        </div>

                        {displaySource.chunk_count > 0 && (
                          <button
                            type="button"
                            onClick={() => setMode("chunks")}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-heat-100 hover:text-heat-100/80 transition-colors"
                          >
                            <span>View all {displaySource.chunk_count} chunks</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {previewChunks.length > 0 ? (
                        <div className="space-y-2.5">
                          {previewChunks.map((chunk, idx) => (
                            <div
                              key={chunk.id}
                              className="p-3.5 rounded-10 border border-border-faint bg-white space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-accent-black">
                                  CHUNK {String(chunk.chunk_index !== undefined ? chunk.chunk_index + 1 : idx + 1).padStart(2, "0")}
                                </span>
                                <span className="font-mono text-neutral-400">
                                  {chunk.start_char !== null && chunk.end_char !== null
                                    ? `chars ${chunk.start_char}–${chunk.end_char}`
                                    : "Boundaries unavailable"}
                                </span>
                              </div>
                              <p className="font-mono text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                                {chunk.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5 rounded-10 border border-border-faint bg-neutral-50 text-xs text-neutral-500 text-center">
                          {displaySource.status === "failed"
                            ? "No chunks were indexed because ingestion failed."
                            : displaySource.status === "ready"
                            ? "No indexed chunks found for this source."
                            : "Chunks will appear here once background indexing completes."}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Drawer Sticky Footer */}
              <div className="px-6 py-4 border-t border-border-faint bg-neutral-50/50 flex items-center justify-between shrink-0">
                {displaySource ? (
                  <button
                    type="button"
                    onClick={() => onDeleteRequest(displaySource)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-10 border border-red-200 text-accent-crimson bg-white hover:bg-red-50 text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete source</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
