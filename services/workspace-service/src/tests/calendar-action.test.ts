import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@quickstart/errors";
import type { ProviderRegistry } from "../integrations/provider-registry.js";
import type { SecretsClient } from "../clients/secrets.client.js";
import type { IntegrationsRepository } from "../repository/integrations.repository.js";
import { IntegrationsService } from "../services/integrations.service.js";

function makeService(options: { connected?: boolean; tokenExpiresAt?: Date | null } = {}) {
  const repo = {
    getByProvider: async () =>
      options.connected === false
        ? null
        : {
            status: "connected",
            token_expires_at: options.tokenExpiresAt ?? null,
          },
    upsertConnection: async () => ({}),
  } as unknown as IntegrationsRepository;
  const secrets = {
    getIntegrationSecret: async () => ({ accessToken: "google-token", refreshToken: "refresh-token" }),
    storeIntegrationSecret: async () => "secret",
  } as unknown as SecretsClient;
  const registry = {
    getAdapter: () => ({
      provider: "google_calendar",
      capabilities: {},
      getAuthorizationUrl: () => ({ url: "" }),
      exchangeCode: async () => ({ accessToken: "x", grantedScopes: [], accountIdentifier: "x" }),
    }),
  } as unknown as ProviderRegistry;
  return new IntegrationsService(repo, secrets, registry);
}

test("calendar availability only returns slots outside busy periods", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return new Response(
      JSON.stringify({
        calendars: {
          primary: {
            busy: [{ start: "2026-11-03T09:30:00Z", end: "2026-11-03T10:00:00Z" }],
          },
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const service = makeService();
    const result = await service.executeCalendarAction("ws-1", {
      action: "check_availability",
      date: "2026-11-03",
      timezone: "UTC",
      slot_minutes: 30,
      max_slots: 10,
      working_hours: { start: "09:00", end: "11:00" },
    });

    assert.equal(calls[0].url, "https://www.googleapis.com/calendar/v3/freeBusy");
    assert.equal(calls[0].body.timeMin, "2026-11-03T09:00:00.000Z");
    assert.equal(calls[0].body.timeMax, "2026-11-03T11:00:00.000Z");
    assert.equal(calls[0].body.timeZone, "UTC");
    assert.deepEqual(calls[0].body.items, [{ id: "primary" }]);

    const slots = result.slots as Array<{ start: string }>;
    assert.deepEqual(
      slots.map((slot) => slot.start),
      [
        "2026-11-03T09:00:00.000Z",
        "2026-11-03T10:00:00.000Z",
        "2026-11-03T10:30:00.000Z",
      ],
    );
    assert.equal(result.busy_periods, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("booking creates a Google Calendar event with timezone and attendee", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method,
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return new Response(JSON.stringify({ id: "event-1", htmlLink: "https://calendar.example/event-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const service = makeService();
    const result = await service.executeCalendarAction("ws-1", {
      action: "book_slot",
      timezone: "America/New_York",
      start: "2026-11-03T15:00:00Z",
      end: "2026-11-03T15:30:00Z",
      summary: "Consultation — Alex Morgan",
      attendee_email: "alex@example.com",
    });

    assert.equal(
      calls[0].url,
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    );
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].body.summary, "Consultation — Alex Morgan");
    assert.deepEqual(calls[0].body.start, {
      dateTime: "2026-11-03T15:00:00.000Z",
      timeZone: "America/New_York",
    });
    assert.deepEqual(calls[0].body.attendees, [{ email: "alex@example.com" }]);
    assert.equal(result.event_id, "event-1");
    assert.equal(result.html_link, "https://calendar.example/event-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("calendar actions fail closed when Google Calendar is not connected", async () => {
  const service = makeService({ connected: false });
  await assert.rejects(
    () =>
      service.executeCalendarAction("ws-1", {
        action: "check_availability",
        date: "2026-11-03",
      }),
    (err: unknown) => err instanceof AppError && err.code === "VALIDATION_FAILED",
  );
});
