import { generateDeterministicAnalyticsData } from "./fixtures";
import type { AnalyticsDataSource,AnalyticsResult,DateRange } from "./types";

export function createUnavailableDataSource(): AnalyticsDataSource {
  return {
    async fetchAnalytics(_range: DateRange, _signal?: AbortSignal): Promise<AnalyticsResult> {
    void _range;
    void _signal;
      // Per instructions, the backend reporting API (Feature 26) is not implemented yet.
      // We return honest unavailable status without speculative network requests.
      return {
        status: "unavailable",
        message: "Analytics data is not available yet.",
        description: "This workspace's usage reporting is not connected.",
      };
    },
  };
}

export function createFixtureDataSource(): AnalyticsDataSource {
  return {
    async fetchAnalytics(range: DateRange, _signal?: AbortSignal): Promise<AnalyticsResult> {
    void _signal;
      // Simulate quick async resolution
      return {
        status: "ready",
        data: generateDeterministicAnalyticsData(range),
      };
    },
  };
}
