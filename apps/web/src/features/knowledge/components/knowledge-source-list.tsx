"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { KnowledgeSource } from "../lib/types";
import { getSource, listSources } from "../lib/client";
import { SourceStatusBadge } from "./source-status-badge";
import { SourceTypeLabel } from "./source-type-label";
import { AddSourceModal } from "./add-source-modal";
import { DeleteSourceModal } from "./delete-source-modal";
import { KnowledgeNavSwitcher } from "./knowledge-nav-switcher";
import { formatDateOnly, mapBackendStatusToPresentation, mapSourceKindToType } from "../lib/format";

interface KnowledgeSourceListProps {
  workspaceId: string;
}

const PAGE_SIZE = 10;

export function KnowledgeSourceList({ workspaceId }: KnowledgeSourceListProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Local Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Menu
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<KnowledgeSource | null>(null);
  const [menuPosition, setMenuPosition] = useState({left: 0, top: 0});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Notification announcement for screen readers
  const [announcement, setAnnouncement] = useState<string | null>(null);

  async function fetchSources(silent = false) {
    if (!silent) setIsLoading(true);
    setError(null);

    const res = await listSources(workspaceId, 100);
    if (!silent) setIsLoading(false);

    if (res.sources) {
      setSources(res.sources);
    } else if (res.error) {
      if (!silent) setError(res.error.message || "Failed to load knowledge sources");
    }
  }

  useEffect(() => {
    void fetchSources();
  }, [workspaceId]);

  // Click outside listener for ellipsis menus
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!(e.target instanceof Element) || !e.target.closest("[data-source-actions]")) {
        setOpenMenuId(null);
      }
    }
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenMenuId(null); };
    document.addEventListener("keydown", escape);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => { document.removeEventListener("mousedown", handleOutsideClick); document.removeEventListener("keydown", escape); };
  }, []);

  // Polling for nonterminal items in loaded list
  const hasProcessing = useMemo(() => {
    return sources.some((s) => s.status === "queued" || s.status === "processing");
  }, [sources]);

  // Filtered & Searched sources
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      // Search matching by name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      // Status filter matching
      if (statusFilter !== "all") {
        const { presentation } = mapBackendStatusToPresentation(s.status);
        if (presentation !== statusFilter) return false;
      }

      // Type filter matching
      if (typeFilter !== "all") {
        const { typeKey } = mapSourceKindToType(s.kind);
        if (typeKey !== typeFilter) return false;
      }

      return true;
    });
  }, [sources, searchQuery, statusFilter, typeFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // Paginated slice
  const totalLoaded = filteredSources.length;
  const totalPages = Math.max(1, Math.ceil(totalLoaded / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSources = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * PAGE_SIZE;
    return filteredSources.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSources, validCurrentPage]);

  const visiblePendingIds = paginatedSources.filter(source => source.status === "queued" || source.status === "processing").map(source => source.id).join(",");
  const [pollError, setPollError] = useState<string | null>(null);
  useEffect(() => {
    if (!visiblePendingIds) return;
    let cancelled = false, running = false, stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function poll() {
      if (cancelled || running || stopped || document.hidden) return;
      running = true;
      try {
        const results = await Promise.all(visiblePendingIds.split(",").map(id => getSource(workspaceId, id, controller.signal)));
        if (cancelled) return;
        stopped = results.some(result => [401, 403, 404].includes(result.status ?? 0));
        setPollError(results.some(result => result.error) ? "Could not refresh status" : null);
        setSources(previous => previous.map(source => results.find(result => result.source?.id === source.id)?.source ?? source));
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) setPollError("Could not refresh status");
      } finally {
        running = false;
        if (!cancelled && !stopped && !document.hidden) timer = setTimeout(poll, 5000);
      }
    }
    const visibility = () => { clearTimeout(timer); if (!document.hidden) void poll(); };
    timer = setTimeout(poll, 5000);
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [workspaceId, visiblePendingIds]);

  function handleSourceDeleted(deletedId: string) {
    setSources((prev) => prev.filter((s) => s.id !== deletedId));
    setAnnouncement("Source deleted. Indexed-content cleanup has been scheduled.");
    setDeletingSource(null);
  }

  function handleSourceCreated(newSource: KnowledgeSource) {
    setSources((prev) => [newSource, ...prev]);
    setAnnouncement(`Added knowledge source "${newSource.name}".`);
  }

  return (
    <div className="console-feature knowledge-feature space-y-6" ref={menuContainerRef}>
      {/* Screen Reader Live Announcement */}
      {announcement ? (
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      ) : null}

      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-accent-black tracking-tight">
              Knowledge
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
              {sources.length} loaded
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Manage the information your agents can retrieve.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <KnowledgeNavSwitcher workspaceId={workspaceId} />
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add source</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search sources"
              placeholder="Search sources..."
              className="w-full pl-9 pr-3 py-2 rounded-10 border border-border-faint bg-white text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-10 border border-border-faint bg-white text-xs font-medium text-accent-black focus:outline-none focus:ring-2 focus:ring-heat-24 transition-shadow"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-10 border border-border-faint bg-white text-xs font-medium text-accent-black focus:outline-none focus:ring-2 focus:ring-heat-24 transition-shadow"
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              <option value="file">File</option>
              <option value="url">URL</option>
              <option value="text">Plain text</option>
            </select>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400">
          Search and filters operate on loaded sources.
        </p>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="border border-border-faint rounded-10 bg-white p-6 space-y-4 animate-pulse">
          <div className="h-4 bg-neutral-200 rounded w-1/4" />
          <div className="h-10 bg-neutral-100 rounded" />
          <div className="h-10 bg-neutral-100 rounded" />
          <div className="h-10 bg-neutral-100 rounded" />
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-10 text-center space-y-3">
          <p className="text-xs font-semibold text-accent-crimson">{error}</p>
          <button
            type="button"
            onClick={() => void fetchSources()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-border-faint text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : sources.length === 0 ? (
        <div className="p-12 bg-white border border-border-faint rounded-10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-accent-black">No knowledge sources yet</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Connect documents, articles, or guides so your agents can retrieve context during conversations.
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add source</span>
          </button>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="p-10 bg-white border border-border-faint rounded-10 text-center space-y-3 shadow-sm">
          <p className="text-xs font-semibold text-accent-black">No sources match your filters</p>
          <p className="text-xs text-neutral-400">Try adjusting your query or resetting filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
            className="px-3 py-1.5 rounded-8 bg-neutral-100 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="border border-border-faint rounded-10 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-neutral-500 font-medium">
                  <th scope="col" className="py-3 px-4 font-semibold">Source</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Type</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Status</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Added</th>
                  <th scope="col" className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {paginatedSources.map((source) => {
                  return (
                    <tr
                      key={source.id}
                      className="hover:bg-heat-8/40 transition-colors group"
                    >
                      {/* Source Name & Detail Link */}
                      <td data-label="Source" className="py-2 px-4 min-w-[220px]">
                        <div className="space-y-1">
                          <Link
                            href={`/workspaces/${workspaceId}/knowledge/${source.id}`}
                            className="font-semibold text-accent-black hover:text-heat-100 transition-colors inline-flex items-center gap-2 group-hover:underline"
                          >
                            <SourceTypeLabel kind={source.kind} showIcon={true} iconOnly className="!text-neutral-500" />
                            <span className="break-words">{source.name}</span>
                          </Link>
                          {source.status === "failed" && source.error_message ? (
                            <p className="text-[11px] text-accent-crimson leading-tight break-words">
                              {source.error_message}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* Type */}
                      <td data-label="Type" className="py-2 px-4 whitespace-nowrap">
                        <SourceTypeLabel kind={source.kind} showIcon={false} />
                      </td>

                      {/* Status */}
                      <td data-label="Status" className="py-2 px-4 whitespace-nowrap">
                        <SourceStatusBadge status={source.status} />
                      </td>

                      {/* Added Timestamp */}
                      <td data-label="Added" className="py-2 px-4 whitespace-nowrap text-neutral-500">
                        {formatDateOnly(source.created_at)}
                      </td>

                      {/* Actions Ellipsis Menu */}
                      <td data-label="Actions" className="py-2 px-4 text-right whitespace-nowrap relative">
                        <div data-source-actions className="inline-block text-left">
                          <button
                            type="button"
                            onClick={(event) => {
                              const rect = event.currentTarget.getBoundingClientRect();
                              setMenuPosition({left: Math.max(16, rect.right - 144), top: Math.min(rect.bottom + 4, window.innerHeight - 100)});
                              setOpenMenuId(openMenuId === source.id ? null : source.id);
                            }}
                            aria-expanded={openMenuId === source.id}
                            className="p-1 rounded-6 text-neutral-400 hover:text-accent-black hover:bg-neutral-100 transition-colors"
                            aria-label={`Actions for ${source.name}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === source.id ? (
                            <div style={menuPosition} className="fixed w-36 bg-white border border-border-faint rounded-10 shadow-sm py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                              <Link
                                href={`/workspaces/${workspaceId}/knowledge/${source.id}`}
                                onClick={() => setOpenMenuId(null)}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                                <span>View details</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDeletingSource(source);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-crimson hover:bg-red-50 transition-colors text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete source</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 py-3 border-t border-border-faint flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
            <div>
              Showing {Math.min((validCurrentPage - 1) * PAGE_SIZE + 1, totalLoaded)}–
              {Math.min(validCurrentPage * PAGE_SIZE, totalLoaded)} of {totalLoaded} loaded sources
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  className="px-2.5 py-1 rounded-8 border border-border-faint bg-white text-xs font-medium hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-8 text-xs font-medium transition-colors ${
                      pageNum === validCurrentPage
                        ? "border border-heat-40 text-heat-100 bg-white font-semibold"
                        : "border border-border-faint bg-white hover:bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="px-2.5 py-1 rounded-8 border border-border-faint bg-white text-xs font-medium hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {pollError && <p role="status" className="text-xs text-accent-crimson">{pollError}</p>}
      {/* Processing Status Polling Note */}
      {hasProcessing ? (
        <p className="text-[11px] text-neutral-400 italic">
          Ingestion status refreshes every 5 seconds while processing.
        </p>
      ) : null}

      {/* Add Source Modal */}
      <AddSourceModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        workspaceId={workspaceId}
        onSourceCreated={handleSourceCreated}
      />

      {/* Delete Source Modal */}
      {deletingSource ? (
        <DeleteSourceModal
          open={Boolean(deletingSource)}
          onClose={() => setDeletingSource(null)}
          workspaceId={workspaceId}
          sourceId={deletingSource.id}
          sourceName={deletingSource.name}
          onDeleted={() => handleSourceDeleted(deletingSource.id)}
        />
      ) : null}
    </div>
  );
}
