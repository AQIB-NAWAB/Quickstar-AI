import type { AgentToolDefinition } from "@quickstart/contracts";

export const VOICE_TRANSFER_TOOL_NAME = "transfer_to_teammate";

/** Runtime-only function. It is not saved on the agent. The tool loop handles it by name. */
export const VOICE_TRANSFER_TOOL: AgentToolDefinition = {
  id: "voice-transfer",
  name: VOICE_TRANSFER_TOOL_NAME,
  description:
    "Connect this live call to a human teammate. Call this when the visitor asks for a person, a human, an agent, or a teammate.",
  type: "http",
  method: "POST",
  base_url: "https://transfer.invalid",
  allowed_hosts: ["transfer.invalid"],
  parameters: { type: "object", properties: {} },
};

export function visitorWantsTeammate(text: string | undefined): boolean {
  const value = text?.trim() ?? "";
  if (!value) return false;
  return /human|person|someone|teammate|representative|operator|transfer|talk to (an |a )?(agent|person)|انسان|ساتھی|بندہ|آدمی/i.test(
    value,
  );
}

export function spokenToolNudge(toolName: string, language: string | undefined): string {
  const urdu = (language ?? "").toLowerCase().startsWith("ur");
  if (toolName === VOICE_TRANSFER_TOOL_NAME) {
    return urdu
      ? "ٹھیک ہے، میں آپ کو ایک ساتھی کے پاس بھیج رہا ہوں۔"
      : "Okay, I'm switching you to a teammate.";
  }
  return urdu ? "ٹھیک ہے، میں یہ چیک کر رہا ہوں۔" : "Okay, I'm checking that.";
}
