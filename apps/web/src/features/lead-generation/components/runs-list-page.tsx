"use client";

import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { listRuns } from "../lib/client";
import { formatResearchTarget } from "../lib/format";
import type { LeadGenerationRunSummary } from "../lib/types";
import { LeadGenerationNewRunPage } from "./new-run-page";

function CreateQueryOpener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "1") onOpen();
  }, [searchParams, onOpen]);
  return null;
}

function formatRunCreatedDate(iso?: string) {
  if (!iso) return { date: "—", time: "" };
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { date: iso, time: "" };

    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return { date, time };
  } catch {
    return { date: iso, time: "" };
  }
}

function renderRunStatusBadge(status: string) {
  const norm = (status || "").toLowerCase();

  if (norm === "completed_with_errors") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Completed with errors</span>
      </span>
    );
  }

  if (norm === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
        <span>Completed</span>
      </span>
    );
  }

  if (norm === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-900 border border-blue-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
        <span>Running</span>
      </span>
    );
  }

  if (norm === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-900 border border-red-200/80">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <span>Failed</span>
      </span>
    );
  }

  if (norm === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
        <span>Cancelled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80 capitalize">
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
      <span>{norm === "queued" ? "Queued" : norm.replace(/_/g, " ")}</span>
    </span>
  );
}

