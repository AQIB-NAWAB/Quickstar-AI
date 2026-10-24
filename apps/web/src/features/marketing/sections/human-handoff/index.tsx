"use client";

import React, { useEffect, useRef } from "react";
import { useHandoffPlayback } from "../../lib/use-handoff-playback";
import { CustomerMessage } from "./customer-message";
import { HandoffControl } from "./handoff-control";
import { TeamReply } from "./team-reply";
import { ReplyComposer } from "./reply-composer";
import { HandoffConnector } from "./handoff-connector";
import "../../styles/human-handoff.css";

export function HumanHandoffSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const {
    activeScenario,
    ownership,
    phase,
    prefersReducedMotion,
    draftText,
    setDraftText,
    attachment,
    selectAttachment,
    removeAttachment,
    submittedReplies,
    setIsFocused,
    setIsSectionInView,
    selectOwnership,
    handBackToAgent,
    sendReply,
  } = useHandoffPlayback();

  // Viewport intersection observer to pause playback offscreen
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsSectionInView(inView);
      },
      { threshold: [0, 0.2] }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, [setIsSectionInView]);

  return (
    <section
      ref={sectionRef}
      id="inbox"
      aria-labelledby="inbox-heading"
      className="marketing-handoff-section"
    >
      {/* Decorative Atmospheric Background & Contours */}
      <div className="marketing-handoff-bg-accents" aria-hidden="true">
        <div className="marketing-handoff-warm-glow" />
        <svg
          className="marketing-handoff-contour-svg"
          viewBox="0 0 1536 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle contour arching from bottom left */}
          <path
            d="M -60 610 C 280 620, 500 740, 650 1060"
            stroke="#fa5d19"
            strokeWidth="1.2"
            strokeOpacity="0.09"
            fill="none"
          />
          <path
            d="M -40 665 C 260 685, 450 800, 570 1060"
            stroke="#fa5d19"
            strokeWidth="0.8"
            strokeOpacity="0.05"
            fill="none"
          />
          {/* Subtle contour near lower right */}
          <path
            d="M 1080 1010 C 1320 960, 1450 1010, 1560 850"
            stroke="#fa5d19"
            strokeWidth="1.0"
            strokeOpacity="0.07"
            fill="none"
          />
        </svg>
      </div>

      <div className="marketing-handoff-container">
        {/* Editorial Header */}
        <header className="marketing-handoff-header">
          <div className="marketing-handoff-eyebrow">
            <span className="marketing-handoff-eyebrow-text">
              HUMAN HANDOFF
            </span>
          </div>

          <h2 id="inbox-heading" className="marketing-handoff-heading">
            A person, <em>right when they need one.</em>
          </h2>

          <p className="marketing-handoff-description">
            Your team can take over any conversation, with the full context
            already there.
          </p>
        </header>

        {/* Main Editorial Scene */}
        <div
          ref={sceneRef}
          className="marketing-handoff-scene"
          onFocusCapture={() => setIsFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false);
          }}
        >
          {/* SVG Connector behind text */}
          <HandoffConnector
            sceneRef={sceneRef}
            originRef={anchorRef}
            targetRef={targetRef}
            phase={phase}
            prefersReducedMotion={prefersReducedMotion}
          />

          {/* Left Column: Customer Question */}
          <div className="marketing-handoff-left-zone">
            <CustomerMessage
              scenario={activeScenario}
              phase={phase}
              questionRef={questionRef}
              anchorRef={anchorRef}
            />
          </div>

          {/* Center Column: Handoff Control */}
          <div className="marketing-handoff-center-zone">
            <HandoffControl
              ownership={ownership}
              onSelectOwnership={selectOwnership}
            />
          </div>

          {/* Right Column: Team Reply & Multiline Composer */}
          <div className="marketing-handoff-right-zone">
            <TeamReply
              scenario={activeScenario}
              ownership={ownership}
              phase={phase}
              submittedReplies={submittedReplies}
              targetRef={targetRef}
            />

            <ReplyComposer
              ownership={ownership}
              draftText={draftText}
              onDraftChange={setDraftText}
              attachment={attachment}
              onSelectAttachment={selectAttachment}
              onRemoveAttachment={removeAttachment}
              onHandBack={handBackToAgent}
              onSendReply={sendReply}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
