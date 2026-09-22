import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "./crypto.js";

test("password hash verifies", async () => {
  const hash = await hashPassword("password123");
  assert.ok(await verifyPassword("password123", hash));
  assert.equal(await verifyPassword("wrong", hash), false);
});
