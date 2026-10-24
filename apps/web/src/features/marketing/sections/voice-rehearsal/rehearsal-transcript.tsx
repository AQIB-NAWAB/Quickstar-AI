"use client";

import React from "react";
import type { SpeakerFilter } from "../../lib/use-rehearsal-playback";
import type { TranscriptEntry } from "./content";

interface CurrentTranscriptExcerptProps {
  speaker: "customer" | "agent";
  text: string;
  isAudioAvailable: boolean;
}

export function CurrentTranscriptExcerpt({ speaker, text, isAudioAvailable }: CurrentTranscriptExcerptProps) {
  const speakerLabel = speaker === "agent" ? "QuickStart agent" : "Customer";

  return (
    <div className="marketing-rehearsal-excerpt-container">
      <span className="marketing-rehearsal-excerpt-speaker">
        {!isAudioAvailable ? `Preview · ${speakerLabel}` : speakerLabel}
      </span>
      <p className="marketing-rehearsal-excerpt-quote">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

interface FullTranscriptRegionProps {
  id: string;
  isOpen: boolean;
  isAudioAvailable: boolean;
  currentTime: number;
  filteredTranscript: TranscriptEntry[];
  activeSpeakerFilter: SpeakerFilter;
  onSelectSpeakerFilter: (filter: SpeakerFilter) => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
}

export function FullTranscriptRegion({
  id,
  isOpen,
  isAudioAvailable,
  currentTime,
  filteredTranscript,
  activeSpeakerFilter,
  onSelectSpeakerFilter,
  onSeek,
  onClose,
}: FullTranscriptRegionProps) {

  return (
    <div
      id={id}
      hidden={!isOpen}
      role="region"
      aria-label="Full call transcript"
      className="marketing-rehearsal-full-transcript"
    >
      <div className="marketing-rehearsal-full-transcript-header">
        <div className="marketing-rehearsal-transcript-filters" role="group" aria-label="Filter transcript by speaker">
          <button
            type="button"
            className={`marketing-rehearsal-filter-chip ${activeSpeakerFilter === "all" ? "active" : ""}`}
            onClick={() => onSelectSpeakerFilter("all")}
            aria-pressed={activeSpeakerFilter === "all"}
          >
            All speakers
          </button>
          <button
            type="button"
            className={`marketing-rehearsal-filter-chip ${activeSpeakerFilter === "customer" ? "active" : ""}`}
            onClick={() => onSelectSpeakerFilter("customer")}
            aria-pressed={activeSpeakerFilter === "customer"}
          >
            Customer
          </button>
          <button
            type="button"
            className={`marketing-rehearsal-filter-chip ${activeSpeakerFilter === "agent" ? "active" : ""}`}
            onClick={() => onSelectSpeakerFilter("agent")}
            aria-pressed={activeSpeakerFilter === "agent"}
          >
            Your agent
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="marketing-rehearsal-close-transcript"
          aria-label="Close full transcript"
        >
          Hide transcript ✕
        </button>
      </div>

      {!isAudioAvailable && (
        <div className="marketing-rehearsal-audio-notice" role="status">
          <span className="marketing-rehearsal-notice-dot" aria-hidden="true" />
          The transcript will be available with the test-call recording.
        </div>
      )}

      <div className="marketing-rehearsal-transcript-turns">
        {filteredTranscript.map((turn) => {
          const isCurrentTurn =
            isAudioAvailable &&
            currentTime >= turn.seconds &&
            currentTime < turn.seconds + 6;

          return (
            <div
              key={turn.id}
              className={`marketing-rehearsal-turn-row ${isCurrentTurn ? "current-segment" : ""}`}
            >
              <div className="marketing-rehearsal-turn-meta">
                <span className="marketing-rehearsal-turn-speaker">
                  {turn.speaker === "agent" ? "QuickStart Agent" : "Customer"}
                </span>

                {isAudioAvailable ? (
                  <button
                    type="button"
                    onClick={() => onSeek(turn.seconds)}
                    className="marketing-rehearsal-timestamp-btn font-mono"
                    aria-label={`Jump to ${turn.timestamp}`}
                  >
                    {turn.timestamp}
                  </button>
                ) : (
                  <span className="marketing-rehearsal-timestamp-static font-mono">
                    {turn.timestamp}
                  </span>
                )}
              </div>

              <p className="marketing-rehearsal-turn-text">{turn.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
