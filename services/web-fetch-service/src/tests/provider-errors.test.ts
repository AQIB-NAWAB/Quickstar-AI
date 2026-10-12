import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "@quickstart/errors";
import { ProviderError } from "../domain/types.js";
import { testWebFetchConfig, TEST_WORKSPACE_ID } from "../helpers/test-app.js";
import { AcquisitionOrchestrator } from "../services/acquisition-orchestrator.js";
import { createMemoryInflightCap } from "../lib/inflight-cap.js";
import { createMemoryDailyUnitBudget } from "../lib/daily-budget.js";
import { createMemoryJobRepository } from "../jobs/memory.repository.js";
import { createLogger } from "@quickstart/logging";

test("scrape error envelope preserves permanent source errors for downstream workers", async () => {
  const provider = {
    profileId: "direct_http",
    driver: "direct_http",
    async scrape(): Promise<never> {
      throw new ProviderError("Source page is missing", { retryable: false, httpStatus: 404 });
    },
  };
  const orchestrator = new AcquisitionOrchestrator(
    testWebFetchConfig(),
    {
      get: () => provider,
      listEnabledProfiles: () => [
        {
          id: "direct_http",
          driver: "direct_http",
          enabled: true,
          priority: 0,
          unitCostMicrosScrape: 0,
          unitCostMicrosSearch: 0,
        },
      ],
    },
    createMemoryInflightCap(10),
    createMemoryDailyUnitBudget(100),
    createMemoryJobRepository(),
    createLogger({ service: "provider-errors-test" }),
  );
  await assert.rejects(
    () =>
      orchestrator.scrape({
        workspace_id: TEST_WORKSPACE_ID,
        request_id: "missing-contact",
        url: "https://example.com/contact",
        render_js: false,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.httpStatus === 503 &&
      JSON.stringify(error.details) === JSON.stringify({ retryable: false, upstream_status: 404 }),
  );
});
