"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  FileText,
  MessageSquare,
  Mic,
  User,
} from "lucide-react";
import { VoiceCatalogPicker, type CatalogVoice } from "./voice-catalog-picker";

type Subsection = "details" | "channels" | "voice";

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
  isDirty = false,
  onChangeName,
  onChangeDescription,
  onChangeEnvironment,
  onChangeChatEnabled,
  onChangeVoiceEnabled,
  onChangeVoice,
}: Props) {
  const [subsection, setSubsection] = useState<Subsection>("details");
  const effectiveVoiceId = selectedVoiceId || ttsVoiceId || "uplift:v_8eelc901";

  return (
    <div className="space-y-6 max-w-full">
      {/* Title & Subtitle matching 5.png, 6.png, 7.png */}
      <div>
        <h2 className="text-[24px] font-semibold text-[#202125]">Identity &amp; channels</h2>
        <p className="mt-1 text-[14px] text-[#667085]">
          Manage your agent&apos;s identity and communication settings.
        </p>
      </div>

      {/* One Large Bordered Settings Surface matching 5.png, 6.png, 7.png */}
      <div className="bg-white border border-[#DCE1E8] rounded-[8px] overflow-hidden shadow-xs flex flex-col md:flex-row min-h-[480px]">
        {/* Left Subsection Navigation (~240-280px) */}
        <div className="w-full md:w-[260px] border-b md:border-b-0 md:border-r border-[#EAECF0] p-4 flex flex-col shrink-0 bg-white">
          <nav aria-label="Identity subsections" className="space-y-1">
            <button
              type="button"
              onClick={() => setSubsection("details")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors text-left ${
                subsection === "details"
                  ? "bg-[#EEF0F3] text-[#202125] font-semibold"
                  : "text-[#475467] hover:bg-[#F8F9FA] hover:text-[#202125]"
              }`}
            >
              <User className="w-4 h-4 text-[#667085]" />
              <span>Agent details</span>
            </button>

            <button
              type="button"
              onClick={() => setSubsection("channels")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors text-left ${
                subsection === "channels"
                  ? "bg-[#EEF0F3] text-[#202125] font-semibold"
                  : "text-[#475467] hover:bg-[#F8F9FA] hover:text-[#202125]"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#667085]" />
              <span>Channels</span>
            </button>

            <button
              type="button"
              onClick={() => setSubsection("voice")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors text-left ${
                subsection === "voice"
                  ? "bg-[#EEF0F3] text-[#202125] font-semibold"
                  : "text-[#475467] hover:bg-[#F8F9FA] hover:text-[#202125]"
              }`}
            >
              <Activity className="w-4 h-4 text-[#667085]" />
              <span>Voice</span>
            </button>
          </nav>
        </div>

        {/* Right Focused Form (Padding 24px) */}
        <div className="flex-1 p-6 sm:p-8 bg-white min-w-0">
          {/* 5.PNG — AGENT DETAILS */}
          {subsection === "details" && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <h3 className="text-[20px] font-semibold text-[#202125]">Agent details</h3>
                <p className="mt-1 text-[14px] text-[#667085]">
                  How your agent appears in your workspace.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Agent Name */}
                <div>
                  <label htmlFor="agent-name-input" className="block text-[14px] font-medium text-[#202125] mb-1.5">
                    Agent name
                  </label>
                  <input
                    id="agent-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => onChangeName(e.target.value)}
                    className="w-full h-10 px-3.5 text-[15px] text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] focus:outline-none focus:border-[#FF571A] transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="agent-desc-input" className="block text-[14px] font-medium text-[#202125]">
                      Description
                    </label>
                    <span className="text-[13px] text-[#667085]">Optional</span>
                  </div>
                  <textarea
                    id="agent-desc-input"
                    rows={4}
                    value={description}
                    onChange={(e) => onChangeDescription(e.target.value)}
                    placeholder="What does this agent help with?"
                    className="w-full p-3 text-[15px] text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] focus:outline-none focus:border-[#FF571A] resize-none leading-relaxed transition-colors placeholder-[#98A2B3]"
                  />
                </div>

                {/* Environment */}
                <div>
                  <label htmlFor="agent-env-select" className="block text-[14px] font-medium text-[#202125] mb-1.5">
                    Environment
                  </label>
                  <div className="relative">
                    <select
                      id="agent-env-select"
                      value={environment}
                      onChange={(e) => onChangeEnvironment(e.target.value)}
                      className="w-full h-10 appearance-none px-3.5 text-[14px] font-medium text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] focus:outline-none focus:border-[#FF571A] pr-10 transition-colors"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#667085] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6.PNG — CHANNELS */}
          {subsection === "channels" && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <h3 className="text-[20px] font-semibold text-[#202125]">Channels</h3>
                <p className="mt-1 text-[14px] text-[#667085]">
                  Choose where this agent can respond.
                </p>
              </div>

              {/* One Bordered Two-Row Selection Group matching 6.png */}
              <div className="border border-[#DCE1E8] rounded-[8px] divide-y divide-[#EAECF0] overflow-hidden bg-white">
                {/* Website Chat */}
                <label
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    chatEnabled ? "bg-[#FAFBFB]" : "hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <MessageSquare className="w-5 h-5 text-[#202125]" />
                    <div>
                      <span className="block text-[15px] font-semibold text-[#202125]">
                        Website chat
                      </span>
                      <span className="block text-[13px] text-[#667085] mt-0.5">
                        Text conversations on your website.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={chatEnabled}
                    onChange={(e) => onChangeChatEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#FF571A] rounded cursor-pointer"
                  />
                </label>

                {/* Phone Calls */}
                <label
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    voiceEnabled ? "bg-[#FAFBFB]" : "hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Mic className="w-5 h-5 text-[#202125]" />
                    <div>
                      <span className="block text-[15px] font-semibold text-[#202125]">
                        Phone calls
                      </span>
                      <span className="block text-[13px] text-[#667085] mt-0.5">
                        Inbound and outbound voice calls.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => onChangeVoiceEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#FF571A] rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Below Note matching 6.png */}
              <div className="flex items-center gap-2 text-[13px] text-[#667085] pt-1">
                <FileText className="w-4 h-4 text-[#667085]" aria-hidden="true" />
                <span>Save and publish to apply channel changes.</span>
              </div>
            </div>
          )}

          {/* 7.PNG — VOICE */}
          {subsection === "voice" && (
            <VoiceCatalogPicker
              workspaceId={workspaceId}
              voiceId={effectiveVoiceId}
              onChange={(voice: CatalogVoice) => {
                onChangeVoice({ voiceId: voice.id, language: voice.language });
              }}
            />
          )}
        </div>
      </div>

      {/* Save-state strip below matching 5.png, 6.png, 7.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[13px]">
        <div className="flex items-center gap-2">
          {isDirty ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#F79009]" />
              <span className="text-[#B54708] font-medium">Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#168A45]" />
              <span className="text-[#168A45] font-medium">All changes saved to draft</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[#667085]">
          <FileText className="w-4 h-4 text-[#667085]" aria-hidden="true" />
          <span>Publish to update your live agent.</span>
        </div>
      </div>
    </div>
  );
}
