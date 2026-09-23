import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";
import { ErrorCode } from "@quickstart/errors";
import { createAppServer } from "./index.js";

async function withServer(run: (port: number) => Promise<void>): Promise<void> {
  const app = createAppServer();
  const server = await new Promise<Server>((resolve) => {
    const httpServer = app.listen(0, () => resolve(httpServer));
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected bound port");
  }
  try {
    await run(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()));
    });
  }
}

test("GET /healthz returns ok JSON", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok", service: "service-template" });
  });
});

test("unknown route returns platform error envelope", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: { code: string; request_id: string } };
    assert.equal(body.error.code, ErrorCode.NOT_FOUND);
    assert.ok(body.error.request_id.length > 0);
  });
});

test("GET /demo/error returns validation envelope", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/demo/error`);
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, ErrorCode.VALIDATION_FAILED);
  });
});
