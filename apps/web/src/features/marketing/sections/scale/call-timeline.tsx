"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Phone, AudioLines } from "lucide-react";
import {
  CALLS_DATA,
  DEFAULT_PLAYHEAD_TIME,
  RULER_TICKS,
  TIMELINE_START_TIME,
  TIMELINE_END_TIME,
  getActiveCallsCount,
  formatActiveCallsLabel,
  formatAriaValueText,
  isCallActive,
} from "./content";

const portraits = [
  "/marketing/use-cases/portrait-appointment.png", "/marketing/human-handoff/avatar-alex.png",
  "/marketing/use-cases/portrait-lead.png", "/marketing/use-cases/portrait-order.png",
  "/marketing/use-cases/portrait-call.png", "/marketing/use-cases/portrait-after-hours.png",
];

export function CallTimeline() {
  const [currentTime, setCurrentTime] = useState(DEFAULT_PLAYHEAD_TIME);

  const activeCount = getActiveCallsCount(CALLS_DATA, currentTime);
  const playheadPct = (currentTime / TIMELINE_END_TIME) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  return (
    <div className="marketing-scale-timeline-surface">
      {/* Accessible screen reader notice */}
      <div className="sr-only">
        Illustrative timeline showing six overlapping customer conversations over a 15-minute period. Use the slider to explore call concurrency.
      </div>

      {/* Timeline Grid Header / Time Ruler */}
      <div className="marketing-scale-ruler-row">
        <div className="marketing-scale-identity-spacer" aria-hidden="true" />
        <div className="marketing-scale-ruler-track" aria-hidden="true">
          {RULER_TICKS.map((tick, index) => {
            let alignmentClass = "marketing-scale-tick-center";
            if (index === 0) alignmentClass = "marketing-scale-tick-start";
            else if (index === RULER_TICKS.length - 1) alignmentClass = "marketing-scale-tick-end";

            return (
              <span
                key={tick.label}
                className={`marketing-scale-ruler-label ${alignmentClass}`}
                style={{ left: `${tick.pct}%` }}
              >
                {tick.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Timeline Body (Rows + Track + Playhead + Scrubber) */}
      <div className="marketing-scale-body">
        {/* Background Vertical Guides (Faint low-contrast lines behind bars) */}
        <div className="marketing-scale-guides-overlay" aria-hidden="true">
          {RULER_TICKS.map((tick) => (
            <div
              key={tick.label}
              className="marketing-scale-guide-line"
              style={{ left: `${tick.pct}%` }}
            />
          ))}
        </div>

        {/* 6 Customer Rows */}
        <div className="marketing-scale-rows-list">
          {CALLS_DATA.map((call, index) => {
            const active = isCallActive(call, currentTime);
            const isWhiteBand = index % 2 === 0; // Maya (0), Alex (2), Daniel (4) have subtle white band

            const barLeft = (call.start / TIMELINE_END_TIME) * 100;
            const barWidth = ((call.end - call.start) / TIMELINE_END_TIME) * 100;

            return (
              <div
                key={call.id}
                className={`marketing-scale-row ${isWhiteBand ? "marketing-scale-row-white-band" : ""}`}
              >
                {/* Customer Identity Column */}
                <div className="marketing-scale-identity">
                  <div
                    className="marketing-scale-avatar"
                    aria-hidden="true"
                    title={call.name}
                  >
                    <Image unoptimized src={portraits[index]} width={32} height={32} alt="" />
                  </div>
                  <span className="marketing-scale-name">{call.name}</span>
                </div>

                {/* Call Bar Track Column */}
                <div className="marketing-scale-track-cell">
                  <div
                    className={`marketing-scale-call-bar ${active ? "marketing-scale-bar-active" : "marketing-scale-bar-inactive"}`}
                    style={{
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                    }}
                    role="img"
                    aria-label={`Example call with ${call.name}, ${active ? "active at the selected time" : "outside the selected time"}`}
                  >
                    <div className="marketing-scale-phone-wrapper" aria-hidden="true">
                      <Phone size={13} className="marketing-scale-phone-icon" strokeWidth={2.4} />
                    </div>

                    <div className="marketing-scale-waveform" aria-hidden="true">
                      {Array.from({ length: 76 }, (_, i) => {
                        const sourceIndex = (i / 75) * (call.waveformPattern.length - 1);
                        const height = call.waveformPattern[Math.round(sourceIndex)];
                        return (
                        <span
                          key={i}
                          className="marketing-scale-wave-bar"
                          style={{ height: `${height}px` }}
                        />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead Overlay (Charcoal line, top dot, clamped pill label) */}
        <div className="marketing-scale-playhead-overlay" aria-hidden="true">
          {/* Playhead Label Pill (Clamped within timeline bounds) */}
          <div
            className="marketing-scale-playhead-pill"
            style={{
              left: `clamp(90px, ${playheadPct}%, calc(100% - 90px))`,
            }}
          >
            <AudioLines size={16} aria-hidden="true" /><span>{formatActiveCallsLabel(activeCount)}</span>
          </div>

          {/* Top Playhead Dot */}
          <div
            className="marketing-scale-playhead-dot"
            style={{ left: `${playheadPct}%` }}
          />

          {/* Vertical Playhead Line */}
          <div
            className="marketing-scale-playhead-line"
            style={{ left: `${playheadPct}%` }}
          />
        </div>

        <div className="marketing-scale-position-footer" aria-hidden="true">
          <span className="marketing-scale-bottom-handle" style={{ left: `${playheadPct}%` }} />
          <span className="marketing-scale-current-time" style={{ left: `clamp(20px, ${playheadPct}%, calc(100% - 20px))` }}>{formatAriaValueText(currentTime, activeCount).split(" AM")[0]}</span>
        </div>

        {/* Interactive Accessible Range Scrubber (Tabbing, dragging, arrow keys) */}
        <div className="marketing-scale-scrubber-wrapper">
          <input
            type="range"
            min={TIMELINE_START_TIME}
            max={TIMELINE_END_TIME}
            step={0.05}
            value={currentTime}
            onChange={handleSliderChange}
            aria-label="Explore overlapping calls"
            aria-valuetext={formatAriaValueText(currentTime, activeCount)}
            className="marketing-scale-slider"
          />
        </div>
      </div>

    </div>
  );
}
