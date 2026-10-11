"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Clock,
} from "lucide-react";
import type { KnowledgeSource } from "../lib/types";
import { getSource } from "../lib/client";
import { SourceStatusBadge } from "./source-status-badge";
import { SourceTypeLabel } from "./source-type-label";
import { DeleteSourceModal } from "./delete-source-modal";
import { ChunkInspector } from "./chunk-inspector";
import { useSourceStatus } from "../hooks/use-source-status";
import { formatDateTime } from "../lib/format";

interface SourceDetailsProps {
  workspaceId: string;
  sourceId: string;
  isPreview?: boolean;
}

type TabType = "overview" | "chunks";

export function SourceDetails({ workspaceId, sourceId, isPreview = false }: SourceDetailsProps) {
  const router = useRouter();
  const [source, setSource] = useState<KnowledgeSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; message: string; status?: number } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  async function loadSource() {
    setIsLoading(true);
    setError(null);
    const res = await getSource(workspaceId, sourceId);
    setIsLoading(false);

    if (res.source) {
      setSource(res.source);
    } else {
      setError({
        code: res.error?.code,
        message: res.error?.message || "Failed to load knowledge source",
        status: res.status,
      });
    }
  }

  useEffect(() => {
    void loadSource();
  }, [workspaceId, sourceId]);

  // Hook for 5-second polling while nonterminal
  const { source: liveSource, refreshError } = useSourceStatus({
    workspaceId,
    initialSource: source,
    onUpdate: (updated) => setSource(updated),
    enabled: Boolean(source && (source.status === "queued" || source.status === "processing")),
  });

  const displaySource = liveSource || source;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-28 bg-neutral-200 rounded" />
        <div className="h-16 w-full bg-white rounded-12 border border-border-faint" />
        <div className="h-48 w-full bg-white rounded-12 border border-border-faint" />
      </div>
    );
  }

  if (error) {
    if (error.status === 404) {
      return (
        <div className="space-y-4">
          <Link
            href={`/workspaces/${workspaceId}/knowledge`}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-accent-black font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Knowledge</span>
          </Link>
          <div className="p-8 bg-white border border-border-faint rounded-16 text-center space-y-3">
            <p className="text-sm font-semibold text-accent-black">Source not found</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              This knowledge source may have been removed or does not belong to this workspace.
            </p>
            <Link
              href={`/workspaces/${workspaceId}/knowledge`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors"
            >
              Return to Knowledge
            </Link>
          </div>
        </div>
      );
    }

    if (error.status === 403) {
      return (
        <div className="space-y-4">
          <Link
            href={`/workspaces/${workspaceId}/knowledge`}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-accent-black font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Knowledge</span>
          </Link>
          <div className="p-8 bg-white border border-border-faint rounded-16 text-center space-y-3">
            <p className="text-sm font-semibold text-accent-black">Access restricted</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              You do not have permission to inspect knowledge sources in this workspace.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Link
          href={`/workspaces/${workspaceId}/knowledge`}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-accent-black font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge</span>
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-12 space-y-3">
          <p className="text-xs font-semibold text-accent-crimson">
            {error.message}
          </p>
          <button
            type="button"
            onClick={() => void loadSource()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-border-faint text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!displaySource) return null;

  return (
    <div className="console-feature knowledge-feature space-y-6">
      {/* Top Breadcrumb Link */}
      <Link
        href={`/workspaces/${workspaceId}/knowledge`}
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-accent-black font-medium transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Knowledge</span>
      </Link>

      {/* Header Panel */}
      <div className="p-5 sm:p-6 bg-white border border-border-faint rounded-16 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-12 bg-neutral-100 flex items-center justify-center shrink-0 border border-border-faint">
              <FileText className="w-5 h-5 text-neutral-600" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg font-bold text-accent-black tracking-tight break-words">
                  {displaySource.name}
                </h1>
                <SourceStatusBadge status={displaySource.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <span>Type:</span>
                  <SourceTypeLabel kind={displaySource.kind} showIcon={false} />
                </span>
                <span>•</span>
                <span className="font-mono text-[11px]">ID: {displaySource.id}</span>
              </div>
            </div>
          </div>

          {/* Delete Action */}
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-10 border border-red-200 text-accent-crimson bg-white hover:bg-red-50 text-xs font-semibold transition-colors self-start shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete source</span>
          </button>
        </div>

        {/* Transient polling error indicator */}
        {refreshError ? (
          <p className="text-[11px] text-neutral-400 italic">
            Note: {refreshError} (will retry automatically)
          </p>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="border-b border-border-faint flex gap-6">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-heat-100 text-heat-100"
              : "border-transparent text-neutral-500 hover:text-accent-black"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "chunks"}
          onClick={() => setActiveTab("chunks")}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "chunks"
              ? "border-heat-100 text-heat-100"
              : "border-transparent text-neutral-500 hover:text-accent-black"
          }`}
        >
          Chunks
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" ? (
        <div className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-12 bg-white border border-border-faint space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium">Added</span>
              <p className="text-xs font-semibold text-accent-black">
                {formatDateTime(displaySource.created_at)}
              </p>
            </div>
            <div className="p-4 rounded-12 bg-white border border-border-faint space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium">Last updated</span>
              <p className="text-xs font-semibold text-accent-black">
                {formatDateTime(displaySource.updated_at)}
              </p>
            </div>
            <div className="p-4 rounded-12 bg-white border border-border-faint space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium">Version</span>
              <p className="text-xs font-semibold text-accent-black font-mono">
                v{displaySource.version}
              </p>
            </div>
            <div className="p-4 rounded-12 bg-white border border-border-faint space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium">Chunks</span>
              <p className="text-xs font-semibold text-accent-black font-mono">
                {displaySource.chunk_count}
              </p>
            </div>
          </div>

          {/* Status Specific Notes */}
          {displaySource.status === "queued" || displaySource.status === "processing" ? (
            <div
              role="status"
              className="p-4 rounded-12 bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-xs text-amber-900"
            >
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">This source is being prepared for retrieval.</p>
                <p className="text-[11px] text-amber-700">
                  Background ingest processes the document into searchable chunks. Status automatically refreshes every 5 seconds.
                </p>
              </div>
            </div>
          ) : null}

          {displaySource.status === "failed" ? (
            <div
              role="alert"
              className="p-4 rounded-12 bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-accent-crimson"
            >
              <AlertTriangle className="w-4 h-4 text-accent-crimson shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Ingestion failed</p>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  {displaySource.error_message || "Ingestion failed. No additional reason was provided."}
                </p>
              </div>
            </div>
          ) : null}

          {/* Source Content Preview */}
          <div className="p-5 sm:p-6 bg-white border border-border-faint rounded-16 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-accent-black">Source content</h2>
              <span className="text-[11px] font-mono text-neutral-400">
                {displaySource.content_type || "text/plain"}
              </span>
            </div>

            {displaySource.content_text ? (
              <div className="max-h-96 overflow-y-auto p-4 bg-neutral-50 rounded-10 border border-border-faint">
                <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed break-words">
                  {displaySource.content_text}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic py-4">
                Source content is not available.
              </p>
            )}
          </div>
        </div>
      ) : (
        <ChunkInspector source={displaySource} isPreview={isPreview} />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteSourceModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        workspaceId={workspaceId}
        sourceId={displaySource.id}
        sourceName={displaySource.name}
        onDeleted={() => {
          router.replace(`/workspaces/${workspaceId}/knowledge`);
          router.refresh();
        }}
      />
    </div>
  );
}
