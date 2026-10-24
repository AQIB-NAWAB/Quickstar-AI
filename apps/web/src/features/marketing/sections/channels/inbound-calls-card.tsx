"use client";

import React from "react";

interface InboundCallsCardProps {
  isIntersecting: boolean;
}

// 24 slim waveform bars with fixed calibrated heights and tones matching the approved reference
const WAVE_BARS = [
  { height: 10, tone: "peach", delay: "0.0s" },
  { height: 14, tone: "peach", delay: "0.15s" },
  { height: 20, tone: "orange", delay: "0.3s" },
  { height: 16, tone: "peach", delay: "0.45s" },
  { height: 26, tone: "orange", delay: "0.6s" },
  { height: 34, tone: "orange", delay: "0.75s" },
  { height: 18, tone: "peach", delay: "0.9s" },
  { height: 30, tone: "orange", delay: "1.05s" },
  { height: 42, tone: "orange", delay: "1.2s" },
  { height: 26, tone: "orange", delay: "0.2s" },
  { height: 38, tone: "orange", delay: "0.4s" },
  { height: 24, tone: "orange", delay: "0.6s" },
  { height: 18, tone: "peach", delay: "0.8s" },
  { height: 32, tone: "orange", delay: "1.0s" },
  { height: 36, tone: "orange", delay: "1.2s" },
  { height: 22, tone: "orange", delay: "0.35s" },
  { height: 28, tone: "orange", delay: "0.55s" },
  { height: 16, tone: "peach", delay: "0.75s" },
  { height: 24, tone: "peach", delay: "0.95s" },
  { height: 18, tone: "peach", delay: "1.15s" },
  { height: 26, tone: "peach", delay: "0.25s" },
  { height: 14, tone: "peach", delay: "0.5s" },
  { height: 18, tone: "peach", delay: "0.75s" },
  { height: 10, tone: "peach", delay: "1.0s" },
];

export function InboundCallsCard({ isIntersecting }: InboundCallsCardProps) {
  return (
    <div data-channel="inbound" className="channels-card channels-card-inbound-calls">
      <div className="channels-card-header">
        <h3 className="channels-card-title">Inbound calls</h3>
        <p className="channels-card-desc">
          Pick up, answer, and hand over when needed.
        </p>
      </div>

      <div className="channels-card-stage">
        <div className="inbound-calls-container">
          <div className="inbound-calls-top-row">
            {/* White Circular Phone Medallion with Orange Handset */}
            <div className="inbound-phone-medallion" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fa5d19"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: "rotate(-12deg)" }}
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>

            {/* Illustrative Waveform Bars */}
            <div
              className="inbound-waveform-stage"
              aria-hidden="true"
              style={{
                animationPlayState: isIntersecting ? "running" : "paused",
              }}
            >
              {WAVE_BARS.map((bar, index) => (
                <div
                  key={index}
                  className={`inbound-wave-bar ${
                    bar.tone === "orange"
                      ? "inbound-wave-orange"
                      : "inbound-wave-peach"
                  }`}
                  style={{
                    height: `${bar.height * 1.7}px`,
                    animationName: isIntersecting ? "inboundWavePulse" : "none",
                    animationDuration: "1.6s",
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: 2,
                    animationDirection: "alternate",
                    animationDelay: bar.delay,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Calibrated Spoken Sentence */}
          <p className="inbound-calls-sentence">
            &ldquo;How can I help you today?&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
