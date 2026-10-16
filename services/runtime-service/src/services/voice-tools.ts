import type { AgentToolDefinition } from "@quickstart/contracts";

export const VOICE_TRANSFER_TOOL_NAME = "transfer_to_teammate";

/** Runtime-only function. It is not saved on the agent. The tool loop handles it by name. */
export const VOICE_TRANSFER_TOOL: AgentToolDefinition = {
  id: "voice-transfer",
  name: VOICE_TRANSFER_TOOL_NAME,
  description:
    "Connect this live call to a human teammate. Call this only after the visitor asked for a person and then said yes.",
  type: "http",
  method: "POST",
  base_url: "https://transfer.invalid",
  allowed_hosts: ["transfer.invalid"],
  parameters: { type: "object", properties: {} },
};

/** Voice stays on the streamed answer path unless the caller asked for an action. */
export function utteranceRequestsAction(text: string | undefined): boolean {
  const value = text?.trim() ?? "";
  if (!value) return false;
  // Voice transcripts often phrase lookups naturally (“get the details of a
  // post with id five”), while this path previously only recognized a small
  // set of command-like phrases. Share the widget detector so text and voice
  // turns expose the same configured lookup tools.
  return (
    visitorRequestsToolAction(value) ||
    /\b(look\s*up|lookup|fetch|check (my|the|this|that)|find (my|the)|search for|scrape|create|update|delete|cancel|order status|post id|track my|book a|run the)\b|چیک کرو|ڈھونڈ|کینسل/i.test(
      value,
    )
  );
}

/** Chat and widget tools are available only for a clear request to perform a lookup or action. */
export function visitorRequestsToolAction(text: string | undefined): boolean {
  const value = text?.trim() ?? "";
  if (!value) return false;
  return /\b(?:look\s*up|lookup|search(?:\s+for)?|fetch|retrieve|pull\s+up|track|query|check|show|see|open|get)\b.{0,70}\b(?:order|post|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer)\b|\b(?:create|update|delete|cancel|book|run)\s+(?:a|an|the|my|this|it)?\s*(?:order|post|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer|it|this)\b|چیک کرو|ڈھونڈ|کینسل/i.test(
    value,
  ) ||
    /\b(?:details?|information)\s+(?:of|for|about)\s+(?:(?:the|a|an|my|this|that)\s+)?(?:order|post|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer)\b/i.test(
      value,
    );
}

export function assistantAskedForLookupTarget(text: string | undefined): boolean {
  return /\b(?:which|what).{0,50}\b(?:post|order|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer)(?:\s+id)?\b|\b(?:which|what).{0,40}\b(?:id|identifier|number)\b/i.test(
    text ?? "",
  ) ||
    /\b(?:share|provide|give|tell me)\b.{0,40}\b(?:the\s+)?(?:id|identifier|number)\b/i.test(
      text ?? "",
    );
}

export function visitorSuppliedIdentifier(text: string | undefined): boolean {
  const value = text ?? "";
  const numberWord =
    "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty";
  return new RegExp(
    `^\\s*#?\\s*(?:\\d+|${numberWord})[.!?]?\\s*$|\\b(?:id|number)\\s*(?:(?:is|with|of|number)\\s*)?#?\\s*(?:\\d+[a-z0-9-]*|${numberWord})\\b|#\\s*\\d+\\b|\\b(?:post|order|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer)\\s+#?\\s*(?:\\d+|${numberWord})\\b`,
    "i",
  ).test(value);
}

export function lookupRequestMissingIdentifier(text: string | undefined): boolean {
  const value = text ?? "";
  const isLookupVerb =
    /\b(?:look\s*up|lookup|search|fetch|retrieve|pull\s+up|track|query|check|show|see|open|get|details?|information)\b/i.test(
      value,
    );
  const mentionsRecord =
    /\b(?:post|order|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer)\b/i.test(
      value,
    );
  return (
    isLookupVerb &&
    visitorRequestsToolAction(value) &&
    mentionsRecord &&
    !visitorSuppliedIdentifier(value)
  );
}

