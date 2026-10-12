import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSafeWebhookUrl, isBlockedIp } from "./ssrf.js";

test("isBlockedIp flags RFC1918 and loopback", () => {
  assert.equal(isBlockedIp("127.0.0.1"), true);
  assert.equal(isBlockedIp("10.0.0.5"), true);
  assert.equal(isBlockedIp("192.168.1.1"), true);
  assert.equal(isBlockedIp("169.254.169.254"), true);
  assert.equal(isBlockedIp("8.8.8.8"), false);
});

test("assertSafeWebhookUrl rejects http unless allowed", async () => {
  await assert.rejects(
    () => assertSafeWebhookUrl("http://example.com/hook", { allowHttp: false }),
    /HTTPS/,
  );
});

test("assertSafeWebhookUrl rejects private IP literals", async () => {
  await assert.rejects(
    () => assertSafeWebhookUrl("https://127.0.0.1/hook", { allowHttp: false }),
    /private/,
  );
});
