"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  RefreshCw,
  Search,
  StopCircle,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cancelRun, getRun, getRunDeliveries, getRunResults } from "../lib/client";
import type {
  LeadGenerationCandidateResult,
  LeadGenerationDeliveryTask,
  LeadGenerationRunSummary,
} from "../lib/types";
import {
  cleanDomain,
  ensureAbsoluteUrl,
  formatStatusLabel,
  formatResearchTarget,
  formatStopReason,
} from "../lib/format";
import { LeadDetailDrawer } from "./lead-detail-drawer";

function candidateWebsite(candidate: LeadGenerationCandidateResult): string {
  if (candidate.assessment?.website) return candidate.assessment.website;
  if (typeof candidate.url === "string" && candidate.url) return candidate.url;
  if (typeof candidate.domain === "string") return candidate.domain;
  return "";
}

function candidateDomain(candidate: LeadGenerationCandidateResult): string {
  const website = candidateWebsite(candidate);
  if (!website) return "";
  try {
    return new URL(ensureAbsoluteUrl(website)).hostname.replace(/^www\./, "");
  } catch {
    return cleanDomain(website).split(/[/?#]/)[0];
  }
}

function getCandidateInitials(name?: string | null, domain?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (domain && domain.trim()) {
    return cleanDomain(domain).slice(0, 2).toUpperCase();
  }
  return "UN";
}

function renderCandidateOutcomeBadge(status: string) {
  const norm = (status || "").toLowerCase();

  if (norm === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
        <span>Accepted</span>
      </span>
    );
  }

  if (norm === "failed" || norm === "research_failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-900 border border-red-200/80">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <span>Research failed</span>
      </span>
    );
  }

  if (norm === "duplicate") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
        <span>Duplicate</span>
      </span>
    );
  }

  // Default rejected
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
      <span>Rejected</span>
    </span>
  );
}

