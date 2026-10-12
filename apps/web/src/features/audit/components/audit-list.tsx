"use client";

import {
AlertCircle,
Cog,
Download,
FileClock,
Lock,
Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import { formatAuditUtc } from "../lib/format";
import { getAuditRepository } from "../lib/repository";
import type { AuditEntry,AuditRepository,RepositoryResult } from "../lib/types";
import { AuditCsvExportDialog } from "./audit-csv-export-dialog";
import { AuditEntryDetail } from "./audit-entry-detail";

interface AuditListProps {
  workspaceId: string;
  isPreview?: boolean;
  repository?: AuditRepository;
  initialSelectedEntryId?: string;
}

export function AuditList({
  workspaceId,
  isPreview = false,
  repository,
  initialSelectedEntryId,
}: AuditListProps) {
  const repo = repository || getAuditRepository(isPreview);

  const [searchResource, setSearchResource] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [rangePreset, setRangePreset] = useState<"7d" | "30d" | "custom">("7d");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const [result, setResult] = useState<RepositoryResult<{ entries: AuditEntry[] }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    repo
      .listEntries(workspaceId, {
        resource: searchResource,
        actor: actorFilter,
        actions: actionFilter !== "all" ? [actionFilter] : undefined,
        range: rangePreset,
      })
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setLoading(false);
          // Set initial selection
          if (res.status === "ready" && res.data.entries.length > 0) {
            if (initialSelectedEntryId) {
              const found = res.data.entries.find((e) => e.id === initialSelectedEntryId);
              setSelectedEntry(found || res.data.entries[0]);
            } else if (!selectedEntry) {
              setSelectedEntry(res.data.entries[0]);
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load audit logs",
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, workspaceId, searchResource, actorFilter, actionFilter, rangePreset]);

  const entries = result?.status === "ready" ? result.data.entries : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-accent-black">
              Audit log
            </h1>
            {isPreview && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-50 text-heat-100 border border-orange-200">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Review workspace activity and changes.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
          <span className="inline-flex items-center gap-1.5 text-neutral-400 font-medium text-[11px]">
            <Lock className="w-3.5 h-3.5" />
            <span>Append-only records &middot; Read only</span>
          </span>

          <button
            type="button"
            onClick={() => setIsExportDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-accent-black font-semibold rounded-8 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-border-faint rounded-12 shadow-xs text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search resource ID"
            value={searchResource}
            onChange={(e) => setSearchResource(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-8 text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-heat-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            aria-label="Filter by actor"
            className="bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 text-xs"
          >
            <option value="all">All actors</option>
            <option value="usr_alex">Alex Morgan</option>
            <option value="usr_jordan">Jordan Lee</option>
            <option value="usr_sam">Sam Patel</option>
            <option value="system">System</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action"
            className="bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 text-xs"
          >
            <option value="all">All actions</option>
            <option value="agent.published">agent.published</option>
            <option value="member.role_updated">member.role_updated</option>
            <option value="secret.rotated">secret.rotated</option>
            <option value="knowledge.ingest_failed">knowledge.ingest_failed</option>
            <option value="workspace.updated">workspace.updated</option>
          </select>

          <select
            value={rangePreset}
            onChange={(e) => setRangePreset(e.target.value as "7d" | "30d" | "custom")}
            aria-label="Filter by date range"
            className="bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 text-xs"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>

          <span className="text-[11px] text-neutral-400 hidden xl:inline">
            All timestamps in UTC.
          </span>
        </div>
      </div>

      {/* Main Content Area: Table + Optional Side Panel */}
      {loading ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      ) : result?.status === "unavailable" ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3 max-w-lg mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <FileClock className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Audit logging is not available yet.
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {result.message || "This workspace’s audit logging engine is not connected."}
          </p>
          <div className="pt-2">
            <Link
              href="/preview/audit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
            >
              Explore sample audit logs in visual preview &rarr;
            </Link>
          </div>
        </div>
      ) : result?.status === "error" ? (
        <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2 max-w-lg mx-auto">
          <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-red-900">Failed to load audit logs</h2>
          <p className="text-xs text-red-700">{result.message}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-border-faint rounded-12 p-12 shadow-xs text-center space-y-2">
          <FileClock className="w-8 h-8 text-neutral-400 mx-auto" />
          <h2 className="text-sm font-bold text-accent-black">No audit entries found.</h2>
          <p className="text-xs text-neutral-500">
            Try adjusting your search or date range filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Table Container */}
          <div
            className={`${
              selectedEntry ? "min-w-0 lg:col-span-8" : "lg:col-span-12"
            } bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-faint bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 ">
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-faint">
                  {entries.map((entry) => {
                    const isSelected = selectedEntry?.id === entry.id;
                    const isFailed =
                      entry.action.toLowerCase().includes("failed") ||
                      entry.action.toLowerCase().includes("error");

                    const initials =
                      entry.actor.type === "system"
                        ? null
                        : entry.actor.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-orange-50/50"
                            : "hover:bg-neutral-50/50"
                        }`}
                      >
                        {/* Actor */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {entry.actor.type === "system" ? (
                              <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                                <Cog className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-accent-black truncate">
                                {entry.actor.name}
                              </div>
                              {entry.actor.email && (
                                <div className="text-[10px] text-neutral-400 truncate">
                                  {entry.actor.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action badge */}
                        <td className="py-3 px-3 ">
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                              isFailed
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : isSelected
                                ? "bg-orange-50 text-heat-100 border border-orange-200"
                                : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                            }`}
                          >
                            {entry.action}
                          </span>
                        </td>

                        {/* Resource */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-accent-black">
                            {entry.resource.name}
                          </div>
                          <div className="font-mono text-[10px] text-neutral-400">
                            {entry.resource.id}
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-3 font-mono text-neutral-600  text-[11px]">
                          {formatAuditUtc(entry.occurredAt)}
                        </td>

                        {/* View action button */}
                        <td className="py-3 px-3 text-right ">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntry(entry);
                            }}
                            className={`text-xs font-semibold transition-colors ${
                              isSelected ? "text-heat-100" : "text-neutral-500 hover:text-accent-black"
                            }`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination / Count footer */}
            <div className="px-4 py-3 border-t border-border-faint bg-neutral-50/40 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{entries.length} sample entries</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  className="px-2.5 py-1 rounded-6 border border-neutral-200 bg-white text-neutral-400 cursor-not-allowed"
                >
                  &larr; Previous
                </button>
                <button
                  type="button"
                  disabled
                  className="px-2.5 py-1 rounded-6 border border-neutral-200 bg-white text-neutral-400 cursor-not-allowed"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Right Side Panel: Selected Audit Entry */}
          {selectedEntry && (
            <div className="min-w-0 lg:col-span-4 sticky top-6">
              <AuditEntryDetail
                entry={selectedEntry}
                onClose={() => setSelectedEntry(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* CSV Export Dialog */}
      <AuditCsvExportDialog
        entries={entries}
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
}
