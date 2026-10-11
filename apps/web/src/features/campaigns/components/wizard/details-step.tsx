"use client";

import { useState } from "react";
import { SAMPLE_AVAILABLE_AGENTS } from "../../lib/fixtures";

interface DetailsStepProps {
  name: string;
  description: string;
  agentId: string;
  onUpdate: (data: { name: string; description: string; agentId: string; agentName: string }) => void;
  onContinue: () => void;
}

export function DetailsStep({
  name,
  description,
  agentId,
  onUpdate,
  onContinue,
}: DetailsStepProps) {
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    setError(null);
    onContinue();
  }

  const selectedAgent =
    SAMPLE_AVAILABLE_AGENTS.find((a) => a.id === agentId) || SAMPLE_AVAILABLE_AGENTS[0];

  return (
    <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs max-w-xl mx-auto space-y-5">
      <div>
        <h3 className="text-base font-bold text-accent-black tracking-tight">
          Step 1 &middot; Campaign Details
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Give your campaign a title, purpose, and select an outbound voice agent.
        </p>
      </div>

      <div className="space-y-4 text-xs">
        {/* Campaign Name */}
        <div className="space-y-1">
          <label className="font-semibold text-neutral-700 block">
            Campaign name <span className="text-heat-100">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setError(null);
              onUpdate({
                name: e.target.value,
                description,
                agentId: selectedAgent.id,
                agentName: selectedAgent.name,
              });
            }}
            placeholder="e.g. Product demo follow-up"
            className="w-full px-3 py-2 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-accent-black"
          />
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="font-semibold text-neutral-700 block">
            Description <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) =>
              onUpdate({
                name,
                description: e.target.value,
                agentId: selectedAgent.id,
                agentName: selectedAgent.name,
              })
            }
            rows={3}
            placeholder="Brief explanation of target audience and campaign goal"
            className="w-full px-3 py-2 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-accent-black"
          />
        </div>

        {/* Agent Selector */}
        <div className="space-y-1">
          <label className="font-semibold text-neutral-700 block">
            Outbound voice agent <span className="text-heat-100">*</span>
          </label>
          <select
            value={selectedAgent.id}
            onChange={(e) => {
              const agent =
                SAMPLE_AVAILABLE_AGENTS.find((a) => a.id === e.target.value) ||
                SAMPLE_AVAILABLE_AGENTS[0];
              onUpdate({
                name,
                description,
                agentId: agent.id,
                agentName: agent.name,
              });
            }}
            className="w-full px-3 py-2 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-accent-black"
          >
            {SAMPLE_AVAILABLE_AGENTS.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.voiceCapable ? "(Voice enabled)" : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-400">
            Selected agent must have voice turn capabilities configured.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-border-faint">
        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-2 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10] shadow-xs transition-colors"
        >
          Continue &rarr;
        </button>
      </div>
    </div>
  );
}