export function LeadGenerationRunDetailPage({
  workspaceId,
  runId,
}: {
  workspaceId: string;
  runId: string;
}) {
  const [run, setRun] = useState<LeadGenerationRunSummary | null>(null);
  const [results, setResults] = useState<LeadGenerationCandidateResult[]>([]);
  const [deliveries, setDeliveries] = useState<LeadGenerationDeliveryTask[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<LeadGenerationCandidateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Sorting state
  const [candidateTab, setCandidateTab] = useState<"all" | "accepted" | "rejected" | "failed">("all");
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<"all" | "email" | "phone" | "contact" | "none">("all");
  const [sortBy, setSortBy] = useState<"outcome" | "score" | "name">("outcome");
  const [deliveriesOpen, setDeliveriesOpen] = useState(false);

  const isFetchingRef = useRef(false);
  const hasLoadedRunRef = useRef(false);

  const load = useCallback(
    async (isManualRefresh = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (isManualRefresh) setRefreshing(true);

      try {
        const [runRes, resultsRes, deliveriesRes] = await Promise.all([
          getRun(workspaceId, runId),
          getRunResults(workspaceId, runId),
          getRunDeliveries(workspaceId, runId),
        ]);

        if (runRes.data?.run) {
          setRun(runRes.data.run);
          hasLoadedRunRef.current = true;
          setError(null);
        } else if (!hasLoadedRunRef.current && runRes.error) {
          setError(runRes.error.message ?? "Failed to load run");
          return;
        }

        if (resultsRes.data?.items) {
          const items = resultsRes.data.items;
          setResults(items);
          setSelectedCandidate((current) => {
            if (!current) return null;
            return items.find((r) => r.id === current.id) ?? current;
          });
        }

        if (deliveriesRes.data?.items) {
          setDeliveries(deliveriesRes.data.items);
        }
      } finally {
        isFetchingRef.current = false;
        setRefreshing(false);
      }
    },
    [workspaceId, runId]
  );

  useEffect(() => {
    hasLoadedRunRef.current = false;
    void load();
  }, [load]);

  const isRunning = run ? ["queued", "running"].includes(run.status) : false;

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void load();
    }, 3000);
    return () => clearInterval(t);
  }, [isRunning, load]);

  async function onCancel() {
    setCancelling(true);
    await cancelRun(workspaceId, runId);
    setCancelling(false);
    await load(true);
  }

  // Derived counts for summary band
  const totalCandidates = results.length;
  const acceptedCount = results.filter((r) => r.status === "accepted").length;
  const rejectedOrDuplicateCount = results.filter(
    (r) => r.status === "duplicate" || r.status === "rejected"
  ).length;
  const failedCount = results.filter(
    (r) => r.status === "failed" || r.status === "research_failed"
  ).length;

  // Filtered and sorted candidate list
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = results.filter((item) => {
      // Tab filter
      if (candidateTab === "accepted" && item.status !== "accepted") return false;
      if (
        candidateTab === "rejected" &&
        item.status !== "rejected" &&
        item.status !== "duplicate"
      ) {
        return false;
      }
      if (
        candidateTab === "failed" &&
        item.status !== "failed" &&
        item.status !== "research_failed"
      ) {
        return false;
      }

      // Contact availability filter
      const hasEmail = Boolean(item.assessment?.email);
      const hasPhone = Boolean(item.assessment?.phone);
      if (contactFilter === "email" && !hasEmail) return false;
      if (contactFilter === "phone" && !hasPhone) return false;
      if (contactFilter === "contact" && !hasEmail && !hasPhone) return false;
      if (contactFilter === "none" && (hasEmail || hasPhone)) return false;

      // Text search
      if (!q) return true;
      const company = (item.assessment?.company_name || "").toLowerCase();
      const domain = candidateDomain(item).toLowerCase();
      const category = (item.assessment?.category || "").toLowerCase();
      const candidateId = item.id.toLowerCase();
      return company.includes(q) || domain.includes(q) || category.includes(q) || candidateId.includes(q);
    });

    // Sorting (create shallow copy so fetched array is not mutated)
    return [...filtered].sort((a, b) => {
      if (sortBy === "outcome") {
        const order = (s: string) => (s === "accepted" ? 0 : s === "rejected" ? 1 : s === "duplicate" ? 2 : 3);
        const diff = order(a.status) - order(b.status);
        if (diff !== 0) return diff;
        // Secondary sort by fit score descending
        return (b.assessment?.fit_score ?? 0) - (a.assessment?.fit_score ?? 0);
      }
      if (sortBy === "score") {
        return (b.assessment?.fit_score ?? 0) - (a.assessment?.fit_score ?? 0);
      }
      if (sortBy === "name") {
        const nameA = a.assessment?.company_name || candidateDomain(a);
        const nameB = b.assessment?.company_name || candidateDomain(b);
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
  }, [results, candidateTab, contactFilter, search, sortBy]);

  if (!run && !error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <RefreshCw className="h-4 w-4 animate-spin text-heat-100" />
          <span>Loading lead research run…</span>
        </div>
      </div>
    );
  }

  const isCompletedWithErrors = run?.status === "completed_with_errors";
  const isCompleted = run?.status === "completed";
  const isFailed = run?.status === "failed";
  const isCancelled = run?.status === "cancelled";

  // Category-derived heading
  const categories = run?.brief?.categories ?? [];
  const primaryHeading = formatResearchTarget(categories);
  const locationText = run?.brief?.location || null;
  const shortRunId = runId.slice(0, 8);
  const stopReason = formatStopReason(run?.stop_reason);

  return (
    <div className="lead-console lead-results space-y-3">
      {/* 1. Header matching 4.png */}
      <div className="space-y-2">
        <Link
          href={`/workspaces/${workspaceId}/lead-generation/runs`}
          className="text-xs font-semibold text-heat-100 hover:text-orange-600 transition-colors inline-block"
        >
          ← All runs
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
              {primaryHeading}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-sans">
              {locationText ? `${locationText} · ` : ""}
              Run <span className="font-mono text-neutral-400">#{shortRunId}</span>
              {categories.length > 2 && <span> · {categories.slice(2).join(", ")}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {run && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  isCompletedWithErrors
                    ? "bg-amber-50 border-amber-200/80 text-amber-900"
                    : isCompleted
                    ? "bg-emerald-50 border-emerald-200/80 text-emerald-900"
                    : isRunning
                    ? "bg-blue-50 border-blue-200/80 text-blue-900"
                    : isFailed
                    ? "bg-red-50 border-red-200/80 text-red-900"
                    : "bg-neutral-100 border-neutral-200/80 text-neutral-700"
                }`}
              >
                {isCompletedWithErrors || isFailed ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCompleted ? "bg-emerald-600" : isRunning ? "bg-blue-600 animate-pulse" : "bg-neutral-400"
                    }`}
                  />
                )}
                <span>{formatStatusLabel(run.status)}</span>
              </span>
            )}

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="h-9 w-9 inline-flex items-center justify-center rounded-8 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors shadow-xs"
              aria-label="Refresh run results"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-heat-100" : ""}`} />
            </button>

            {/* Cancel Run button (only when active) */}
            {isRunning && (
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void onCancel()}
                className="inline-flex items-center gap-1.5 rounded-8 border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 shadow-xs"
              >
                <StopCircle className="w-3.5 h-3.5 text-neutral-500" />
                <span>{cancelling ? "Cancelling…" : "Cancel run"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stop Reason Alert */}
        {stopReason && !isRunning && (
          <div className="flex items-center gap-2 text-xs font-medium text-amber-800 pt-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Research stopped: {stopReason}.</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-8 border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {/* 2. Summary Band matching 4.png: Candidates, Accepted, Rejected / duplicate, Research failed */}
      <div className="border-y border-neutral-200 bg-white py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
          {/* Candidates */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Candidates</span>
            <div className="text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              {totalCandidates}
            </div>
          </div>

          {/* Accepted */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Accepted</span>
            <div className="flex items-center gap-2 text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{acceptedCount}</span>
            </div>
          </div>

          {/* Rejected / duplicate */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Rejected / duplicate</span>
            <div className="text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              {rejectedOrDuplicateCount}
            </div>
          </div>

          {/* Research failed */}
          <div className="px-5 py-2 sm:py-0">
            <span className="text-xs font-medium text-neutral-500 block">Research failed</span>
            <div className="flex items-center gap-2 text-3xl font-bold text-neutral-900 tracking-tight mt-1.5 tabular-nums">
              {failedCount > 0 && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
              <span>{failedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs matching 4.png */}
      <div className="flex items-center gap-6 border-b border-neutral-200 overflow-x-auto text-xs no-scrollbar">
        {(
          [
            { id: "all", label: "All candidates", count: totalCandidates },
            { id: "accepted", label: "Accepted", count: acceptedCount },
            { id: "rejected", label: "Rejected / duplicate", count: rejectedOrDuplicateCount },
            { id: "failed", label: "Failed", count: failedCount },
          ] as const
        ).map((tab) => {
          const isActive = candidateTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCandidateTab(tab.id)}
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

      {/* 4. Toolbar: Search businesses, Contact availability, Outcome Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Input: ~360-400px */}
          <div className="relative w-full sm:max-w-[380px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search businesses..."
              className="w-full h-11 pl-10 pr-3 border border-neutral-300 rounded-8 bg-white focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-neutral-800 placeholder:text-neutral-400 transition-colors"
            />
          </div>

          {/* Contact availability dropdown */}
          <div className="flex items-center">
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value as any)}
              className="h-11 px-3 border border-neutral-300 rounded-8 bg-white text-neutral-700 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors font-medium cursor-pointer"
              aria-label="Filter by contact availability"
            >
              <option value="all">Contact availability</option>
              <option value="email">Has email</option>
              <option value="phone">Has phone</option>
              <option value="contact">Has contact</option>
              <option value="none">No contact</option>
            </select>
          </div>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-11 pl-8 pr-8 border border-neutral-300 rounded-8 bg-white text-neutral-800 font-medium focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 shadow-xs cursor-pointer appearance-none text-xs"
              aria-label="Sort candidates"
            >
              <option value="outcome">Outcome</option>
              <option value="score">Fit score</option>
              <option value="name">Business name</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 5. Table with Bounded Desktop Viewport & Sticky Header matching 4.png */}
      <div className="bg-white border border-neutral-200 rounded-8 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[calc(100vh-360px)] min-h-[300px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold shadow-xs">
              <tr>
                <th className="py-3 px-4 font-semibold w-[30%] min-w-[240px]">Business</th>
                <th className="py-3 px-4 font-semibold w-[23%] min-w-[190px]">Contact</th>
                <th className="py-3 px-4 font-semibold w-[13%] min-w-[120px]">Location</th>
                <th className="py-3 px-4 font-semibold w-[15%] min-w-[130px]">Fit score</th>
                <th className="py-3 px-4 font-semibold w-[15%] min-w-[130px]">Outcome</th>
                <th className="py-3 px-3 w-[44px] text-right font-normal" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 italic">
                    {isRunning
                      ? "The research agent is discovering and evaluating prospects…"
                      : "No candidate businesses match the current filters."}
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((item) => {
                  const isAccepted = item.status === "accepted";
                  const isSelected = selectedCandidate?.id === item.id;
                  const companyName = item.assessment?.company_name || null;
                  const domain = candidateDomain(item);
                  const initials = getCandidateInitials(companyName, domain);
                  const category = item.assessment?.category || (categories[0] ?? null);

                  const email = item.assessment?.email || null;
                  const phone = item.assessment?.phone || null;
                  const hasContact = Boolean(email || phone);
                  const isResearchFailed =
                    item.status === "failed" || item.status === "research_failed";

                  const location = item.assessment?.location || null;

                  const fitScore = item.assessment?.fit_score;
                  const hasScore = fitScore !== null && fitScore !== undefined && !Number.isNaN(fitScore);
                  const scorePercentage = hasScore ? Math.min(100, Math.max(0, fitScore)) : 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedCandidate(item)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCandidate(item);
                        }
                      }}
                      className={`transition-colors cursor-pointer select-none outline-none ${
                        isSelected
                          ? "bg-orange-50/70 hover:bg-orange-50"
                          : isAccepted
                          ? "bg-white hover:bg-neutral-50/80 border-l-4 border-emerald-500"
                          : "hover:bg-neutral-50/80"
                      }`}
                    >
                      {/* 1. Business */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-6 bg-neutral-100 text-neutral-700 font-semibold text-xs flex items-center justify-center shrink-0 border border-neutral-200/60 uppercase">
                            {initials}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-semibold text-neutral-900 leading-tight truncate">
                              {companyName || domain || "Looking up this site"}
                            </p>
                            {item.status === "rejected" && item.assessment?.reject_reasons?.length ? (
                              <p className="text-[11px] text-neutral-500 truncate">
                                {item.assessment.reject_reasons[0]}
                              </p>
                            ) : null}
                            <div className="flex items-center gap-1.5 text-[12px] text-neutral-500 truncate">
                              {category && <span>{category} ·</span>}
                              {domain ? (
                                <a
                                  href={ensureAbsoluteUrl(candidateWebsite(item))}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-neutral-500 hover:text-heat-100 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{domain}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="font-mono text-neutral-400">
                                  Candidate #{item.id.slice(0, 8)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact details */}
                      <td className="py-3.5 px-4">
                        {hasContact ? (
                          <div className="space-y-1">
                            {email && (
                              <div className="flex items-center gap-1.5 text-neutral-700 truncate">
                                <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <a
                                  href={`mailto:${email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:text-heat-100 hover:underline truncate"
                                >
                                  {email}
                                </a>
                              </div>
                            )}
                            {phone && (
                              <div className="flex items-center gap-1.5 text-neutral-700 font-sans truncate">
                                <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <a
                                  href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:text-heat-100 hover:underline truncate"
                                >
                                  {phone}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : isResearchFailed ? (
                          <div className="flex items-center gap-1.5 text-neutral-400">
                            <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>Not researched</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-neutral-400">
                            <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>No contact found</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Location */}
                      <td className="py-3.5 px-4 text-neutral-700 font-medium">
                        {location || "—"}
                      </td>

                      {/* 4. Fit score with orange bar */}
                      <td className="py-3.5 px-4">
                        {hasScore ? (
                          <div className="space-y-1.5 w-28">
                            <div className="text-xs font-semibold text-neutral-900 tabular-nums">
                              <span>{fitScore}</span>
                              <span className="text-neutral-400 font-normal"> / 100</span>
                            </div>
                            <div
                              className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden"
                              role="progressbar"
                              aria-valuenow={fitScore}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Fit score ${fitScore} out of 100`}
                            >
                              <div
                                className="h-full bg-heat-100 rounded-full transition-all duration-300"
                                style={{ width: `${scorePercentage}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 font-normal">Not assessed</span>
                        )}
                      </td>

                      {/* 5. Outcome Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderCandidateOutcomeBadge(item.status)}
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

        {/* Bounded Footer */}
        <div className="px-4 py-3 bg-white border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-500">
          <div>
            {filteredCandidates.length} {filteredCandidates.length === 1 ? "candidate" : "candidates"}
          </div>
          <div className="text-neutral-400">
            Fit score does not determine acceptance alone.
          </div>
        </div>
      </div>

      {/* 6. Campaign Deliveries Disclosure */}
      <div className="border border-neutral-200 rounded-8 bg-white p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setDeliveriesOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-800 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-neutral-500" />
            <span>Campaign deliveries</span>
            <span className="text-neutral-400 font-normal tabular-nums">
              {deliveries.length}
            </span>
          </div>
          {deliveriesOpen ? (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        {deliveriesOpen && (
          <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2 text-xs">
            {deliveries.length === 0 ? (
              <p className="text-neutral-400 italic">No campaign deliveries for this run.</p>
            ) : (
              <div className="space-y-1.5 divide-y divide-neutral-100">
                {deliveries.map((d) => (
                  <div key={d.id} className="pt-2 flex items-center justify-between text-neutral-700">
                    <div>
                      <p className="font-mono text-neutral-900 font-medium">#{d.id.slice(0, 8)}</p>
                      {d.error_code && <p className="text-[11px] text-red-600">{d.error_code}</p>}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatStatusLabel(d.state)}</span>
                      <p className="text-[11px] text-neutral-400">Attempts: {d.attempts}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Candidate Inspector Drawer (Preserved Researched Details & Evidence) */}
      {selectedCandidate && (
        <LeadDetailDrawer
          candidate={selectedCandidate}
          brief={run?.brief}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  );
}