export function assistantAskedForActionConfirmation(text: string | undefined): boolean {
  return /\b(?:please\s+confirm|reply\s+yes\s+to|confirm\s+if\s+i\s+should|(?:should|shall)\s+i\s+(?:create|update|delete|cancel|start|go\s+ahead|proceed)|would\s+you\s+like\s+me\s+to\s+(?:create|update|delete|cancel|start|proceed|go\s+ahead)|do\s+you\s+want\s+me\s+to\s+(?:create|update|delete|cancel|start|proceed|go\s+ahead))\b/i.test(
    text ?? "",
  );
}

export function visitorWantsTeammate(text: string | undefined): boolean {
  const value = text?.trim() ?? "";
  if (!value) return false;
  return /\b(talk|speak|switch|transfer|connect|hand)\b.{0,40}\b(human|person|teammate|representative|operator)\b|\b(human|live) (agent|person|support)\b|انسان سے بات|ساتھی سے بات|بندے سے بات/i.test(
    value,
  );
}

/** The previous spoken line asked before handing the call to a person. */
export function assistantOfferedHandoff(text: string | undefined): boolean {
  return /connect you with a teammate|ساتھی سے ملا دوں/i.test(text ?? "");
}

export function spokenToolNudge(
  toolName: string,
  language: string | undefined,
  gender: "female" | "male" | "neutral" | undefined = "male",
): string {
  const urdu = (language ?? "").toLowerCase().startsWith("ur");
  const feminine = gender === "female";
  if (toolName === VOICE_TRANSFER_TOOL_NAME) {
    return urdu
      ? feminine
        ? "ٹھیک ہے، میں آپ کو ایک ساتھی کے پاس بھیج رہی ہوں۔"
        : "ٹھیک ہے، میں آپ کو ایک ساتھی کے پاس بھیج رہا ہوں۔"
      : "Okay, I'm switching you to a teammate.";
  }
  if (urdu) {
    return feminine ? "ٹھیک ہے، میں یہ چیک کر رہی ہوں۔" : "ٹھیک ہے، میں یہ چیک کر رہا ہوں۔";
  }
  return "Let me check that for you.";
}

/** Writes, starts, and cancels wait for a yes. Lookups the visitor already asked for do not. */
export function toolChangesData(tool: AgentToolDefinition | undefined): boolean {
  if (!tool || tool.name === VOICE_TRANSFER_TOOL_NAME) return false;
  if (tool.type === "http" && tool.method !== "GET") return true;
  if (tool.type === "builtin_leads" && (tool.action === "start" || tool.action === "cancel")) return true;
  return false;
}

export function visitorConfirmed(text: string | undefined): boolean {
  return /\b(yes|yeah|yep|sure|ok|okay|go ahead|please do|confirm|do it|haan|ji|ہاں|جی)\b/i.test(
    text ?? "",
  );
}

export const CONVERSATION_PRIORITY = [
  "HOW TO ANSWER (highest priority — overrides any urge to collect ids):",
  "For a normal question, explanation, or small talk, answer from the agent instructions and the knowledge snippets. Do not call a tool. Do not ask for a post id, order id, or any other identifier.",
  "Call a tool only when the visitor clearly asks you to look something up, fetch it, search, scrape, create, update, or cancel, and you already have every required detail.",
  "If they asked for that action but one required detail is missing, ask one short question for that detail. Never open a normal conversation by asking which id they mean.",
  "Before a tool that creates, updates, deletes, starts, or cancels something, ask one short confirmation and wait for a yes. Do not call it until they agree.",
  "A read-only lookup they already asked for can run immediately. Do not say the function name. Never invent an id, and never reuse an id from an earlier turn unless they just referred to that same thing.",
].join("\n");
