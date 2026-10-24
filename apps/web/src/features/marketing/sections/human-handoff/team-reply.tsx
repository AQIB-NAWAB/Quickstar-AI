"use client";

import React from "react";
import { useHandoffTyping } from "../../lib/use-handoff-typing";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { HandoffScenario } from "../../content/handoff-scenarios";
import type {
  HandoffOwnership,
  PlaybackPhase,
  SubmittedReply,
} from "../../lib/use-handoff-playback";

interface TeamReplyProps {
  scenario: HandoffScenario;
  ownership: HandoffOwnership;
  phase: PlaybackPhase;
  submittedReplies: SubmittedReply[];
  targetRef: React.RefObject<HTMLDivElement>;
}

export function TeamReply({
  scenario,
  ownership,
  phase,
  submittedReplies,
  targetRef,
}: TeamReplyProps) {
  const isAgent = ownership === "agent";
  const isVisible = true;
  const isTransitioning = phase === "fading-out";

  const messageLines = isAgent
    ? [scenario.agentMessage]
    : scenario.teamReply.split("\n");

  const fullMessage = messageLines.join("\n");
  const message = useHandoffTyping(fullMessage, phase === "typing-reply", phase === "complete", 25);

  return (
    <div
      className={`marketing-handoff-team-block ${
        isTransitioning
          ? "marketing-handoff-reply-fading"
          : isVisible
          ? "marketing-handoff-reply-visible"
          : "marketing-handoff-reply-hidden"
      }`}
    >
      {/* Team / Agent Header */}
      <div className="marketing-handoff-team-header">
        {/* Official Brand Avatar Medallion */}
        <div
          className="marketing-handoff-brand-medallion"
          aria-hidden="true"
        >
          <BrandLogo size={32} fillColor="#ffffff" />
        </div>

        <div className="marketing-handoff-team-identity">
          {isAgent ? (
            <span className="marketing-handoff-team-name">QuickStart agent</span>
          ) : (
            <>
              <span className="marketing-handoff-team-name">You</span>
              <span className="marketing-handoff-team-separator">·</span>
              <span className="marketing-handoff-team-role">Team member</span>
            </>
          )}
        </div>
      </div>

      {/* Main Reply Typography */}
      <div ref={targetRef} className={`marketing-handoff-reply-content ${!isAgent && submittedReplies.length ? "marketing-handoff-has-replies" : ""}`}>
        <div className="marketing-handoff-reply-text handoff-text-reserve" aria-hidden="true">
          {messageLines.map((line, idx) => (
            <p key={idx} className="marketing-handoff-reply-line">
              {line}
            </p>
          ))}
        </div>

        <div className="handoff-typed-text" aria-label={fullMessage}>{message.split("\n").map((line, index) => <p key={index} className="marketing-handoff-reply-line">{line}</p>)}</div>

        {/* Bounded history for user-submitted replies */}
        {!isAgent && submittedReplies.length > 0 && (
          <div
            className="marketing-handoff-submitted-history"
            aria-label="Submitted replies"
          >
            {submittedReplies.map((reply) => (
              <div key={reply.id} className="marketing-handoff-submitted-item">
                <div className="marketing-handoff-submitted-sender">
                  <span>You</span>
                  <span className="marketing-handoff-submitted-time">
                    {reply.timestamp}
                  </span>
                </div>
                <p className="marketing-handoff-submitted-text">{reply.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
