"use client";

import { AlertCircle,Megaphone,Plus,Search } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import { formatNumber,formatPercent,formatScheduledUtc } from "../lib/format";
import { getCampaignRepository } from "../lib/repository";
import type { CampaignRepository,CampaignSummary,RepositoryResult } from "../lib/types";
import { CampaignStatusBadge } from "./campaign-status-badge";

interface CampaignListProps {
  workspaceId: string;
  isPreview?: boolean;
  repository?: CampaignRepository;
  baseRoute?: string;
}

export function CampaignList({
  workspaceId,
  isPreview = false,
  repository,
  baseRoute,
}: CampaignListProps) {
  const repo = repository || getCampaignRepository(isPreview);
  const basePath = baseRoute || (isPreview ? "/preview/campaigns" : `/workspaces/${workspaceId}/campaigns`);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [result, setResult] = useState<RepositoryResult<CampaignSummary[]> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    repo
      .listCampaigns(workspaceId, { q: search, status: statusFilter })
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load campaigns",
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, workspaceId, search, statusFilter]);

  const campaigns = result?.status === "ready" ? result.data : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-accent-black">
            Campaigns
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Create outbound calling campaigns and follow their progress.
          </p>
        </div>
        <Link
          href={`${basePath}/new`}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-heat-100 hover:bg-heat-200 text-white text-xs font-semibold rounded-10 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create campaign
        </Link>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-border-faint rounded-12 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search campaign name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-8 text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="campaign-status-filter" className="text-xs text-neutral-500 shrink-0 font-medium">Status:</label>
          <select
            id="campaign-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter campaigns by status"
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      ) : result?.status === "unavailable" ? (
        /* Honest Unavailable Message when backend is not connected */
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3 max-w-lg mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <Megaphone className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Outbound campaigns are not available yet.
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
        /* Known Empty */
        <div className="bg-white border border-border-faint rounded-12 p-12 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto text-heat-100">
            <Megaphone className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">No campaigns yet.</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Create a campaign to choose an audience, agent, and calling schedule.
          </p>
          <div className="pt-2">
            <Link
              href={`${basePath}/new`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-heat-100 hover:bg-heat-200 text-white text-xs font-medium rounded-8 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create campaign
            </Link>
          </div>
        </div>
      ) : (
        /* Campaigns Table */
        <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Campaign</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Audience</th>
                  <th className="py-2.5 px-4 min-w-[160px]">Progress</th>
                  <th className="py-2.5 px-3 text-right">Answer rate</th>
                  <th className="py-2.5 px-4">Scheduled</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint text-xs">
                {campaigns.map((camp) => {
                  const eligible = camp.eligibleContacts;
                  const completed = camp.completedContacts;
                  const progressPct =
                    eligible > 0 ? Math.min(100, Math.round((completed / eligible) * 100)) : 0;

                  return (
                    <tr
                      key={camp.id}
                      className="hover:bg-neutral-50/50 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`${basePath}/${camp.id}`}
                          className="font-bold text-accent-black hover:text-heat-100 transition-colors line-clamp-1"
                        >
                          {camp.name}
                        </Link>
                        {camp.description && (
                          <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                            {camp.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-neutral-600 whitespace-nowrap">
                        {camp.agentName}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <CampaignStatusBadge status={camp.status} />
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
                            <span className="font-mono text-neutral-700">{progressPct}%</span>
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

                      <td className="py-3 px-4 text-neutral-600 whitespace-nowrap text-[11px]">
                        {formatScheduledUtc(camp.scheduledStart)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`${basePath}/${camp.id}`}
                          className="inline-flex items-center text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
                        >
                          {camp.status === "draft" ? "Continue setup" : "View"}
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
    </div>
  );
}
