"use client";

import {
  AlertCircle,
  Clock3,
  Coins,
  Database,
  Info,
  MessageSquare,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import { createUnavailableDataSource } from "../lib/data-source";
import { resolveDateRangeFromSearchParams } from "../lib/date-range";
import { formatCompactNumber, formatExactNumber, formatSeconds } from "../lib/format";
import type { AnalyticsDataSource } from "../lib/types";
import { createUsageLedgerDataSource } from "../lib/usage-data-source";
import { AnalyticsDateRange } from "./analytics-date-range";
import { ChartCard } from "./chart-card";
import { LatencyConcurrencyChart } from "./charts/latency-concurrency-chart";
import { StackedBars } from "./charts/stacked-bars";
import { UsageByServiceTable } from "./usage-by-service-table";

interface AnalyticsDashboardProps {
  workspaceId?: string;
  dataSource?: AnalyticsDataSource;
  isSampleDataBadge?: boolean;
}

export function AnalyticsDashboard({
  workspaceId,
  dataSource: propDataSource,
  isSampleDataBadge = false,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active date range resolved from URL
  const range = useMemo(() => {
    const rangeParam = searchParams.get("range");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    return resolveDateRangeFromSearchParams(rangeParam, fromParam, toParam);
  }, [searchParams]);

  // Use authoritative usage & analytics data source when workspaceId is present
  const dataSource = useMemo(() => {
    if (propDataSource) return propDataSource;
    if (workspaceId) return createUsageLedgerDataSource(workspaceId);
    return createUnavailableDataSource();
  }, [propDataSource, workspaceId]);

  const { status, data, message, description, reload } = useAnalyticsData(
    dataSource,
    range,
  );

  function handleSelectPreset(preset: "7d" | "30d" | "90d") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    params.delete("from");
    params.delete("to");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSelectCustom(from: string, to: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const isLoading = status === "loading";
  const isUnavailable = status === "unavailable";
  const isError = status === "error";

  const summary = data?.summary;

  return (
    <div
      className="w-full min-w-0 space-y-6 analytics-feature"
      aria-busy={isLoading}
    >
      {/* Page Header matching Image 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18181B]">
              Analytics & Usage
            </h1>
            {isSampleDataBadge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-[#FF571A] border border-orange-200">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs sm:text-[13px] text-[#71717A]">
            Monitor token consumption, conversation throughput, latency trends, and estimated service costs.
          </p>
        </div>

        {/* Date Controls */}
        <AnalyticsDateRange
          range={range}
          onSelectPreset={handleSelectPreset}
          onSelectCustom={handleSelectCustom}
        />
      </div>

      {/* Unavailable State Banner */}
      {isUnavailable && (
        <div className="p-4 bg-neutral-50 border border-[#EAECF0] rounded-12 flex items-start gap-3">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#18181B]">
              {message || "Analytics data is not available yet."}
            </p>
            <p className="text-xs text-neutral-500">
              {description ||
                "This workspace's usage reporting is not connected. Telemetry ledger and usage metrics will activate once usage events are recorded."}
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {isError && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-12 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message || "Failed to load analytics data."}</span>
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-6 bg-white border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Exactly Four KPI Cards (Image 1 / Image 7 Responsive 2x2 on tablet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total tokens */}
        <div className="bg-white border border-[#EAECF0] rounded-12 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717A]">Total tokens</span>
            <div className="w-9 h-9 rounded-8 bg-neutral-100 flex items-center justify-center text-neutral-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">
              {summary?.totalTokens !== null && summary?.totalTokens !== undefined
                ? formatCompactNumber(summary.totalTokens)
                : "—"}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#71717A] pt-1">
              <span>
                Input{" "}
                <strong className="text-[#64748B] font-semibold">
                  {summary?.inputTokens !== null && summary?.inputTokens !== undefined
                    ? formatCompactNumber(summary.inputTokens)
                    : "—"}
                </strong>
              </span>
              <span>
                Output{" "}
                <strong className="text-[#FF571A] font-semibold">
                  {summary?.outputTokens !== null && summary?.outputTokens !== undefined
                    ? formatCompactNumber(summary.outputTokens)
                    : "—"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Conversations */}
        <div className="bg-white border border-[#EAECF0] rounded-12 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717A]">Conversations</span>
            <div className="w-9 h-9 rounded-8 bg-blue-50 flex items-center justify-center text-blue-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">
              {summary?.conversations !== null && summary?.conversations !== undefined
                ? formatExactNumber(summary.conversations)
                : "—"}
            </div>
            <div className="flex items-center gap-1.5 text-xs pt-1">
              {summary?.conversationsTrendPct !== null && summary?.conversationsTrendPct !== undefined ? (
                <span className="inline-flex items-center gap-1 text-[#027A48] font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {summary.conversationsTrendPct >= 0 ? "+" : ""}
                    {summary.conversationsTrendPct.toFixed(1)}% vs prior {range.preset}
                  </span>
                </span>
              ) : (
                <span className="text-[#71717A]">Across active threads</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Median latency */}
        <div className="bg-white border border-[#EAECF0] rounded-12 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717A]">Median latency</span>
            <div className="w-9 h-9 rounded-8 bg-neutral-100 flex items-center justify-center text-neutral-600">
              <Clock3 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">
              {summary?.latencyP50Ms !== null && summary?.latencyP50Ms !== undefined
                ? `${summary.latencyP50Ms} ms`
                : "—"}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#71717A] pt-1">
              <span>p95</span>
              <strong className="text-[#18181B] font-semibold">
                {summary?.latencyP95Ms !== null && summary?.latencyP95Ms !== undefined
                  ? formatSeconds(summary.latencyP95Ms)
                  : "—"}
              </strong>
            </div>
          </div>
        </div>

        {/* 4. Estimated spend */}
        <div className="bg-white border border-[#EAECF0] rounded-12 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717A]">Estimated spend</span>
            <div className="w-9 h-9 rounded-8 bg-neutral-100 flex items-center justify-center text-neutral-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">
              {summary?.estimatedSpendUsd !== null && summary?.estimatedSpendUsd !== undefined
                ? `$${summary.estimatedSpendUsd.toFixed(2)}`
                : "—"}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#71717A] pt-1">
              <span>
                Model{" "}
                <strong className="text-[#18181B] font-semibold">
                  {summary?.modelSpendUsd !== null && summary?.modelSpendUsd !== undefined
                    ? `$${summary.modelSpendUsd.toFixed(2)}`
                    : "—"}
                </strong>
              </span>
              <span>
                Voice{" "}
                <strong className="text-[#18181B] font-semibold">
                  {summary?.voiceSpendUsd !== null && summary?.voiceSpendUsd !== undefined
                    ? `$${summary.voiceSpendUsd.toFixed(2)}`
                    : "—"}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Side-by-Side Charts (Image 1 / Stacked on Tablet & Mobile Image 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Token Consumption */}
        <ChartCard
          title="Daily token consumption"
          legend={[
            { label: "Input tokens", color: "#64748B" },
            { label: "Output tokens", color: "#FF571A" },
          ]}
          isLoading={isLoading}
        >
          <StackedBars data={data?.dailyTokens ?? []} height={200} />
        </ChartCard>

        {/* Latency & Concurrency trend */}
        <ChartCard
          title="Latency & Concurrency trend"
          legend={[
            { label: "Latency (ms)", color: "#64748B" },
            { label: "Concurrent turns", color: "#FF571A" },
          ]}
          isLoading={isLoading}
        >
          <LatencyConcurrencyChart data={data?.dailyLatency ?? []} height={200} />
        </ChartCard>
      </div>

      {/* Usage by Service Table matching Image 1 */}
      <UsageByServiceTable
        items={data?.usageByService ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
