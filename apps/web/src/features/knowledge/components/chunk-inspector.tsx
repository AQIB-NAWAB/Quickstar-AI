"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  X,
  Copy,
  Check,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import type { KnowledgeSource, ChunkItem } from "../lib/types";
import { listSourceChunks } from "../lib/client";
import { SourceStatusBadge } from "./source-status-badge";
import { SourceTypeIconTile } from "./source-type-label";

interface ChunkInspectorProps {
  workspaceId: string;
  source: KnowledgeSource;
  onBack: () => void;
  onClose: () => void;
}

export function ChunkInspector({
  workspaceId,
  source,
  onBack,
  onClose,
}: ChunkInspectorProps) {
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(source.chunk_count || 0);
  const [sourceVersion, setSourceVersion] = useState<number>(source.version || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});

  const loadChunks = useCallback(async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    const res = await listSourceChunks(workspaceId, source.id, 20, cursor);

    if (cursor) {
      setIsLoadingMore(false);
    } else {
      setIsLoading(false);
    }

    if (res.chunks) {
      if (cursor) {
        setChunks((prev) => [...prev, ...res.chunks!]);
      } else {
        setChunks(res.chunks);
      }
      setTotalCount(res.chunk_count ?? 0);
      setSourceVersion(res.source_version ?? 1);
      setNextCursor(res.next_cursor ?? null);
    } else {
      setError(res.error?.message || "Failed to load persisted chunks");
    }
  }, [workspaceId, source.id]);

  useEffect(() => {
    void loadChunks();
  }, [loadChunks]);

  async function handleCopyChunk(chunk: ChunkItem) {
    try {
      await navigator.clipboard.writeText(chunk.text);
      setCopiedChunkId(chunk.id);
      setTimeout(() => setCopiedChunkId(null), 2000);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  }

  function toggleExpand(id: string) {
    setExpandedChunks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex flex-col h-full bg-white text-accent-black">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-faint shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-accent-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Source details</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close drawer"
          className="p-1.5 rounded-8 text-neutral-400 hover:text-accent-black hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Header Info */}
      <div className="px-6 py-5 border-b border-border-faint space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-accent-black">
              Indexed chunks
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
              {totalCount} {totalCount === 1 ? "chunk" : "chunks"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <SourceTypeIconTile kind={source.kind} size="sm" />
            <span className="font-semibold text-accent-black truncate max-w-[280px]">
              {source.name}
            </span>
          </div>
          <span className="text-neutral-300">•</span>
          <SourceStatusBadge status={source.status} />
          <span className="text-neutral-300">•</span>
          <span className="px-2 py-0.5 rounded-6 bg-neutral-100 text-neutral-600 font-mono text-[11px] font-medium border border-neutral-200/60">
            v{sourceVersion}
          </span>
        </div>

        {/* Notice Info Box */}
        <div className="p-3.5 rounded-10 bg-neutral-50 border border-neutral-200/80 flex items-start gap-2.5 text-xs text-neutral-600 leading-relaxed">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            These are the persisted chunks available for retrieval. Chunks are stored in OpenSearch and retrieved during agent context assembly.
          </span>
        </div>
      </div>

      {/* Chunks List Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 rounded-12 border border-border-faint bg-neutral-50" />
            <div className="h-28 rounded-12 border border-border-faint bg-neutral-50" />
            <div className="h-28 rounded-12 border border-border-faint bg-neutral-50" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-12 text-center space-y-3">
            <p className="text-xs font-semibold text-accent-crimson">{error}</p>
            <button
              type="button"
              onClick={() => void loadChunks()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-border-faint text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : chunks.length === 0 ? (
          <div className="p-12 text-center space-y-3 border border-dashed border-border-faint rounded-12 bg-neutral-50/50">
            <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-accent-black">No indexed chunks found</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              This source has not completed indexing yet or has no persisted chunks in the index.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {chunks.map((chunk, index) => {
              const chunkNumber = String(chunk.chunk_index !== undefined ? chunk.chunk_index + 1 : index + 1).padStart(2, "0");
              const isCopied = copiedChunkId === chunk.id;
              const isLong = chunk.text.length > 360;
              const isExpanded = Boolean(expandedChunks[chunk.id]);
              const charCount = chunk.text.length;

              const boundaryLabel =
                chunk.start_char !== null && chunk.end_char !== null
                  ? `chars ${chunk.start_char} – ${chunk.end_char}`
                  : "Boundaries unavailable";

              return (
                <article
                  key={chunk.id}
                  className="rounded-12 border border-border-faint bg-white hover:border-neutral-300 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-4 py-3 bg-neutral-50/80 border-b border-border-faint flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-accent-black tracking-wide">
                        CHUNK {chunkNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-6 bg-white border border-border-faint text-[11px] font-mono text-neutral-500">
                        {chunk.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-6 bg-white border border-border-faint text-[11px] font-mono text-neutral-600">
                        {boundaryLabel}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {charCount} chars
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCopyChunk(chunk)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-6 bg-white border border-border-faint text-[11px] font-medium text-neutral-600 hover:text-accent-black hover:bg-neutral-50 transition-colors"
                      aria-label={`Copy chunk ${chunkNumber}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 bg-white">
                    <p
                      className={`font-mono text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap break-words ${
                        !isExpanded && isLong ? "line-clamp-4" : ""
                      }`}
                    >
                      {chunk.text}
                    </p>

                    {isLong && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(chunk.id)}
                        className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-heat-100 hover:text-heat-100/80 transition-colors"
                      >
                        <span>{isExpanded ? "Show less" : "Show full chunk"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Pagination / Load More */}
            {nextCursor && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => void loadChunks(nextCursor)}
                  disabled={isLoadingMore}
                  className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
                >
                  {isLoadingMore ? "Loading more..." : "Load next chunks"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="px-6 py-4 border-t border-border-faint bg-neutral-50/50 flex items-center justify-between shrink-0">
        <p className="text-[11px] text-neutral-400">
          Viewing persisted OpenSearch chunks (Version {sourceVersion})
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors shadow-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
