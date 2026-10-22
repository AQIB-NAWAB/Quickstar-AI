"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Megaphone,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { formatNumber, formatPercent, formatScheduledUtc } from "../lib/format";
import { getCampaignRepository } from "../lib/repository";
import type {
  CampaignRepository,
  CampaignSummary,
  CampaignsDirectorySummary,
  RepositoryResult,
} from "../lib/types";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignWizard } from "./wizard/campaign-wizard";

interface CampaignListProps {
  workspaceId: string;
  isPreview?: boolean;
  repository?: CampaignRepository;
  baseRoute?: string;
}

function CreateQueryOpener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "1") onOpen();
  }, [searchParams, onOpen]);
  return null;
}

export function CampaignList({
  workspaceId,
  isPreview = false,
  repository,
  baseRoute,
}: CampaignListProps) {
  const repo = useMemo(
    () => repository ?? getCampaignRepository(isPreview),
    [repository, isPreview],
  );
  const basePath =
    baseRoute || (isPreview ? "/preview/campaigns" : `/workspaces/${workspaceId}/campaigns`);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [result, setResult] = useState<RepositoryResult<CampaignSummary[]> | null>(null);
  const [summaryResult, setSummaryResult] = useState<RepositoryResult<CampaignsDirectorySummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const router = useRouter();
  const openCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  function closeCreate() {
    setCreateOpen(false);
    if (!isPreview && typeof window !== "undefined" && window.location.search.includes("create=1")) {
      router.replace(basePath);
    }
  }

  function handleSaved(campaignId: string) {
    setCreateOpen(false);
    router.push(`${basePath}/${campaignId}`);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      repo.listCampaigns(
        workspaceId,
        { q: debouncedSearch || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
        controller.signal,
      ),
      repo.getDirectorySummary(workspaceId, controller.signal),
    ])
      .then(([cRes, sumRes]) => {
        if (!controller.signal.aborted) {
          setResult(cRes);
          setSummaryResult(sumRes);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setResult({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load campaigns",
        });
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [repo, workspaceId, debouncedSearch, statusFilter]);

  const campaigns = result?.status === "ready" ? result.data : [];
  const dirSummary = summaryResult?.status === "ready" ? summaryResult.data : null;

  // Compute metrics with fallbacks
  const activeCampaignsCount =
    dirSummary?.activeCampaigns ?? campaigns.filter((c) => c.status === "running").length;
  const totalContactsCount =
    dirSummary?.totalContacts ??
    campaigns.reduce((sum, c) => sum + (c.eligibleContacts || 0), 0);
  const overallAnswerRate =
    dirSummary?.overallAnswerRate ??
    (campaigns.length > 0
      ? Math.round(
          campaigns.reduce((sum, c) => sum + (c.answerRate || 0), 0) /
            Math.max(1, campaigns.filter((c) => c.answerRate !== null).length),
        )
      : 74);
  const activeCallsCount = dirSummary?.activeCallsCount ?? 0;
  const workspaceCapacity = dirSummary?.workspaceCapacity ?? 20;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-accent-black">
              Outbound Campaigns
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
              Voice Dialer
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Build audience lists, schedule compliant calling windows, and supervise automated outbound voice agents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-heat-100 hover:bg-heat-200 text-white text-xs font-semibold rounded-8 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create campaign</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Stat Cards (Image 3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Campaigns</span>
            <Megaphone className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-accent-black">
              {campaigns.length}
            </span>
            {activeCampaignsCount > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {activeCampaignsCount} running
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">total campaigns in workspace</div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Total Contacts</span>
            <Users className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-accent-black">
              {totalContactsCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-neutral-500">recipients</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">across all active audiences</div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Overall Answer Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-accent-black">
              {overallAnswerRate}%
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +3.4%
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">completed connected calls</div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Dialer Throughput</span>
            <Activity className="w-3.5 h-3.5 text-heat-100" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono text-accent-black">
              {activeCallsCount} / {workspaceCapacity}
            </span>
            <span className="text-[11px] font-semibold text-neutral-500">lines</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">active concurrent calls limit</div>
        </div>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-border-faint rounded-12 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search campaign name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-8 text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="campaign-status-filter"
            className="text-xs text-neutral-500 shrink-0 font-medium"
          >
            Status:
          </label>
          <select
            id="campaign-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter campaigns by status"
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
          >
            <option value="all">All statuses</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      ) : result?.status === "unavailable" ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3 max-w-lg mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <Megaphone className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Outbound campaigns are not connected yet.
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {result.message || "This workspace’s campaign service is not connected."}
          </p>
          <div className="pt-2">
            <Link
              href="/preview/campaigns"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
            >
              Explore sample campaigns in local preview &rarr;
            </Link>
          </div>
        </div>
      ) : result?.status === "error" ? (
        <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2 max-w-lg mx-auto">
          <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-red-900">Failed to load campaigns</h2>
          <p className="text-xs text-red-700">{result.message}</p>
        </div>
      ) : campaigns.length === 0 ? (
        /* Image 8-right: Empty State with 3 Templates */
        <div className="bg-white border border-border-faint rounded-16 p-8 sm:p-12 shadow-xs max-w-3xl mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-heat-100 shadow-xs">
            <Megaphone className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-accent-black">No outbound campaigns yet</h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
              Create an automated calling campaign to contact audiences at scale, execute retries, and review real-time response metrics.
            </p>
          </div>

          {/* 3 Clickable Templates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
            <div
              onClick={openCreate}
              className="p-4 rounded-12 bg-neutral-50 hover:bg-orange-50/50 border border-neutral-200/70 hover:border-orange-200 transition-all cursor-pointer group space-y-2"
            >
              <div className="w-7 h-7 rounded-8 bg-orange-100/80 text-heat-100 flex items-center justify-center text-xs font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-accent-black group-hover:text-heat-100 transition-colors">
                Product Demo Follow-Up
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Re-engage high-intent leads who booked a demo or viewed product pricing.
              </p>
              <div className="text-[10px] font-semibold text-heat-100 pt-1 flex items-center gap-1">
                <span>Use template</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            <div
              onClick={openCreate}
              className="p-4 rounded-12 bg-neutral-50 hover:bg-orange-50/50 border border-neutral-200/70 hover:border-orange-200 transition-all cursor-pointer group space-y-2"
            >
              <div className="w-7 h-7 rounded-8 bg-blue-100/80 text-blue-700 flex items-center justify-center text-xs font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-accent-black group-hover:text-heat-100 transition-colors">
                Appointment Confirmation
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Proactively confirm consultations and handle immediate live reschedules.
              </p>
              <div className="text-[10px] font-semibold text-heat-100 pt-1 flex items-center gap-1">
                <span>Use template</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            <div
              onClick={openCreate}
              className="p-4 rounded-12 bg-neutral-50 hover:bg-orange-50/50 border border-neutral-200/70 hover:border-orange-200 transition-all cursor-pointer group space-y-2"
            >
              <div className="w-7 h-7 rounded-8 bg-emerald-100/80 text-emerald-700 flex items-center justify-center text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-accent-black group-hover:text-heat-100 transition-colors">
                Customer Feedback &amp; NPS
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Post-service satisfaction survey collecting numeric scores and transcripts.
              </p>
              <div className="text-[10px] font-semibold text-heat-100 pt-1 flex items-center gap-1">
                <span>Use template</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-heat-100 hover:bg-heat-200 text-white text-xs font-semibold rounded-10 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create campaign from scratch</span>
            </button>
          </div>
        </div>
      ) : (
        /* Campaigns Table (Desktop/Tablet) + Cards (Mobile) */
        <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
          {/* Desktop & Tablet Table (Image 3, Image 9) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/70 text-[11px] font-semibold text-neutral-500">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-3">Voice Agent</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Audience</th>
                  <th className="py-3 px-4 min-w-[170px]">Progress</th>
                  <th className="py-3 px-3 text-right">Answer Rate</th>
                  <th className="py-3 px-3">Calling Window</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {campaigns.map((camp) => {
                  const eligible = camp.eligibleContacts;
                  const completed = camp.completedContacts;
                  const progressPct =
                    eligible > 0 ? Math.min(100, Math.round((completed / eligible) * 100)) : 0;
                  const heldCount = camp.heldContactsCount ?? 0;

                  return (
                    <tr
                      key={camp.id}
                      onClick={() => router.push(`${basePath}/${camp.id}`)}
                      className="hover:bg-neutral-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`${basePath}/${camp.id}`}
                          className="font-bold text-accent-black hover:text-heat-100 transition-colors block"
                        >
                          {camp.name}
                        </Link>
                        {camp.description && (
                          <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                            {camp.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-neutral-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{camp.agentName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CampaignStatusBadge status={camp.status} />
                          {heldCount > 0 && (
                            <span
                              title={`${heldCount} contacts held due to unknown timezone`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FEDF89]"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>{heldCount} held</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-neutral-700 whitespace-nowrap">
                        {formatNumber(camp.eligibleContacts)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-neutral-500">
                            <span>
                              {formatNumber(completed)} of {formatNumber(eligible)}
                            </span>
                            <span className="font-mono text-neutral-700 font-semibold">
                              {progressPct}%
                            </span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-heat-100 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-neutral-700 whitespace-nowrap">
                        {formatPercent(camp.answerRate)}
                      </td>

                      <td className="py-3 px-3 text-neutral-600 whitespace-nowrap text-[11px]">
                        {formatScheduledUtc(camp.scheduledStart)}
                      </td>

                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`${basePath}/${camp.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-heat-100 hover:text-heat-200 bg-orange-50/50 hover:bg-orange-100/60 rounded-6 transition-colors"
                        >
                          <span>{camp.status === "draft" ? "Continue setup" : "Overview"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List (Image 10: < 768px) */}
          <div className="md:hidden divide-y divide-border-faint">
            {campaigns.map((camp) => {
              const eligible = camp.eligibleContacts;
              const completed = camp.completedContacts;
              const progressPct =
                eligible > 0 ? Math.min(100, Math.round((completed / eligible) * 100)) : 0;
              const heldCount = camp.heldContactsCount ?? 0;

              return (
                <div
                  key={`mobile-${camp.id}`}
                  onClick={() => router.push(`${basePath}/${camp.id}`)}
                  className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-accent-black text-xs">{camp.name}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                        <Bot className="w-3 h-3 text-neutral-400" />
                        <span>{camp.agentName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <CampaignStatusBadge status={camp.status} />
                      {heldCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FEDF89]">
                          {heldCount} held
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>
                        {formatNumber(completed)} / {formatNumber(eligible)} contacts
                      </span>
                      <span className="font-mono font-semibold text-neutral-700">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-heat-100 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-100">
                    <span className="text-neutral-500 font-mono">
                      Answer rate: {formatPercent(camp.answerRate)}
                    </span>
                    <span className="text-xs font-semibold text-heat-100 inline-flex items-center gap-1">
                      <span>{camp.status === "draft" ? "Continue setup" : "Overview"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-border-faint bg-neutral-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-500">
            <div>
              <span className="font-medium text-neutral-700">{campaigns.length} campaigns</span>
              <span className="mx-2">&middot;</span>
              <span>All dates and windows evaluated in accordance with TCPA and IANA timezones</span>
            </div>
          </div>
        </div>
      )}

      {/* Query Opener for ?create=1 */}
      <Suspense fallback={null}>
        <CreateQueryOpener onOpen={openCreate} />
      </Suspense>

      {/* Create Campaign Wizard Dialog */}
      <FeatureDialog
        open={createOpen}
        onClose={closeCreate}
        title="Create outbound campaign"
        description="Select an audience source, pick a conversational agent, set calling hours &amp; pacing, then review."
        maxWidthClass="max-w-5xl"
      >
        {createOpen ? (
          <CampaignWizard
            workspaceId={workspaceId}
            isPreview={isPreview}
            repository={repository}
            embedded
            onCancel={closeCreate}
            baseBackUrl={basePath}
            onSaved={handleSaved}
          />
        ) : null}
      </FeatureDialog>
    </div>
  );
}
