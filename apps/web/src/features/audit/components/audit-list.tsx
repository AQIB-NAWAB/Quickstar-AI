"use client";

import {
  AlertCircle,
  ChevronRight,
  Download,
  Eye,
  FileClock,
  Lock,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
import { formatAuditUtc } from "../lib/format";
import { getAuditRepository } from "../lib/repository";
import type { AuditEntry, AuditRepository, RepositoryResult } from "../lib/types";
import { AuditCsvExportDialog } from "./audit-csv-export-dialog";
import { AuditEntryDetail } from "./audit-entry-detail";

interface AuditListProps {
  workspaceId: string;
  isPreview?: boolean;
  repository?: AuditRepository;
  initialSelectedEntryId?: string;
}

const COMMON_ACTIONS = [
  { value: "all", label: "All actions" },
  { value: "api_key.created", label: "api_key.created" },
  { value: "api_key.revoked", label: "api_key.revoked" },
  { value: "integration.connected", label: "integration.connected" },
  { value: "integration.disconnected", label: "integration.disconnected" },
  { value: "member.role_updated", label: "member.role_updated" },
  { value: "secret.rotated", label: "secret.rotated" },
  { value: "webhook.created", label: "webhook.created" },
  { value: "workspace.updated", label: "workspace.updated" },
];

export function AuditList({
  workspaceId,
  isPreview = false,
  repository,
  initialSelectedEntryId,
}: AuditListProps) {
  const repo = repository || getAuditRepository(isPreview);

  const [searchQuery, setSearchQuery] = useState("");
  const actorFilter = "all";
  const [actionFilter, setActionFilter] = useState("all");
  const [rangePreset, setRangePreset] = useState<"7d" | "30d" | "90d" | "custom">("7d");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const [result, setResult] = useState<RepositoryResult<{ entries: AuditEntry[]; total?: number }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const now = new Date();
    const days = rangePreset === "90d" ? 90 : rangePreset === "30d" ? 30 : 7;
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    repo
      .listEntries(workspaceId, {
        q: searchQuery,
        actor: actorFilter,
        actions: actionFilter !== "all" ? [actionFilter] : undefined,
        range: rangePreset,
        fromDate,
        toDate: now.toISOString(),
      })
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setLoading(false);
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
  }, [repo, workspaceId, searchQuery, actorFilter, actionFilter, rangePreset, initialSelectedEntryId]);

  const entries = result?.status === "ready" ? result.data.entries : [];
  const totalCount = result?.status === "ready" ? result.data.total ?? entries.length : 0;

  function getActionBadgeStyle(action: string) {
    const act = action.toLowerCase();
    if (act.includes("failed") || act.includes("error") || act.includes("revoked") || act.includes("deleted")) {
      return "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]";
    }
    if (act.includes("created") || act.includes("connected") || act.includes("added")) {
      return "bg-[#E9F9EF] text-[#027A48] border-[#A6F4C5]";
    }
    return "bg-[#FFF4ED] text-[#B54708] border-[#FEDF89]";
  }

  function getInitials(name?: string) {
    if (!name) return "SY";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="space-y-6">
      {/* Header matching Image 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
              Security &amp; Audit Trail
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E9F9EF] text-[#027A48] border border-[#A6F4C5]">
              <ShieldCheck className="w-3 h-3" />
              Immutable Append-Only
            </span>
            {isPreview && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-50 text-[#FF571A] border border-orange-200">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs text-[#71717A] mt-1">
            Detailed record of administrative actions, credential changes, and system modifications.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
          <span className="inline-flex items-center gap-1.5 text-[#71717A] font-medium text-[11px] hidden md:inline-flex">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-only compliance trail</span>
          </span>

          <button
            type="button"
            onClick={() => setIsExportDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#EAECF0] bg-white hover:bg-[#F8F9FB] text-[#18181B] font-semibold rounded-8 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar matching Image 3 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 border border-[#EAECF0] rounded-12 shadow-xs text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by actor, target, or request ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#EAECF0] rounded-8 text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:ring-1 focus:ring-[#FF571A]"
          >
          </input>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-[#71717A] hover:text-[#18181B]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action"
            className="bg-[#F8F9FB] border border-[#EAECF0] rounded-8 px-2.5 py-1.5 text-[#18181B] focus:outline-none focus:ring-1 focus:ring-[#FF571A] text-xs font-medium"
          >
            {COMMON_ACTIONS.map((act) => (
              <option key={act.value} value={act.value}>
                {act.label}
              </option>
            ))}
          </select>

          <select
            value={rangePreset}
            onChange={(e) => setRangePreset(e.target.value as "7d" | "30d" | "90d" | "custom")}
            aria-label="Filter by date range"
            className="bg-[#F8F9FB] border border-[#EAECF0] rounded-8 px-2.5 py-1.5 text-[#18181B] focus:outline-none focus:ring-1 focus:ring-[#FF571A] text-xs font-medium"
          >
            <option value="7d">Last 7 days (UTC)</option>
            <option value="30d">Last 30 days (UTC)</option>
            <option value="90d">Last 90 days (UTC)</option>
          </select>

          <span className="text-[11px] text-[#71717A] font-mono pl-1 hidden xl:inline">
            {totalCount} events indexed
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-[#EAECF0] rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-[#F8F9FB] rounded-4 w-1/4 animate-pulse" />
          <div className="h-12 bg-[#F8F9FB] rounded-8 w-full animate-pulse" />
          <div className="h-12 bg-[#F8F9FB] rounded-8 w-full animate-pulse" />
          <div className="h-12 bg-[#F8F9FB] rounded-8 w-full animate-pulse" />
        </div>
      ) : result?.status === "unavailable" ? (
        <div className="bg-white border border-[#EAECF0] rounded-12 p-8 shadow-xs text-center space-y-3 max-w-lg mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-[#F8F9FB] flex items-center justify-center mx-auto text-[#71717A]">
            <FileClock className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-[#18181B]">
            Audit logging service unreachable
          </h2>
          <p className="text-xs text-[#71717A] leading-relaxed">
            {result.message || "This workspace’s audit logging engine is currently not responding."}
          </p>
        </div>
      ) : result?.status === "error" ? (
        <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-12 p-6 text-center space-y-2 max-w-lg mx-auto">
          <AlertCircle className="w-5 h-5 text-[#B42318] mx-auto" />
          <h2 className="text-sm font-semibold text-[#B42318]">Failed to load audit logs</h2>
          <p className="text-xs text-[#912018]">{result.message}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-[#EAECF0] rounded-12 p-12 shadow-xs text-center space-y-2">
          <FileClock className="w-8 h-8 text-[#71717A] mx-auto" />
          <h2 className="text-sm font-bold text-[#18181B]">No audit events found</h2>
          <p className="text-xs text-[#71717A]">
            Try adjusting your search query, action filter, or date range.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Audit Entries List / Table Container */}
          <div
            className={`${
              selectedEntry ? "min-w-0 lg:col-span-7 xl:col-span-8" : "lg:col-span-12"
            } space-y-4`}
          >
            {/* Desktop Table (hidden on mobile < 768px) */}
            <div className="hidden md:block bg-white border border-[#EAECF0] rounded-12 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EAECF0] bg-[#F8F9FB] text-[11px] font-semibold text-[#71717A]">
                      <th className="py-2.5 px-3">Timestamp (UTC)</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Target</th>
                      <th className="py-2.5 px-3">Origin IP &amp; Geo</th>
                      <th className="py-2.5 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECF0]">
                    {entries.map((entry) => {
                      const isSelected = selectedEntry?.id === entry.id;
                      const initials = getInitials(entry.actor.name);
                      const badgeStyle = getActionBadgeStyle(entry.action);

                      return (
                        <tr
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          className={`cursor-pointer transition-colors hover:bg-[#F8F9FB] ${
                            isSelected
                              ? "bg-[#FFF4ED]/40 border-l-4 border-l-[#FF571A]"
                              : "border-l-4 border-l-transparent"
                          }`}
                        >
                          {/* Timestamp */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-[#52525B]">
                            {formatAuditUtc(entry.occurredAt)}
                          </td>

                          {/* Actor */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#EAECF0] text-[#18181B] font-bold text-[10px] flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="truncate max-w-[130px]">
                                <span className="font-semibold text-[#18181B] block truncate">
                                  {entry.actor.name}
                                </span>
                                {entry.actor.role && (
                                  <span className="text-[10px] text-[#71717A] capitalize block">
                                    {entry.actor.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`font-mono px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}
                            >
                              {entry.action}
                            </span>
                          </td>

                          {/* Target */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="truncate max-w-[140px]">
                              <span className="font-mono text-[#18181B] text-[11px] block truncate">
                                {entry.resource.name}
                              </span>
                              <span className="font-mono text-[#71717A] text-[10px]">
                                {entry.resource.type}
                              </span>
                            </div>
                          </td>

                          {/* Origin IP & Geo */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-[#71717A]">
                            <div className="font-mono text-[10px] text-[#18181B]">
                              {entry.originIp || "192.0.2.1"}
                            </div>
                            <div className="text-[10px] text-[#71717A]">
                              {entry.countryCode || "US"}
                            </div>
                          </td>

                          {/* Inspect Action */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEntry(entry);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-6 text-[11px] font-medium transition-colors ${
                                isSelected
                                  ? "bg-[#FF571A] text-white"
                                  : "bg-[#F8F9FB] hover:bg-[#EAECF0] text-[#18181B]"
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stacked Cards matching Image 7 (visible on mobile < 768px) */}
            <div className="block md:hidden space-y-3">
              {entries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;
                const badgeStyle = getActionBadgeStyle(entry.action);
                const initials = getInitials(entry.actor.name);

                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`bg-white border rounded-12 p-3.5 shadow-xs space-y-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[#FF571A] ring-1 ring-[#FF571A]"
                        : "border-[#EAECF0]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#EAECF0] text-[#18181B] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-[#18181B] block">
                            {entry.actor.name}
                          </span>
                          <span className="text-[10px] text-[#71717A] font-mono">
                            {formatAuditUtc(entry.occurredAt)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-mono px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}
                      >
                        {entry.action}
                      </span>
                    </div>

                    <div className="text-[11px] bg-[#F8F9FB] p-2 rounded-8 flex items-center justify-between">
                      <div>
                        <span className="text-[#71717A] text-[10px] block">Target</span>
                        <span className="font-mono text-[#18181B] text-[11px]">
                          {entry.resource.type}: {entry.resource.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntry(entry);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF571A] text-white rounded-6 text-[10px] font-semibold"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drawer: Audit Entry Detail */}
          {selectedEntry && (
            <div className="min-w-0 lg:col-span-5 xl:col-span-4 sticky top-6">
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
        workspaceId={workspaceId}
        entries={entries}
        filters={{
          q: searchQuery,
          actor: actorFilter,
          actions: actionFilter !== "all" ? [actionFilter] : undefined,
          range: rangePreset,
        }}
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
}
