"use client";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { listRuns } from "../lib/client";
import type { LeadGenerationRunSummary } from "../lib/types";
import { LeadGenerationNewRunPage } from "./new-run-page";

function CreateQueryOpener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "1") onOpen();
  }, [searchParams, onOpen]);
  return null;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LeadGenerationRunsListPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [runs, setRuns] = useState<LeadGenerationRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);

  function closeCreate() {
    setCreateOpen(false);
    if (typeof window !== "undefined" && window.location.search.includes("create=1")) {
      router.replace(`/workspaces/${workspaceId}/lead-generation/runs`);
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listRuns(workspaceId);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "Failed to load runs");
    } else {
      setRuns(res.data.items ?? []);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Aggregate Metrics (styled identically to analytics MetricCard)
  const metrics = useMemo(() => {
    const total = runs.length;
    const completed = runs.filter((r) => r.status === "completed").length;
    const totalAccepted = runs.reduce((sum, r) => sum + Number(r.accepted ?? 0), 0);
    const totalTarget = runs.reduce((sum, r) => sum + Number(r.brief?.target_count ?? 0), 0);
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, totalAccepted, successRate };
  }, [runs]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((run) => {
      if (statusFilter !== "all" && run.status !== statusFilter) return false;
      if (!q) return true;
      const categories = (run.brief?.categories ?? []).join(" ").toLowerCase();
      const location = (run.brief?.location ?? "").toLowerCase();
      const id = run.id.toLowerCase();
      return categories.includes(q) || location.includes(q) || id.includes(q);
    });
  }, [runs, search, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-faint">
        <div>
          <h1 className="text-2xl font-bold text-accent-black tracking-tight">
            Lead generation
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage research runs to discover and qualify prospective leads.
          </p>
        </div>

        {/* Action Buttons: Clean & Aligned */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Link
            href={`/workspaces/${workspaceId}/lead-generation/profile`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 text-xs font-medium border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black shadow-xs transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-neutral-500" />
            <span>Profile</span>
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-8 text-xs font-semibold bg-heat-100 hover:bg-heat-200 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New run</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards (Matches Analytics Style) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white border border-border-faint rounded-12 p-4 min-h-[104px] flex flex-col justify-between hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-neutral-500">Total runs</span>
            <Layers className="w-4 h-4 text-neutral-400 shrink-0" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-bold tracking-tight text-accent-black tabular-nums block">
              {metrics.total}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 truncate">Recorded batches</div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-4 min-h-[104px] flex flex-col justify-between hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-neutral-500">Accepted leads</span>
            <Sparkles className="w-4 h-4 text-neutral-400 shrink-0" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-bold tracking-tight text-heat-100 tabular-nums block">
              {metrics.totalAccepted}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 truncate">Qualified candidates</div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-4 min-h-[104px] flex flex-col justify-between hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-neutral-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-neutral-400 shrink-0" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-bold tracking-tight text-accent-black tabular-nums block">
              {metrics.completed}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 truncate">Finished runs</div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-4 min-h-[104px] flex flex-col justify-between hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-neutral-500">Completion rate</span>
            <Target className="w-4 h-4 text-neutral-400 shrink-0" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-bold tracking-tight text-accent-black tabular-nums block">
              {metrics.successRate}%
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 truncate">Completed ratio</div>
        </div>
      </div>

      {/* Toolbar: Search and Filter (Matches Leads and Campaigns) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-border-faint rounded-12 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search category, location, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-8 text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="runs-status-filter" className="text-xs text-neutral-500 shrink-0 font-medium">
              Status:
            </label>
            <select
              id="runs-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Refresh runs"
            className="p-1.5 rounded-8 border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-accent-black transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="flex items-center gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Content Area */}
      {loading ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded w-1/4 animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="bg-white border border-border-faint rounded-12 p-12 text-center shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            {runs.length === 0 ? "No research runs yet" : "No runs match your filter"}
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {runs.length === 0
              ? "Start a run to discover prospects matching your business profile."
              : "Try adjusting your search query or status filter."}
          </p>
          <div className="pt-2">
            {runs.length === 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-heat-100 hover:bg-heat-200 text-white text-xs font-semibold rounded-8 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create run</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="px-3 py-1.5 text-xs text-neutral-600 border border-neutral-200 bg-neutral-50 rounded-8 hover:bg-neutral-100 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Run</th>
                  <th className="py-2.5 px-3">Target categories</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Accepted</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint text-xs">
                {filteredRuns.map((run) => {
                  const targetCount = Number(run.brief?.target_count ?? 1);
                  const accepted = Number(run.accepted ?? 0);
                  const isCompleted = run.status === "completed";
                  const isRunning = run.status === "running";

                  return (
                    <tr
                      key={run.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      {/* Run ID */}
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-700 font-medium">
                        #{run.id.slice(0, 8)}
                      </td>

                      {/* Categories */}
                      <td className="py-3 px-3 text-neutral-800">
                        {(run.brief?.categories ?? []).join(", ") || "—"}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 text-neutral-600">
                        {run.brief?.location || "Any location"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isRunning
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : run.status === "failed"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-neutral-100 text-neutral-700 border-neutral-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCompleted
                                ? "bg-emerald-500"
                                : isRunning
                                ? "bg-amber-500 animate-pulse"
                                : run.status === "failed"
                                ? "bg-red-500"
                                : "bg-neutral-400"
                            }`}
                          />
                          <span className="capitalize">{run.status}</span>
                        </span>
                      </td>

                      {/* Accepted */}
                      <td className="py-3 px-3 font-medium text-neutral-900 tabular-nums">
                        {accepted} <span className="text-neutral-400 font-normal">/ {targetCount}</span>
                      </td>

                      {/* Created */}
                      <td className="py-3 px-3 text-neutral-500 text-[11px]">
                        {formatDate(run.created_at)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/workspaces/${workspaceId}/lead-generation/runs/${run.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Query Param Opener */}
      <Suspense fallback={null}>
        <CreateQueryOpener onOpen={openCreate} />
      </Suspense>

      {/* Modal Dialog */}
      <FeatureDialog
        open={createOpen}
        onClose={closeCreate}
        title="New research run"
        description="Configure target category and constraints."
        maxWidthClass="max-w-2xl"
      >
        {createOpen ? (
          <LeadGenerationNewRunPage workspaceId={workspaceId} embedded onCancel={closeCreate} />
        ) : null}
      </FeatureDialog>
    </div>
  );
}
