import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EmailCampaignsService } from "./email-campaigns.service.js";
import type { EmailCampaignsRepository } from "../repository/email-campaigns.repository.js";
import type { SecretsClient } from "../clients/secrets.client.js";

function makeService(): EmailCampaignsService {
  return new EmailCampaignsService(
    {} as EmailCampaignsRepository,
    {} as SecretsClient,
  );
}

const baseCampaign = {
  mode: "generic",
  subject: "Campaign subject",
  html: "<p>Campaign body</p>",
  brief: "campaign brief",
  fromName: "Sender",
};

const fallbackLead = {
  email: "lead@example.com",
  name: "Jane",
  company: "Acme Dental",
};

describe("resolveEmailForRecipient", () => {
  it("uses the generic campaign content when no follow-up is configured", async () => {
    const service = makeService();
    const email = await service.resolveEmailForRecipient(
      baseCampaign,
      { personalized: null },
      null,
      fallbackLead,
      "Sender",
      "ws-1",
    );
    assert.equal(email.subject, "Campaign subject");
    assert.equal(email.html, "<p>Campaign body</p>");
  });

  it("prefers the stored personalized email for personalized campaigns", async () => {
    const service = makeService();
    const email = await service.resolveEmailForRecipient(
      { ...baseCampaign, mode: "personalized", subject: null, html: null },
      { personalized: { subject: "Hi Jane", html: "<p>Personal</p>" } },
      null,
      fallbackLead,
      "Sender",
      "ws-1",
    );
    assert.equal(email.subject, "Hi Jane");
    assert.equal(email.html, "<p>Personal</p>");
  });

  it("uses the current follow-up step's generic content", async () => {
    const service = makeService();
    const email = await service.resolveEmailForRecipient(
      baseCampaign,
      { personalized: null },
      { mode: "generic", subject: "Following up", html: "<p>Follow-up body</p>" },
      fallbackLead,
      "Sender",
      "ws-1",
    );
    assert.equal(email.subject, "Following up");
    assert.equal(email.html, "<p>Follow-up body</p>");
  });

  it("falls back to the deterministic template when nothing else matches", async () => {
    const service = makeService();
    const email = await service.resolveEmailForRecipient(
      { mode: "generic", subject: null, html: null, brief: "brief", fromName: "Sender" },
      { personalized: null },
      null,
      fallbackLead,
      "Sender",
      "ws-1",
    );
    assert.ok(email.subject.length > 0);
    assert.ok(email.html.includes("Hi Jane"));
    assert.equal(email.source, "fallback");
  });

  it("personalized follow-ups fall back to the template without a model gateway", async () => {
    const previousToken = process.env.MODEL_GATEWAY_INTERNAL_TOKEN;
    delete process.env.MODEL_GATEWAY_INTERNAL_TOKEN;
    try {
      const service = makeService();
      const email = await service.resolveEmailForRecipient(
        { ...baseCampaign, mode: "personalized", subject: null, html: null },
        { personalized: { subject: "First", html: "<p>First</p>" } },
        { mode: "personalized", brief: "follow-up brief" },
        fallbackLead,
        "Sender",
        "ws-1",
      );
      assert.equal(email.source, "fallback");
      assert.ok(email.html.includes("Jane"));
    } finally {
      if (previousToken) process.env.MODEL_GATEWAY_INTERNAL_TOKEN = previousToken;
    }
  });
});
