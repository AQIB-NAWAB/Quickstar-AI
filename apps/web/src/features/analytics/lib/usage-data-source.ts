import type { AnalyticsData, AnalyticsDataSource, AnalyticsResult, DateRange } from "./types";

type UsageEntry = {
  id: string;
  kind: "model" | "acquisition" | "voice" | string;
  units: number;
  unit_label: string | null;
  provider: string | null;
  model: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type UsageListResponse = {
  entries: UsageEntry[];
  sum_units?: number;
  count?: number;
};

function emptySeries(range: DateRange): AnalyticsData {
  return {
    range,
    summary: {
      totalTokens: 0,
      inputTokens: null,
      outputTokens: null,
      conversations: null,
      latencyP50Ms: null,
      latencyP95Ms: null,
      voiceMinutes: 0,
      voiceCalls: null,
      billableAcquisitionActions: 0,
    },
    dailyTokens: [],
    models: [],
    dailyConversations: [],
    hourlyConversations: [],
    dailyLatency: [],
    acquisitions: [],
    voice: { minutes: 0, calls: null },
    latencyDefinition: null,
    coverage: {
      tokens: "partial",
      models: "partial",
      conversations: "unavailable",
      latency: "unavailable",
      acquisition: "partial",
      voice: "partial",
    },
    coverageMessage:
      "Showing usage ledger facts (Feature 26). Daily rollups and latency charts are not shipped yet.",
  };
}

function inRange(iso: string, range: DateRange): boolean {
  const day = iso.slice(0, 10);
  return day >= range.from && day <= range.to;
}

export function createUsageLedgerDataSource(workspaceId: string): AnalyticsDataSource {
  return {
    async fetchAnalytics(range: DateRange, signal?: AbortSignal): Promise<AnalyticsResult> {
      try {
        const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/usage`, {
          signal,
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as UsageListResponse & {
          error?: { message?: string };
        };
        if (!res.ok) {
          if (res.status === 403) {
            return { status: "forbidden", message: body.error?.message ?? "Forbidden" };
          }
          return {
            status: "unavailable",
            message: body.error?.message ?? "Usage ledger unavailable",
            description: "Could not load workspace usage entries.",
          };
        }

        const entries = (body.entries ?? []).filter((e) => inRange(e.created_at, range));
        const data = emptySeries(range);

        let modelUnits = 0;
        let voiceUnits = 0;
        let acquisitionUnits = 0;
        const modelMap = new Map<string, number>();
        const acquisitionMap = new Map<string, number>();
        const daily = new Map<string, { input: number; output: number; total: number }>();

        for (const entry of entries) {
          const day = entry.created_at.slice(0, 10);
          const bucket = daily.get(day) ?? { input: 0, output: 0, total: 0 };
          if (entry.kind === "model") {
            modelUnits += entry.units;
            bucket.total += entry.units;
            const detail = entry.detail ?? {};
            const input = Number(detail.input_tokens ?? 0);
            const output = Number(detail.output_tokens ?? 0);
            bucket.input += input;
            bucket.output += output;
            const key = `${entry.provider ?? "unknown"}:${entry.model ?? "unknown"}`;
            modelMap.set(key, (modelMap.get(key) ?? 0) + entry.units);
          } else if (entry.kind === "voice") {
            voiceUnits += entry.units;
          } else if (entry.kind === "acquisition") {
            acquisitionUnits += entry.units;
            const label = entry.unit_label ?? "action";
            acquisitionMap.set(label, (acquisitionMap.get(label) ?? 0) + entry.units);
          }
          daily.set(day, bucket);
        }

        data.summary.totalTokens = modelUnits;
        data.summary.inputTokens = [...daily.values()].reduce((s, d) => s + d.input, 0) || null;
        data.summary.outputTokens = [...daily.values()].reduce((s, d) => s + d.output, 0) || null;
        data.summary.voiceMinutes = voiceUnits / 60;
        data.summary.billableAcquisitionActions = acquisitionUnits;
        data.voice.minutes = voiceUnits / 60;

        data.dailyTokens = [...daily.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({
            date,
            inputTokens: v.input,
            outputTokens: v.output,
            totalTokens: v.total,
          }));

        const modelTotal = [...modelMap.values()].reduce((s, n) => s + n, 0) || 1;
        data.models = [...modelMap.entries()].map(([key, tokens]) => {
          const [provider, model] = key.split(":");
          return {
            provider,
            model,
            tokens,
            percentage: Math.round((tokens / modelTotal) * 100),
          };
        });

        data.acquisitions = [...acquisitionMap.entries()].map(([action, billableUnits]) => ({
          action,
          label: action,
          billableUnits,
        }));

        return { status: "ready", data };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        return {
          status: "unavailable",
          message: "Usage ledger unreachable",
          description: err instanceof Error ? err.message : "Network error",
        };
      }
    },
  };
}
