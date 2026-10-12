import { addUtcDays,countInclusiveUtcDays,parseUtcDate } from "./date-range";
import type {
AcquisitionUsageItem,
AnalyticsData,
DailyConversationPoint,
DailyLatencyPoint,
DailyTokensPoint,
DateRange,
HourlyConversationPoint,
ModelUsageItem,
} from "./types";

// Base pseudo-random deterministic hash from string
function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// 24-hour distribution weights (typical SaaS diurnal pattern peaking at 14:00 UTC)
const HOURLY_WEIGHTS = [
  0.015, 0.012, 0.010, 0.010, 0.012, 0.018, // 00-05
  0.025, 0.038, 0.052, 0.065, 0.072, 0.078, // 06-11
  0.082, 0.088, 0.095, 0.085, 0.075, 0.062, // 12-17 (peaks at hour 14)
  0.050, 0.040, 0.035, 0.028, 0.023, 0.018, // 18-23
];

export function generateDeterministicAnalyticsData(range: DateRange): AnalyticsData {
  const daysCount = countInclusiveUtcDays(range.from, range.to);

  // Reference 30-day baseline scale
  const scale = daysCount === 30 ? 1 : daysCount / 30;

  const totalTokens = Math.round(3_840_000 * scale);
  const inputTokens = Math.round(2_880_000 * scale);
  const outputTokens = totalTokens - inputTokens; // Exactly reconcile

  const conversations = Math.round(12_840 * scale);
  const voiceMinutes = Math.round(1_248 * scale);
  const voiceCalls = Math.round(326 * scale);
  const billableAcquisitionActions = Math.round(6_320 * scale);

  // Generate daily points
  const dates: string[] = [];
  let curr = range.from;
  while (curr <= range.to) {
    dates.push(curr);
    curr = addUtcDays(curr, 1);
  }

  // Daily weights for smooth variability
  const rawWeights: number[] = dates.map((d) => {
    const parsed = parseUtcDate(d);
    const dayOfWeek = parsed ? parsed.getUTCDay() : 0;
    // Lower on weekends (0 = Sun, 6 = Sat)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = isWeekend ? 0.6 : 1.0;
    const jitter = 0.85 + (stringHash(d) % 30) / 100; // 0.85 to 1.15
    return base * jitter;
  });
  const sumWeights = rawWeights.reduce((a, b) => a + b, 0);

  // 1. Daily Tokens
  let allocatedInput = 0;
  let allocatedOutput = 0;
  const dailyTokens: DailyTokensPoint[] = dates.map((date, idx) => {
    const isLast = idx === dates.length - 1;
    let dayInput: number;
    let dayOutput: number;

    if (isLast) {
      dayInput = inputTokens - allocatedInput;
      dayOutput = outputTokens - allocatedOutput;
    } else {
      dayInput = Math.round((rawWeights[idx] / sumWeights) * inputTokens);
      dayOutput = Math.round((rawWeights[idx] / sumWeights) * outputTokens);
      allocatedInput += dayInput;
      allocatedOutput += dayOutput;
    }

    return {
      date,
      inputTokens: dayInput,
      outputTokens: dayOutput,
      totalTokens: dayInput + dayOutput,
    };
  });

  // 2. Daily Conversations
  let allocatedConvs = 0;
  const dailyConversations: DailyConversationPoint[] = dates.map((date, idx) => {
    const isLast = idx === dates.length - 1;
    let count: number;

    if (isLast) {
      count = conversations - allocatedConvs;
    } else {
      count = Math.round((rawWeights[idx] / sumWeights) * conversations);
      allocatedConvs += count;
    }

    return {
      date,
      conversations: count,
    };
  });

  // 3. Hourly Conversations (summing strictly to conversations)
  let allocatedHourly = 0;
  const hourlyConversations: HourlyConversationPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const isLast = h === 23;
    let count: number;
    if (isLast) {
      count = conversations - allocatedHourly;
    } else {
      count = Math.round(conversations * HOURLY_WEIGHTS[h]);
      allocatedHourly += count;
    }
    hourlyConversations.push({
      hour: h,
      conversations: count,
    });
  }

  // 4. Daily Latency (smooth variation around 1200ms P50 and 3800ms P95)
  const dailyLatency: DailyLatencyPoint[] = dates.map((date, idx) => {
    const convCount = dailyConversations[idx]?.conversations ?? 0;
    if (convCount === 0) {
      return { date, p50Ms: null, p95Ms: null, sampleCount: 0 };
    }
    const seed = stringHash(date);
    const p50Jitter = ((seed % 200) - 100); // -100 to +100ms
    const p95Jitter = ((seed % 400) - 200); // -200 to +200ms

    return {
      date,
      p50Ms: Math.max(900, 1200 + p50Jitter),
      p95Ms: Math.max(3000, 3800 + p95Jitter),
      sampleCount: convCount * 3, // rough turns count
    };
  });

  // 5. Models (reconcile to totalTokens)
  let gpt4oTokens = Math.round(totalTokens * 0.55);
  let sonnetTokens = Math.round(totalTokens * 0.35);
  let gpt4oMiniTokens = totalTokens - gpt4oTokens - sonnetTokens; // 10% remainder

  // For exact 30d match:
  if (daysCount === 30) {
    gpt4oTokens = 2_112_000;
    sonnetTokens = 1_344_000;
    gpt4oMiniTokens = 384_000;
  }

  const models: ModelUsageItem[] = [
    {
      provider: "OpenAI",
      model: "gpt-4o",
      tokens: gpt4oTokens,
      percentage: 55,
      inputTokens: Math.round(gpt4oTokens * 0.75),
      outputTokens: Math.round(gpt4oTokens * 0.25),
    },
    {
      provider: "Anthropic",
      model: "claude-sonnet",
      tokens: sonnetTokens,
      percentage: 35,
      inputTokens: Math.round(sonnetTokens * 0.75),
      outputTokens: Math.round(sonnetTokens * 0.25),
    },
    {
      provider: "OpenAI",
      model: "gpt-4o-mini",
      tokens: gpt4oMiniTokens,
      percentage: 10,
      inputTokens: Math.round(gpt4oMiniTokens * 0.75),
      outputTokens: Math.round(gpt4oMiniTokens * 0.25),
    },
  ];

  // 6. Acquisitions (reconcile to billableAcquisitionActions)
  let scrapeCount = Math.round(billableAcquisitionActions * (2840 / 6320));
  let crawlCount = Math.round(billableAcquisitionActions * (2160 / 6320));
  let searchCount = Math.round(billableAcquisitionActions * (980 / 6320));
  let mapCount = billableAcquisitionActions - scrapeCount - crawlCount - searchCount;

  if (daysCount === 30) {
    scrapeCount = 2840;
    crawlCount = 2160;
    searchCount = 980;
    mapCount = 340;
  }

  const acquisitions: AcquisitionUsageItem[] = [
    { action: "scrape", label: "Scrape", billableUnits: scrapeCount },
    { action: "crawl", label: "Crawl pages", billableUnits: crawlCount },
    { action: "search", label: "Search", billableUnits: searchCount },
    { action: "map", label: "Map", billableUnits: mapCount },
  ];

  return {
    range,
    summary: {
      totalTokens,
      inputTokens,
      outputTokens,
      conversations,
      latencyP50Ms: 1200,
      latencyP95Ms: 3800,
      voiceMinutes,
      voiceCalls,
      billableAcquisitionActions,
    },
    dailyTokens,
    models,
    dailyConversations,
    hourlyConversations,
    dailyLatency,
    acquisitions,
    voice: {
      minutes: voiceMinutes,
      calls: voiceCalls,
    },
    latencyDefinition: "Model-call turn duration (excluding network transport)",
    coverage: {
      tokens: "complete",
      conversations: "complete",
      latency: "complete",
      acquisitions: "complete",
      voice: "complete",
    },
  };
}
