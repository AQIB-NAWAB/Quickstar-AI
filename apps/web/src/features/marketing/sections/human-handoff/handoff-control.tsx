"use client";

import React from "react";
import { User } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { HandoffOwnership } from "../../lib/use-handoff-playback";

interface HandoffControlProps {
  ownership: HandoffOwnership;
  onSelectOwnership: (owner: HandoffOwnership) => void;
}

export function HandoffControl({
  ownership,
  onSelectOwnership,
}: HandoffControlProps) {
  const isTeamActive = ownership === "team";
  const isAgentActive = ownership === "agent";

  return (
    <div className="marketing-handoff-control-wrapper">
      {/* Label above control */}
      <div className="marketing-handoff-control-header">
        <span className="marketing-handoff-control-eyebrow">
          You’re in control
        </span>
      </div>

      {/* Segmented control */}
      <div
        className="marketing-handoff-segmented-control"
        role="group"
        aria-label="Conversation ownership"
      >
        <button
          type="button"
          onClick={() => onSelectOwnership("agent")}
          aria-pressed={isAgentActive}
          className={`marketing-handoff-segment ${
            isAgentActive ? "marketing-handoff-segment-active" : ""
          }`}
        >
          <span className="marketing-handoff-segment-icon">
            <BrandLogo size={16} fillColor={isAgentActive ? "#ffffff" : "#fa5d19"} />
          </span>
          <span className="marketing-handoff-segment-label">Agent</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectOwnership("team")}
          aria-pressed={isTeamActive}
          className={`marketing-handoff-segment ${
            isTeamActive ? "marketing-handoff-segment-active" : ""
          }`}
        >
          <span className="marketing-handoff-segment-icon">
            <User
              size={16}
              className="marketing-handoff-user-icon"
              aria-hidden="true"
            />
          </span>
          <span className="marketing-handoff-segment-label">Your team</span>
        </button>
      </div>

      {/* Status indicator beneath */}
      <div
        className="marketing-handoff-control-status"
        aria-live="polite"
        role="status"
      >
        {isTeamActive ? "You took over" : "Agent is handling this"}
      </div>
    </div>
  );
}
