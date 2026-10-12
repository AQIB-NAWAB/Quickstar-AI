"use client";

import {
AlertCircle,
Clock3,
FileText,
Info,
MessageCircle,
MousePointer2,
Phone,
RotateCcw,
} from "lucide-react";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import { createUnavailableDataSource } from "../lib/data-source";
import { resolveDateRangeFromSearchParams } from "../lib/date-range";
import { formatCompactNumber,formatExactNumber,formatSeconds } from "../lib/format";
import type { AnalyticsDataSource } from "../lib/types";
import { AcquisitionUsage } from "./acquisition-usage";
import { AnalyticsDateRange } from "./analytics-date-range";
import { ConversationVolumeChart } from "./conversation-volume-chart";
import { MetricCard } from "./metric-card";
import { ModelBreakdownChart } from "./model-breakdown-chart";
import { PeakActivityChart } from "./peak-activity-chart";
import { ResponseLatencyChart } from "./response-latency-chart";
import { TokenConsumptionChart } from "./token-consumption-chart";

interface AnalyticsDashboardProps {
  dataSource?: AnalyticsDataSource;
  isSampleDataBadge?: boolean;
}

export function AnalyticsDashboard({
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

  // Default to honest unavailable source in production unless overridden
  const dataSource = useMemo(() => {
    return propDataSource ?? createUnavailableDataSource();
  }, [propDataSource]);

  const { status, data, message, description, reload } = useAnalyticsData(
    dataSource,
    range,
  );

  function handleSelectPreset(preset: "7d" | "30d") {
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
      className="w-full min-w-0 space-y-5 analytics-feature"
      aria-busy={isLoading}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-accent-black">
              Analytics & usage
            </h1>
            {isSampleDataBadge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-heat-100 border border-orange-200">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs sm:text-[13px] text-neutral-500">
            Understand usage, activity, and response performance.
          </p>
        </div>

        {/* Date Range Selector */}
        <AnalyticsDateRange
          range={range}
          onSelectPreset={handleSelectPreset}
          onSelectCustom={handleSelectCustom}
        />
      </div>

      {/* Unavailable State Banner */}
      {isUnavailable && (
        <div className="p-4 bg-neutral-50 border border-border-faint rounded-12 flex items-start gap-3">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-accent-black">
              {message || "Analytics data is not available yet."}
            </p>
            <p className="text-xs text-neutral-500">
              {description ||
                "This workspace's usage reporting is not connected. Telemetry ledger and usage metrics will activate with Feature 26."}
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

      {/* Six Summary Metric Cards */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total tokens */}
        <MetricCard
          label="Total tokens"
          value={
            summary?.totalTokens !== null && summary?.totalTokens !== undefined
              ? formatCompactNumber(summary.totalTokens)
              : "—"
          }
          subline={
            summary?.inputTokens !== null &&
            summary?.inputTokens !== undefined &&
            summary?.outputTokens !== null &&
            summary?.outputTokens !== undefined
              ? `${formatCompactNumber(summary.inputTokens)} input · ${formatCompactNumber(
                  summary.outputTokens,
                )} output`
              : "Input & output tokens"
          }
          icon={FileText}
          isLoading={isLoading}
        />

        {/* 2. Conversations */}
        <MetricCard
          label="Conversations"
          value={
            summary?.conversations !== null && summary?.conversations !== undefined
              ? formatExactNumber(summary.conversations)
              : "—"
          }
          subline="Started in this period"
          icon={MessageCircle}
          isLoading={isLoading}
        />

        {/* 3. Response latency · P50 */}
        <MetricCard
          label="Response latency · P50"
          value={
            summary?.latencyP50Ms !== null && summary?.latencyP50Ms !== undefined
              ? formatSeconds(summary.latencyP50Ms)
              : "—"
          }
          subline="Median response time"
          icon={Clock3}
          isLoading={isLoading}
        />

        {/* 4. Response latency · P95 */}
        <MetricCard
          label="Response latency · P95"
          value={
            summary?.latencyP95Ms !== null && summary?.latencyP95Ms !== undefined
              ? formatSeconds(summary.latencyP95Ms)
              : "—"
          }
          subline="95th percentile"
          icon={Clock3}
          isLoading={isLoading}
        />

        {/* 5. Voice minutes */}
        <MetricCard
          label="Voice minutes"
          value={
            summary?.voiceMinutes !== null && summary?.voiceMinutes !== undefined
              ? formatExactNumber(summary.voiceMinutes)
              : "—"
          }
          subline={
            summary?.voiceCalls !== null && summary?.voiceCalls !== undefined
              ? `Across ${formatExactNumber(summary.voiceCalls)} calls`
              : "Voice duration in minutes"
          }
          icon={Phone}
          isLoading={isLoading}
        />

        {/* 6. Acquisition actions */}
        <MetricCard
          label="Acquisition actions"
          value={
            summary?.billableAcquisitionActions !== null &&
            summary?.billableAcquisitionActions !== undefined
              ? formatExactNumber(summary.billableAcquisitionActions)
              : "—"
          }
          subline="Billable actions"
          icon={MousePointer2}
          isLoading={isLoading}
        />
      </div>

      {/* Six Chart/Detail Panels in Three Rows */}
      <div className="space-y-4">
        {/* ROW 1: Token consumption (3:2 on desktop) & Model breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 min-w-0">
            <TokenConsumptionChart
              data={data?.dailyTokens ?? []}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-2 min-w-0">
            <ModelBreakdownChart
              models={data?.models ?? []}
              totalTokens={data?.summary?.totalTokens ?? undefined}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* ROW 2: Conversation volume (3:2 on desktop) & Peak activity hours */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 min-w-0">
            <ConversationVolumeChart
              data={data?.dailyConversations ?? []}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-2 min-w-0">
            <PeakActivityChart
              data={data?.hourlyConversations ?? []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* ROW 3: Response latency (equal width) & Acquisition usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="min-w-0">
            <ResponseLatencyChart
              data={data?.dailyLatency ?? []}
              isLoading={isLoading}
            />
          </div>
          <div className="min-w-0">
            <AcquisitionUsage
              acquisitions={data?.acquisitions ?? []}
              totalBillableActions={
                data?.summary?.billableAcquisitionActions ?? undefined
              }
              voiceMinutes={data?.voice?.minutes}
              voiceCalls={data?.voice?.calls}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
