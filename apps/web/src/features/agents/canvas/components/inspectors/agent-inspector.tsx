import { VoiceCatalogPicker } from "@/features/agents/components/voice-catalog-picker";
import React from "react";

export type AgentInspectorProps = {
  agentName: string;
  workspaceId?: string;
  instructions: string;
  onChangeInstructions: (value: string) => void;
  modelSettings: Record<string, unknown>;
  onChangeModelSettings: (value: Record<string, unknown>) => void;
  channels: { chat: boolean; voice: boolean };
  onChangeChannels: (channels: { chat: boolean; voice: boolean }) => void;
  voiceSettings?: {
    language: string;
    tts_voice_id: string;
    voice_mode: "cascade" | "s2s";
  };
  onChangeVoiceSettings?: (settings: any) => void;
};

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  agentName,
  workspaceId,
  channels,
  onChangeChannels,
  voiceSettings,
  onChangeVoiceSettings,
  instructions,
  onChangeInstructions,
  modelSettings,
  onChangeModelSettings,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Agent defaults</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Shared settings for this agent’s conversation flow.
        </p>
      </div>
      <section className="space-y-3 border-t border-neutral-100 pt-4">
        <h3 className="text-sm font-semibold">Persona & instructions</h3>
        <label className="block text-xs">
          Global prompt
          <textarea
            aria-label="Global prompt"
            rows={6}
            value={instructions}
            onChange={(e) => onChangeInstructions(e.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 text-[13px] outline-none focus:border-[#FA5D19]"
          />
        </label>
        <p className="text-xs text-neutral-500">Node prompts add instructions to these defaults.</p>
      </section>
      <section className="space-y-3 border-t border-neutral-100 pt-4">
        <h3 className="text-sm font-semibold">Model</h3>
        <label className="block text-xs">
          Model ID
          <input
            aria-label="Default model"
            value={String(modelSettings.model_id ?? modelSettings.model ?? "")}
            onChange={(e) =>
              onChangeModelSettings({
                ...modelSettings,
                model_id: e.target.value,
                model: e.target.value,
              })
            }
            placeholder="Use your configured model"
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block text-xs">
          Temperature · {Number(modelSettings.temperature ?? 0.3)}
          <input
            aria-label="Default temperature"
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={Number(modelSettings.temperature ?? 0.3)}
            onChange={(e) =>
              onChangeModelSettings({ ...modelSettings, temperature: Number(e.target.value) })
            }
            className="mt-2 w-full accent-[#FA5D19]"
          />
        </label>
        <p className="text-xs text-neutral-500">Conversation nodes can override the model.</p>
      </section>
      {/* Agent Overview */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
          Agent Identity
        </label>
        <div>
          <span className="text-xs text-neutral-500 block mb-1">Agent Name</span>
          <div className="text-sm font-semibold text-neutral-800 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200">
            {agentName}
          </div>
        </div>
      </div>

      {/* Enabled Channels */}
      <div className="space-y-3 pt-4 border-t border-neutral-100">
        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
          Interaction Channels
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={channels.chat}
            onChange={(e) => onChangeChannels({ ...channels, chat: e.target.checked })}
            className="mt-0.5 rounded text-[#FA5D19] focus:ring-[#FA5D19]"
          />
          <div>
            <span className="text-xs font-medium text-neutral-800 block">Website & App Chat</span>
            <span className="text-[11px] text-neutral-500">
              Permits execution from embeddable chat widgets and API integrations.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={channels.voice}
            onChange={(e) => onChangeChannels({ ...channels, voice: e.target.checked })}
            className="mt-0.5 rounded text-[#FA5D19] focus:ring-[#FA5D19]"
          />
          <div>
            <span className="text-xs font-medium text-neutral-800 block">Voice & Telephony</span>
            <span className="text-[11px] text-neutral-500">
              Enables spoken TTS/STT pipelines and live voice workbench sessions.
            </span>
          </div>
        </label>
      </div>

      {/* Voice Defaults (if voice enabled) */}
      {channels.voice && (
        <div className="space-y-3 pt-4 border-t border-neutral-100">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
            Default Voice Persona
          </label>

          <div>
            <span className="text-xs text-neutral-600 block mb-1">Language</span>
            <select
              value={voiceSettings?.language || "en-US"}
              onChange={(e) =>
                onChangeVoiceSettings?.({
                  ...(voiceSettings ?? {}),
                  language: e.target.value,
                })
              }
              className="w-full text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FA5D19]"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish (Spain)</option>
              <option value="ur-PK">Urdu (Pakistan)</option>
            </select>
          </div>

          <div>
            <span className="text-xs text-neutral-600 block mb-1">TTS Voice</span>
            {workspaceId ? (
              <VoiceCatalogPicker
                workspaceId={workspaceId}
                voiceId={voiceSettings?.tts_voice_id ?? ""}
                onChange={(voice) =>
                  onChangeVoiceSettings?.({
                    ...voiceSettings,
                    tts_voice_id: voice.id,
                    language: voice.language,
                  })
                }
              />
            ) : (
              <p className="text-xs text-neutral-500">Select a voice in agent settings.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
