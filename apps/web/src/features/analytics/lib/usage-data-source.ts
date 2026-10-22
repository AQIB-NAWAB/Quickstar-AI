import type {
  AnalyticsData,
  AnalyticsDataSource,
  AnalyticsResult,
  DateRange,
  DailyLatencyPoint,
  DailyTokensPoint,
  ServiceUsageItem,
} from "./types";
import type { AnalyticsResponse } from "@quickstart/contracts";

export function createUsageLedgerDataSource(workspaceId: string): AnalyticsDataSource {
  return {
    async fetchAnalytics(range: DateRange, signal?: AbortSignal): Promise<AnalyticsResult> {
      try {
        const params = new URLSearchParams({
          from: range.from,
          to: range.to,
          timezone: range.timezone,
        });

        const res = await fetch(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/analytics?${params.toString()}`,
          {
            signal,
            cache: "no-store",
          },
        );

        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          return {
            status: "forbidden",
            message: (body as { error?: { message?: string } })?.error?.message ?? "Access denied.",
          };
        }

        if (res.ok) {
          const payload = (await res.json()) as AnalyticsResponse;
          const s = payload.summary;

          const data: AnalyticsData = {
            range,
            summary: {
              totalTokens: s.total_tokens,
              inputTokens: s.input_tokens,
              outputTokens: s.output_tokens,
              conversations: s.conversations,
              conversationsTrendPct: s.conversations_trend_pct,
              latencyP50Ms: s.latency_p50_ms,
              latencyP95Ms: s.latency_p95_ms,
              estimatedSpendUsd: s.estimated_spend_usd,
              modelSpendUsd: s.model_spend_usd,
              voiceSpendUsd: s.voice_spend_usd,
              voiceMinutes: s.voice_minutes,
              voiceCalls: s.voice_calls,
              billableAcquisitionActions: s.billable_acquisition_actions,
            },
            dailyTokens: payload.daily_tokens.map((d): DailyTokensPoint => ({
              date: d.date,
              inputTokens: d.input_tokens,
              outputTokens: d.output_tokens,
              totalTokens: d.total_tokens,
              estimatedCostUsd: d.estimated_cost_usd,
            })),
            dailyLatency: payload.daily_latency.map((d): DailyLatencyPoint => ({
              date: d.date,
              p50Ms: d.p50_ms,
              p95Ms: d.p95_ms,
              sampleCount: d.concurrent_turns,
              concurrentTurns: d.concurrent_turns,
            })),
            usageByService: payload.usage_by_service.map((u): ServiceUsageItem => ({
              service: u.service,
              provider: u.provider,
              kind: u.kind,
              units: u.units,
              unitLabel: u.unit_label,
              inputTokens: u.input_tokens,
              outputTokens: u.output_tokens,
              estimatedCostUsd: u.estimated_cost_usd,
              isUnpriced: u.is_unpriced,
            })),
            models: payload.usage_by_service
              .filter((u) => u.kind === "model")
              .map((u) => ({
                provider: u.provider,
                model: u.service,
                tokens: u.units,
                percentage: s.total_tokens > 0 ? Math.round((u.units / s.total_tokens) * 100) : 0,
                inputTokens: u.input_tokens ?? undefined,
                outputTokens: u.output_tokens ?? undefined,
              })),
            dailyConversations: payload.daily_latency.map((d) => ({
              date: d.date,
              conversations: d.concurrent_turns,
            })),
            hourlyConversations: [],
            acquisitions: payload.usage_by_service
              .filter((u) => u.kind === "acquisition")
              .map((u) => ({
                action: u.service,
                label: u.service,
                billableUnits: u.units,
              })),
            voice: {
              minutes: s.voice_minutes,
              calls: s.voice_calls,
            },
            latencyDefinition: "Response latency measured from gateway receipt to stream completion.",
            coverage: {
              tokens: "complete",
              models: "complete",
              conversations: "complete",
              latency: "complete",
              acquisition: "complete",
              voice: "complete",
            },
          };

          return { status: "ready", data };
        }

        // If not ok and not 403
        const errBody = await res.json().catch(() => ({}));
        return {
          status: "unavailable",
          message: (errBody as { error?: { message?: string } })?.error?.message ?? "Usage reporting unavailable",
          description: "Could not retrieve authoritative workspace analytics.",
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        return {
          status: "unavailable",
          message: err instanceof Error ? err.message : "Analytics service unreachable",
        };
      }
    },
  };
}
