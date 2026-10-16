"use client";

import { ChevronDown, FileText, MessageSquare, Mic } from "lucide-react";
import { VoiceCatalogPicker, type CatalogVoice } from "./voice-catalog-picker";

type Props = {
  workspaceId: string;
  name: string;
  description: string;
  environment: string;
  chatEnabled: boolean;
  voiceEnabled: boolean;
  selectedVoiceId?: string;
  ttsVoiceId?: string;
  isDirty?: boolean;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeEnvironment: (value: string) => void;
  onChangeChatEnabled: (value: boolean) => void;
  onChangeVoiceEnabled: (value: boolean) => void;
  onChangeVoice: (voice: { voiceId: string; language: string }) => void;
};

export function IdentityChannelsTab({
  workspaceId,
  name,
  description,
  environment,
  chatEnabled,
  voiceEnabled,
  selectedVoiceId,
  ttsVoiceId,
  isDirty,
  onChangeName,
  onChangeDescription,
  onChangeEnvironment,
  onChangeChatEnabled,
  onChangeVoiceEnabled,
  onChangeVoice,
}: Props) {
  const effectiveVoiceId = selectedVoiceId || ttsVoiceId || "uplift:v_8eelc901";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,1fr)] gap-7 items-start">
      {/* Left Column: Identity & Channels (~55%) */}
      <div className="min-w-0 space-y-6">
        <div>
          <h2 className="text-[24px] font-semibold text-[#202125]">Identity &amp; channels</h2>
          <p className="mt-1 text-[14px] text-[#667085]">
            Set up who your agent is and where customers can reach it.
          </p>
        </div>

        {/* Agent Details Section */}
        <div className="space-y-4">
          <h3 className="text-[15px] font-semibold text-[#202125]">Agent details</h3>

          <div>
            <label htmlFor="agent-name-input" className="block text-[14px] font-medium text-[#202125] mb-1">
              Agent name
            </label>
            <input
              id="agent-name-input"
              type="text"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              className="w-full px-3.5 py-2 text-[15px] text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-none focus:border-[#F15A24] focus:ring-1 focus:ring-[#F15A24] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="agent-desc-input" className="block text-[14px] font-medium text-[#202125]">
                Description
              </label>
              <span className="text-[13px] text-[#7A808A]">Optional</span>
            </div>
            <textarea
              id="agent-desc-input"
              rows={3}
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="What does this agent help with?"
              className="w-full px-3.5 py-2.5 text-[15px] text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-none focus:border-[#F15A24] focus:ring-1 focus:ring-[#F15A24] resize-none leading-relaxed transition-colors placeholder-[#98A2B3]"
            />
          </div>

          <div>
            <label htmlFor="agent-env-select" className="block text-[14px] font-medium text-[#202125] mb-1">
              Environment
            </label>
            <div className="relative max-w-[360px]">
              <select
                id="agent-env-select"
                value={environment}
                onChange={(e) => onChangeEnvironment(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 text-[14px] font-medium text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-none focus:border-[#F15A24] pr-10 transition-colors"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#667085] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="mt-1 text-[13px] text-[#7A808A]">Your agent&apos;s environment label.</p>
          </div>
        </div>

        {/* Channels Section */}
        <div className="space-y-3 pt-2">
          <div>
            <h3 className="text-[15px] font-semibold text-[#202125]">Channels</h3>
            <p className="text-[13px] text-[#667085] mt-0.5">Choose where this agent can respond.</p>
          </div>

          <div className="border border-[#E1E5EA] rounded-lg divide-y divide-[#EDF0F2] overflow-hidden bg-white shadow-sm">
            {/* Website Chat */}
            <label
              className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                chatEnabled ? "bg-[#FFF8F5]" : "hover:bg-[#F8F9FA]"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-[#202125]" />
                <div>
                  <span className="block text-[15px] font-semibold text-[#202125]">Website chat</span>
                  <span className="block text-[13px] text-[#667085]">Text conversations on your website.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={chatEnabled}
                onChange={(e) => onChangeChatEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#F15A24] rounded text-[#F15A24] border-[#D0D5DD] focus:ring-[#F15A24] cursor-pointer"
              />
            </label>

            {/* Phone Calls */}
            <label
              className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                voiceEnabled ? "bg-[#FFF8F5]" : "hover:bg-[#F8F9FA]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-[#202125]" />
                <div>
                  <span className="block text-[15px] font-semibold text-[#202125]">Phone calls</span>
                  <span className="block text-[13px] text-[#667085]">Inbound and outbound voice calls.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => onChangeVoiceEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#F15A24] rounded text-[#F15A24] border-[#D0D5DD] focus:ring-[#F15A24] cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Bottom Helper */}
        <div className="pt-2 flex items-center gap-2 text-[13px] text-[#667085]">
          <FileText className="w-3.5 h-3.5 text-[#667085]" aria-hidden="true" />
          <span>
            {isDirty
              ? "Unsaved changes. Save your draft before publishing."
              : "Save and publish to apply these settings."}
          </span>
        </div>
      </div>

      {/* Right Column: Spoken Voice Picker (~45%) */}
      <div className="min-w-0 sticky top-6">
        <VoiceCatalogPicker
          workspaceId={workspaceId}
          voiceId={effectiveVoiceId}
          onChange={(voice: CatalogVoice) => {
            onChangeVoice({ voiceId: voice.id, language: voice.language });
          }}
        />
      </div>
    </div>
  );
}