export function LeadGenerationRunsListPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [runs, setRuns] = useState<LeadGenerationRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState<"all" | "active" | "completed" | "errors">("all");
  const [statusDropdown, setStatusDropdown] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);

  function closeCreate() {
    setCreateOpen(false);
    if (typeof window !== "undefined" && window.location.search.includes("create=1")) {
      router.replace(`/workspaces/${workspaceId}/lead-generation/runs`);
    }
  }

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await listRuns(workspaceId);
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Failed to load runs");
      } else {
        setRuns(res.data.items ?? []);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [workspaceId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Dynamic summary metrics adhering strictly to Section 8 specifications
  const metrics = useMemo(() => {
    const total = runs.length;
    const acceptedLeads = runs.reduce((sum, r) => sum + Number(r.accepted ?? 0), 0);
    const activeRuns = runs.filter((r) => r.status === "queued" || r.status === "running").length;
    const runsWithErrors = runs.filter(
      (r) => r.status === "completed_with_errors" || r.status === "failed"
    ).length;
    const completedClean = runs.filter((r) => r.status === "completed").length;
    return { total, acceptedLeads, activeRuns, runsWithErrors, completedClean };
  }, [runs]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: runs.length,
      active: metrics.activeRuns,
      completed: metrics.completedClean,
      errors: metrics.runsWithErrors,
    };
  }, [runs, metrics]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((run) => {
      // Tab filter
      if (tabFilter === "active" && run.status !== "queued" && run.status !== "running") {
        return false;
      }
      if (tabFilter === "completed" && run.status !== "completed") {
        return false;
      }
      if (
        tabFilter === "errors" &&
        run.status !== "completed_with_errors" &&
        run.status !== "failed"
      ) {
        return false;
      }

      // Dropdown status filter
      if (statusDropdown !== "all" && run.status !== statusDropdown) {
        return false;
      }

      // Search query
      if (!q) return true;
      const categories = (run.brief?.categories ?? []).join(" ").toLowerCase();
      const location = (run.brief?.location ?? "").toLowerCase();
      const id = run.id.toLowerCase();
      return categories.includes(q) || location.includes(q) || id.includes(q);
    });
  }, [runs, tabFilter, statusDropdown, search]);

  return (
    <div className="lead-console lead-runs space-y-5">
      <Suspense fallback={null}><CreateQueryOpener onOpen={openCreate} /></Suspense>

      {/* Header matching 3.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Lead generation</h1>
        </div>

        {/* Action Buttons: Business profile (outlined) + New run (orange) */}
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <Link
            href={`/workspaces/${workspaceId}/lead-generation/profile`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-8 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs transition-colors"
          >
            <Building2 className="w-4 h-4 text-neutral-600" />
            <span>Business profile</span>
          </Link>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-8 text-xs font-semibold bg-heat-100 hover:bg-orange-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New run</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-8 border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Summary Band: Unframed horizontal strip, thin top/bottom rules, 4 columns with subtle vertical separators */}
      <div className="border-y border-neutral-200 bg-white py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
          {/* 1. Total runs */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Total runs</span>
            <div className="text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              {metrics.total}
            </div>
          </div>

          {/* 2. Accepted leads */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Accepted leads</span>
            <div className="flex items-center gap-2 text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{metrics.acceptedLeads}</span>
            </div>
          </div>

          {/* 3. Active runs */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Active runs</span>
            <div className="text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              {metrics.activeRuns}
            </div>
          </div>

          {/* 4. Runs with errors */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Runs with errors</span>
            <div className="flex items-center gap-2 text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              {metrics.runsWithErrors > 0 && (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <span>{metrics.runsWithErrors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs matching 3.png */}
      <div className="flex items-center gap-6 border-b border-neutral-200 overflow-x-auto text-xs no-scrollbar">
        {(
          [
            { id: "all", label: "All runs", count: tabCounts.all },
            { id: "active", label: "Active", count: tabCounts.active },
            { id: "completed", label: "Completed", count: tabCounts.completed },
            { id: "errors", label: "With errors", count: tabCounts.errors },
          ] as const
        ).map((tab) => {
          const isActive = tabFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabFilter(tab.id)}
              className={`pb-3 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 font-medium ${
                isActive
                  ? "border-heat-100 text-heat-100 font-semibold -mb-[1px]"
                  : "border-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`tabular-nums text-[11px] ${
                  isActive ? "text-heat-100 font-bold" : "text-neutral-400 font-normal"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search input, Status dropdown, Refresh icon on far right */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Input: ~360-420px */}
          <div className="relative w-full sm:max-w-[420px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories, location, or run ID..."
              className="w-full h-11 pl-10 pr-3 border border-neutral-300 rounded-8 bg-white focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-neutral-800 placeholder:text-neutral-400 transition-colors"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center">
            <select
              value={statusDropdown}
              onChange={(e) => setStatusDropdown(e.target.value)}
              className="h-11 px-3 border border-neutral-300 rounded-8 bg-white text-neutral-700 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors font-medium cursor-pointer"
              aria-label="Filter by status"
            >
              <option value="all">Status</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="completed_with_errors">Completed with errors</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Refresh button at far right */}
        <button
          type="button"
          onClick={() => void loadData(true)}
          disabled={loading || refreshing}
          className="h-11 w-11 inline-flex items-center justify-center rounded-8 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors shadow-xs shrink-0 self-end sm:self-auto"
          aria-label="Refresh runs"
          title="Refresh runs"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-heat-100" : ""}`} />
        </button>
      </div>

      {loading && !refreshing && (
        <p role="status" className="text-xs text-neutral-500">
          Loading runs…
        </p>
      )}

      {/* Table matching 3.png */}
      <div className="lead-data-table bg-white border border-neutral-200 rounded-8 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-600 font-semibold">
                <th className="py-3 px-4 font-semibold min-w-[220px]">Research target</th>
                <th className="py-3 px-4 font-semibold min-w-[130px]">Location</th>
                <th className="py-3 px-4 font-semibold min-w-[180px]">Status</th>
                <th className="py-3 px-4 font-semibold min-w-[150px]">Accepted / target</th>
                <th className="py-3 px-4 font-semibold min-w-[130px]">Created</th>
                <th className="py-3 px-3 w-[44px] text-right font-normal" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 italic">
                    No research runs found.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const categories = run.brief?.categories ?? [];
                  const primaryTarget = formatResearchTarget(categories);
                  const secondaryCategories =
                    categories.length > 2 ? categories.slice(2).join(", ") : null;
                  const shortId = `#${run.id.slice(0, 8)}`;
                  const location = run.brief?.location || "—";
                  const accepted = Number(run.accepted ?? 0);
                  const target = Number(run.brief?.target_count ?? 0);
                  const attainmentRatio = target > 0 ? Math.min(100, (accepted / target) * 100) : 0;
                  const created = formatRunCreatedDate(run.created_at);

                  return (
                    <tr
                      key={run.id}
                      onClick={() =>
                        router.push(`/workspaces/${workspaceId}/lead-generation/runs/${run.id}`)
                      }
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/workspaces/${workspaceId}/lead-generation/runs/${run.id}`);
                        }
                      }}
                      className="hover:bg-neutral-50/80 transition-colors cursor-pointer select-none outline-none"
                    >
                      {/* 1. Research target */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-neutral-900 leading-tight">
                            {primaryTarget}
                          </p>
                          <p className="text-[12px] text-neutral-500 font-sans">
                            {secondaryCategories ? `${secondaryCategories} · ` : ""}
                            <span className="font-mono text-neutral-400">{shortId}</span>
                          </p>
                        </div>
                      </td>

                      {/* 2. Location */}
                      <td className="py-3.5 px-4 text-neutral-700 font-medium">
                        {location}
                      </td>

                      {/* 3. Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderRunStatusBadge(run.status)}
                      </td>

                      {/* 4. Accepted / target with orange attainment bar */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 w-32">
                          <div className="text-xs font-semibold text-neutral-900 tabular-nums">
                            <span>{accepted}</span>
                            <span className="text-neutral-400 font-normal"> / {target > 0 ? target : "—"}</span>
                          </div>
                          <div
                            className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={accepted}
                            aria-valuemin={0}
                            aria-valuemax={target}
                            aria-label={`Accepted ${accepted} of ${target}`}
                          >
                            <div
                              className="h-full bg-heat-100 rounded-full transition-all duration-300"
                              style={{ width: `${attainmentRatio}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 5. Created (date above time) */}
                      <td className="py-3.5 px-4 text-neutral-600 font-sans text-xs whitespace-nowrap">
                        <div className="space-y-0.5 leading-tight">
                          <p className="text-neutral-700 font-medium">{created.date}</p>
                          <p className="text-[11px] text-neutral-400">{created.time}</p>
                        </div>
                      </td>

                      {/* 6. Chevron right */}
                      <td className="py-3.5 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-neutral-400 inline-block" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 bg-white border-t border-neutral-200 text-xs text-neutral-500">
          {runs.length} {runs.length === 1 ? "run" : "runs"}
        </div>
      </div>

      {/* New Research Run Modal (FeatureDialog) */}
      <FeatureDialog
        open={createOpen}
        onClose={closeCreate}
        title="New research run"
        maxWidthClass="max-w-[850px]"
        roundedClass="rounded-8"
        backdropClass="bg-black/25"
        layout="lead-wizard"
      >
        <LeadGenerationNewRunPage
          workspaceId={workspaceId}
          embedded
          onCancel={closeCreate}
        />
      </FeatureDialog>
    </div>
  );
}
