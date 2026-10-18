import type { ExecutionContext } from "./types.js";
export function graphModel(
  ctx: ExecutionContext,
  override?: { provider?: string; model?: string },
  profileSetting?: string,
) {
  const defaults = ctx.sessionState.agent_defaults?.model_settings ?? {};
  const model = override?.model || String(defaults.model_id ?? defaults.model ?? "");
  const profile =
    override?.provider ||
    String(defaults.profile ?? "") ||
    process.env.DEFAULT_CHAT_MODEL_PROFILE ||
    (model.startsWith("claude")
      ? "anthropic"
      : /llama|mixtral|gemma|gpt-oss/i.test(model)
        ? "groq"
        : "openai");
  if (profileSetting && profileSetting !== "default") {
    const colon = profileSetting.indexOf(":");
    if (colon > 0)
      return { profile: profileSetting.slice(0, colon), model_id: profileSetting.slice(colon + 1) };
    return { profile: profileSetting, model_id: model };
  }
  if (!model) throw new Error("Configure an agent model before running this node.");
  return { profile, model_id: model };
}
