import assert from "node:assert/strict";
import test from "node:test";
import { createAppServer } from "./index.js";

test("GET /healthz returns ok JSON", async () => {
  const server = createAppServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected bound port");
  }

  const res = await fetch(`http://127.0.0.1:${address.port}/healthz`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", service: "service-template" });

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});
