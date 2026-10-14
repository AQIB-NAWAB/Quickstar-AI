import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";

const SPOKEN_STYLE = [
  "Speak as this published QuickStart AI agent on a live voice call.",
  "Use the agent instructions and product facts below. Do not invent pricing, security claims, or product features that are not written there.",
  "If a detail is missing, say you are not sure and offer to have the QuickStart team follow up.",
  "Answer in one or two short spoken sentences as soon as the visitor finishes a thought.",
  "If the visitor asks for a person, a human, or a teammate, say exactly: I'm switching you to a teammate now. Stop after that sentence.",
  "No markdown, lists, URLs, or stage directions.",
].join(" ");

const FALLBACK_BRIEF = [
  "You are the voice of QuickStart AI, an embeddable support platform for website chat and voice.",
  "Help with the product, how to embed it, and what the published agent is allowed to say.",
  SPOKEN_STYLE,
].join(" ");

type AgentJson = {
  name?: string;
  instructions?: string;
  production_version_id?: string | null;
};

type VersionJson = {
  snapshot?: { name?: string; instructions?: string };
};

async function getJson<T>(url: string, token: string, requestId: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "x-request-id": requestId,
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * Load the same published agent the website chat uses, plus a short knowledge
 * slice, so Gemini Live speaks as QuickStart rather than a generic voice bot.
 * Failures fall back to a QuickStart brand line so the call still starts.
 */
export async function loadWidgetVoiceBrief(input: {
  workspaceId: string;
  conversationId: string;
  conversationUrl: string;
  agentUrl: string;
  knowledgeUrl: string;
  internalToken: string;
  logger: Logger;
}): Promise<string> {
  const requestId = randomUUID();
  try {
    const conversation = await getJson<{ conversation?: { agent_id?: string | null } }>(
      `${input.conversationUrl}/internal/workspaces/${encodeURIComponent(input.workspaceId)}/widget/conversations/${encodeURIComponent(input.conversationId)}`,
      input.internalToken,
      requestId,
    );
    const agentId = conversation?.conversation?.agent_id?.trim();
    if (!agentId) return FALLBACK_BRIEF;

    const agentRes = await getJson<{ agent?: AgentJson }>(
      `${input.agentUrl}/internal/workspaces/${encodeURIComponent(input.workspaceId)}/widget/agents/${encodeURIComponent(agentId)}`,
      input.internalToken,
      requestId,
    );
    const agent = agentRes?.agent;
    let name = agent?.name?.trim() || "QuickStart AI";
    let instructions = agent?.instructions?.trim() || "";
    const versionId = agent?.production_version_id?.trim();
    if (versionId) {
      const version = await getJson<{ version?: VersionJson }>(
        `${input.agentUrl}/internal/workspaces/${encodeURIComponent(input.workspaceId)}/widget/agents/${encodeURIComponent(agentId)}/versions/${encodeURIComponent(versionId)}`,
        input.internalToken,
        requestId,
      );
      const snapshot = version?.version?.snapshot;
      if (snapshot?.instructions?.trim()) instructions = snapshot.instructions.trim();
      if (snapshot?.name?.trim()) name = snapshot.name.trim();
    }

    const query = `${name}. ${instructions}`.slice(0, 500);
    let facts = "";
    try {
      const retrieved = await fetch(`${input.knowledgeUrl}/internal/retrieve`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.internalToken}`,
          "content-type": "application/json",
          "x-request-id": requestId,
        },
        body: JSON.stringify({ workspace_id: input.workspaceId, query, limit: 4 }),
      });
      if (retrieved.ok) {
        const body = (await retrieved.json()) as { chunks?: Array<{ text?: string }> };
        facts = (body.chunks ?? [])
          .map((chunk) => chunk.text?.trim())
          .filter((text): text is string => Boolean(text))
          .join("\n")
          .slice(0, 1800);
      }
    } catch {
      facts = "";
    }

    const parts = [
      `You are ${name}, the published voice agent for QuickStart AI.`,
      instructions ? `Agent instructions:\n${instructions}` : "",
      facts ? `Product facts:\n${facts}` : "",
      SPOKEN_STYLE,
    ].filter(Boolean);
    input.logger.info("widget.voice.brief_loaded", {
      agent_id: agentId,
      chars: parts.join("\n\n").length,
      knowledge: Boolean(facts),
    });
    return parts.join("\n\n").slice(0, 6000);
  } catch (err) {
    input.logger.warn("widget.voice.brief_failed", {
      message: err instanceof Error ? err.message : "brief failed",
    });
    return FALLBACK_BRIEF;
  }
}
