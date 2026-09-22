import assert from "node:assert/strict";
import test from "node:test";
import { extractAuthContext, serializeAuthContext } from "./context.js";

test("auth context round-trip via header", () => {
  const encoded = serializeAuthContext({
    tenantId: "tenant-a",
    actorId: "user-1",
    roles: ["developer"],
    requestId: "req-99",
  });
  const ctx = extractAuthContext({ "x-quickstart-auth-context": encoded });
  assert.ok(ctx);
  assert.equal(ctx.tenantId, "tenant-a");
  assert.equal(ctx.actorId, "user-1");
  assert.deepEqual(ctx.roles, ["developer"]);
});
