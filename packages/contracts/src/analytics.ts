/**
 * Analytics and Usage Contracts for QuickStart AI Workspace Utility.
 */

export type AnalyticsSummary = {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  conversations: number;
  conversations_trend_pct: number | null;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  estimated_spend_usd: number;
  model_spend_usd: number;
  voice_spend_usd: number;
  voice_minutes: number;
  voice_calls: number;
  billable_acquisition_actions: number;
  as_of: string;
};

export type AnalyticsDailyTokenBucket = {
  date: string; // YYYY-MM-DD (UTC)
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
};

export type AnalyticsDailyLatencyBucket = {
  date: string; // YYYY-MM-DD (UTC)
  p50_ms: number | null;
  p95_ms: number | null;
  concurrent_turns: number;
};

export type AnalyticsServiceUsage = {
  service: string;
  provider: string;
  kind: string;
  units: number;
  unit_label: string;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number;
  is_unpriced: boolean;
};

export type AnalyticsResponse = {
  range: {
    from: string;
    to: string;
    timezone: string;
  };
  summary: AnalyticsSummary;
  daily_tokens: AnalyticsDailyTokenBucket[];
  daily_latency: AnalyticsDailyLatencyBucket[];
  usage_by_service: AnalyticsServiceUsage[];
  previous_period?: {
    from: string;
    to: string;
    total_tokens: number;
    conversations: number;
    estimated_spend_usd: number;
  };
};
