"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useHandoffTyping } from "../../lib/use-handoff-typing";
import type { HandoffScenario } from "../../content/handoff-scenarios";
import type { PlaybackPhase } from "../../lib/use-handoff-playback";

interface CustomerMessageProps {
  scenario: HandoffScenario;
  phase: PlaybackPhase;
  questionRef: React.RefObject<HTMLHeadingElement>;
  anchorRef: React.RefObject<HTMLSpanElement>;
}

export function CustomerMessage({
  scenario,
  phase,
  questionRef,
  anchorRef,
}: CustomerMessageProps) {
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [scenario.avatarSrc]);

  // Transition state: during 'fading-out' we hide/fade, otherwise visible
  const isFading = phase === "fading-out";
  const message = useHandoffTyping(scenario.question, phase === "showing-customer", !["showing-customer", "fading-out"].includes(phase), 30);

  return (
    <div
      className={`marketing-handoff-customer-block ${
        isFading ? "marketing-handoff-fade-out" : "marketing-handoff-fade-in"
      }`}
    >
      {/* Customer Avatar & Identity */}
      <div className="marketing-handoff-customer-header">
        <div className="marketing-handoff-avatar-frame">
          {scenario.avatarSrc && !imageError ? (
            <Image
              src={scenario.avatarSrc}
              alt={scenario.avatarAlt}
              width={56}
              height={56}
              className="marketing-handoff-avatar-img"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <span className="marketing-handoff-avatar-initials" aria-label={scenario.avatarAlt}>
              {scenario.customerName.slice(0, 1)}
            </span>
          )}
        </div>

        <div className="marketing-handoff-customer-identity">
          <span className="marketing-handoff-customer-name">
            {scenario.customerName}
          </span>
          <span className="marketing-handoff-customer-separator">·</span>
          <span className="marketing-handoff-customer-role">Customer</span>
        </div>
      </div>

      {/* Context Line */}


      {/* Customer Question */}
      <div className="marketing-handoff-question-wrapper">
        <h3 ref={questionRef} className="marketing-handoff-question">
          <span className="handoff-text-reserve" aria-hidden="true">{scenario.question}</span>
          <span className="handoff-typed-text" aria-label={scenario.question}>{message}</span>
          <span
            ref={anchorRef}
            className="marketing-handoff-origin-dot"
            aria-hidden="true"
          />
        </h3>
      </div>
    </div>
  );
}
