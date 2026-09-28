import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authHeaders,
  TEST_WORKSPACE_ID,
  withWebFetchServer,
} from "../helpers/test-app.js";

describe("web-fetch scrape", () => {
  it("returns fake scrape with usage", async () => {
    await withWebFetchServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/scrape`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: TEST_WORKSPACE_ID,
          request_id: "req-scrape-1",
          url: "https://example.com/page",
        }),
      });
      assert.equal(response.status, 200);
      const json = (await response.json()) as {
        text: string;
        provider: string;
        usage: { units: number; action: string };
      };
      assert.match(json.text, /fake-content/);
      assert.equal(json.provider, "fake");
      assert.equal(json.usage.units, 1);
      assert.equal(json.usage.action, "scrape");
    });
  });

  it("rejects missing internal token", async () => {
    await withWebFetchServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: TEST_WORKSPACE_ID,
          request_id: "req-scrape-2",
          url: "https://example.com/page",
        }),
      });
      assert.equal(response.status, 401);
    });
  });

  it("enforces daily acquisition budget", async () => {
    await withWebFetchServer(
      async ({ baseUrl }) => {
        const body = {
          workspace_id: TEST_WORKSPACE_ID,
          request_id: "req-budget",
          url: "https://example.com/a",
        };
        const first = await fetch(`${baseUrl}/internal/scrape`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        assert.equal(first.status, 200);

        const second = await fetch(`${baseUrl}/internal/scrape`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...body, request_id: "req-budget-2" }),
        });
        assert.equal(second.status, 429);
        const envelope = (await second.json()) as { error: { message: string } };
        assert.match(envelope.error.message, /Acquisition budget exceeded/);
      },
      { dailyUnitsPerWorkspace: 1 },
    );
  });

  it("enforces in-flight cap", async () => {
    await withWebFetchServer(
      async ({ baseUrl }) => {
        const body = {
          workspace_id: TEST_WORKSPACE_ID,
          request_id: "req-cap",
          url: "https://example.com/fake-hang",
        };
        const [a, b] = await Promise.all([
          fetch(`${baseUrl}/internal/scrape`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(body),
          }),
          fetch(`${baseUrl}/internal/scrape`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ ...body, request_id: "req-cap-2" }),
          }),
        ]);
        const statuses = [a.status, b.status].sort();
        assert.deepEqual(statuses, [200, 429]);
      },
      { maxInflight: 1 },
    );
  });

  it("opens circuit after repeated provider failures", async () => {
    await withWebFetchServer(
      async ({ baseUrl }) => {
        const payload = {
          workspace_id: TEST_WORKSPACE_ID,
          url: "https://example.com/x",
        };
        for (let i = 0; i < 3; i++) {
          const response = await fetch(`${baseUrl}/internal/scrape`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ ...payload, request_id: `req-circuit-${i}` }),
          });
          assert.equal(response.status, 503);
        }
        const blocked = await fetch(`${baseUrl}/internal/scrape`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ ...payload, request_id: "req-circuit-blocked" }),
        });
        assert.equal(blocked.status, 503);
      },
      {
        circuitFailureThreshold: 3,
        providerProfiles: [
          {
            id: "fake_fail",
            driver: "fake",
            enabled: true,
            priority: 0,
            unitCostMicrosScrape: 0,
            unitCostMicrosSearch: 0,
          },
        ],
      },
    );
  });

  it("search returns fake results", async () => {
    await withWebFetchServer(async ({ baseUrl }) => {
      const response = await fetch(`${baseUrl}/internal/search`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: TEST_WORKSPACE_ID,
          request_id: "req-search-1",
          query: "quickstart",
        }),
      });
      assert.equal(response.status, 200);
      const json = (await response.json()) as { results: unknown[]; provider: string };
      assert.equal(json.provider, "fake");
      assert.ok(json.results.length >= 1);
    });
  });

  it("crawl job completes asynchronously", async () => {
    await withWebFetchServer(async ({ baseUrl }) => {
      const crawlRes = await fetch(`${baseUrl}/internal/crawl`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workspace_id: TEST_WORKSPACE_ID,
          request_id: "req-crawl-1",
          idempotency_key: "idem-crawl-1",
          seed_url: "https://example.com/",
          max_pages: 1,
        }),
      });
      assert.equal(crawlRes.status, 202);
      const { job_id } = (await crawlRes.json()) as { job_id: string };

      let status = "queued";
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 50));
        const jobRes = await fetch(
          `${baseUrl}/internal/jobs/${job_id}?workspace_id=${TEST_WORKSPACE_ID}`,
          { headers: authHeaders() },
        );
        assert.equal(jobRes.status, 200);
        const job = (await jobRes.json()) as { status: string };
        status = job.status;
        if (status === "ready" || status === "failed") break;
      }
      assert.equal(status, "ready");
    });
  });

  it("does not log olostep api key", async () => {
    const secret = "olostep-test-secret-key-do-not-log-abcdef";
    const lines: string[] = [];
    const logger = {
      info: (event: string, fields?: Record<string, unknown>) => {
        lines.push(`${event} ${JSON.stringify(fields ?? {})}`);
      },
      error: () => {},
      warn: () => {},
      debug: () => {},
    };

    const { createProviderRegistry } = await import("../providers/registry.js");
    const { AcquisitionOrchestrator } = await import("../services/acquisition-orchestrator.js");
    const { createMemoryJobRepository } = await import("../jobs/memory.repository.js");
    const { createMemoryInflightCap } = await import("../lib/inflight-cap.js");
    const { createMemoryDailyUnitBudget } = await import("../lib/daily-budget.js");
    const { testWebFetchConfig } = await import("../helpers/test-app.js");

    const config = testWebFetchConfig({
      providerProfiles: [
        {
          id: "olostep",
          driver: "olostep",
          enabled: true,
          priority: 0,
          unitCostMicrosScrape: 500,
          unitCostMicrosSearch: 800,
          apiKey: secret,
        },
      ],
    });
    const registry = createProviderRegistry(config);
    const orchestrator = new AcquisitionOrchestrator(
      config,
      registry,
      createMemoryInflightCap(10),
      createMemoryDailyUnitBudget(100),
      createMemoryJobRepository(),
      logger as import("@quickstart/logging").Logger,
    );

    try {
      await orchestrator.scrape({
        workspace_id: TEST_WORKSPACE_ID,
        request_id: "req-secret",
        url: "https://example.com/",
        render_js: true,
      });
    } catch {
      // network expected without mock
    }

    const joined = lines.join("\n");
    assert.equal(joined.includes(secret), false);
  });
});
