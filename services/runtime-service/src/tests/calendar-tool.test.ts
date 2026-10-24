import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { CalendarClient } from "../clients/calendar.client.js";
import { ToolExecutor } from "../services/tool-executor.js";
import type { AgentToolDefinition } from "@quickstart/contracts";

type Received = { url?: string; auth?: string; body: Record<string, unknown> };

async function withCalendarServer(
  handler: (received: Received) => { status: number; body: unknown },
  run: (baseUrl: string, received: Received[]) => Promise<void>,
): Promise<void> {
  const received: Received[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(body) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      const entry = { url: req.url, auth: req.headers.authorization, body: parsed };
      received.push(entry);
      const response = handler(entry);
      res.statusCode = response.status;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(response.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  try {
    await run(`http://127.0.0.1:${port}`, received);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const checkTool: AgentToolDefinition = {
  id: "calendar-check",
  name: "check_calendar_availability",
  description: "Check calendar availability",
  type: "builtin_calendar",
  action: "check_availability",
  timezone: "America/New_York",
  slot_minutes: 30,
  working_hours: { start: "09:00", end: "17:00" },
};

test("calendar tool forwards the action and returns real slots", async () => {
  await withCalendarServer(
    () => ({
      status: 200,
      body: {
        result: {
          action: "check_availability",
          slots: [{ start: "2026-11-03T14:00:00.000Z", end: "2026-11-03T14:30:00.000Z", label: "9:00 AM" }],
        },
      },
    }),
    async (baseUrl, received) => {
      const executor = new ToolExecutor(
        undefined,
        undefined,
        undefined,
        undefined,
        new CalendarClient(baseUrl, "workspace-internal"),
      );
      const result = await executor.execute(
        checkTool,
        { date: "2026-11-03" },
        {
          workspaceId: "ws-1",
          requestId: "req-1",
          toolCallKey: "call-1",
          timeoutMs: 2_000,
        },
      );

      assert.equal(result.ok, true);
      assert.equal(
        received[0].url,
        "/internal/workspaces/ws-1/integrations/google_calendar/actions",
      );
      assert.equal(received[0].auth, "Bearer workspace-internal");
      assert.equal(received[0].body.action, "check_availability");
      assert.equal(received[0].body.date, "2026-11-03");
      assert.equal(received[0].body.timezone, "America/New_York");
      assert.equal(received[0].body.slot_minutes, 30);
      assert.deepEqual(received[0].body.working_hours, { start: "09:00", end: "17:00" });
      assert.match(String(result.content), /9:00 AM/);
    },
  );
});

test("calendar not connected is surfaced as a business precondition, not a crash", async () => {
  await withCalendarServer(
    () => ({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_FAILED",
          message: "Google Calendar is not connected for this workspace.",
        },
      },
    }),
    async (baseUrl) => {
      const executor = new ToolExecutor(
        undefined,
        undefined,
        undefined,
        undefined,
        new CalendarClient(baseUrl, "workspace-internal"),
      );
      const result = await executor.execute(
        checkTool,
        { date: "2026-11-03" },
        {
          workspaceId: "ws-1",
          requestId: "req-2",
          toolCallKey: "call-2",
          timeoutMs: 2_000,
        },
      );
      assert.equal(result.ok, true);
      assert.match(String(result.content), /calendar_not_connected/);
      assert.match(String(result.content), /Apologize/);
    },
  );
});
