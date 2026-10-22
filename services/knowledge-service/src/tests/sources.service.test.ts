import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SourcesService } from "../services/sources.service.js";
import { importPublicUrlText } from "../lib/url-import.js";

describe("SourcesService and Ingestion Boundaries", () => {
  test("importPublicUrlText enforces HTTPS and rejects invalid protocols", async () => {
    await assert.rejects(
      async () => {
        await importPublicUrlText("http://example.com/insecure");
      },
      (err: any) => {
        assert.equal(err.code, "INVALID_URL");
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await importPublicUrlText("ftp://example.com/file");
      },
      (err: any) => {
        assert.equal(err.code, "INVALID_URL");
        return true;
      }
    );
  });

  test("importPublicUrlText rejects SSRF targets like private IP ranges and localhost", async () => {
    const dangerousUrls = [
      "https://localhost/admin",
      "https://127.0.0.1:8080/secret",
      "https://169.254.169.254/latest/meta-data/",
      "https://10.0.0.1/internal",
      "https://192.168.1.1/router",
    ];

    for (const url of dangerousUrls) {
      await assert.rejects(
        async () => {
          await importPublicUrlText(url);
        },
        (err: any) => {
          assert.ok(
            ["FORBIDDEN_URL", "INVALID_URL", "FETCH_FAILED"].includes(err.code),
            `Expected SSRF rejection for ${url}, got ${err.code}`
          );
          return true;
        }
      );
    }
  });

  test("rejects plain text exceeding 50,000 characters", async () => {
    const mockRepo: any = {};
    const mockQueue: any = {};
    const mockStore: any = {};
    const mockOpenSearch: any = {};

    const service = new SourcesService(
      mockRepo,
      mockQueue,
      mockStore,
      mockOpenSearch
    );

    const oversizedText = "A".repeat(50_001);

    await assert.rejects(
      async () => {
        await service.createSource("ws_123", {
          name: "Oversized Source",
          type: "text",
          content: oversizedText,
        });
      },
      (err: any) => {
        assert.equal(err.code, "CONTENT_TOO_LARGE");
        return true;
      }
    );
  });

  test("metadata-only rename updates name without bumping version or re-enqueueing", async () => {
    let updateNameCalled = false;
    let enqueueCalled = false;

    const mockRepo: any = {
      get: async (workspaceId: string, id: string) => ({
        id,
        workspace_id: workspaceId,
        name: "Original Name",
        kind: "text",
        status: "ready",
        version: 1,
        content_text: "Existing stable content",
      }),
      updateName: async (workspaceId: string, id: string, name: string) => {
        updateNameCalled = true;
        return {
          id,
          workspace_id: workspaceId,
          name,
          kind: "text",
          status: "ready",
          version: 1,
          content_text: "Existing stable content",
        };
      },
    };

    const mockQueue: any = {
      enqueue: async () => {
        enqueueCalled = true;
      },
    };
    const mockStore: any = {};
    const mockOpenSearch: any = {};

    const service = new SourcesService(
      mockRepo,
      mockQueue,
      mockStore,
      mockOpenSearch
    );

    const updated = await service.updateSource("ws_123", "src_abc", {
      name: "Renamed Policy Document",
    });

    assert.equal(updated.name, "Renamed Policy Document");
    assert.equal(updated.version, 1, "Version must remain unchanged on metadata-only rename");
    assert.equal(updated.status, "ready", "Status must remain ready");
    assert.ok(updateNameCalled, "Should call updateName repository method");
    assert.ok(!enqueueCalled, "Should NOT enqueue ingest job for metadata-only rename");
  });
});
