"use client";

import React, { useId, useMemo } from "react";

interface RehearsalWaveformProps {
  peaks: number[];
  progressRatio: number;
  currentTime: number;
  duration: number | null;
  isAudioAvailable: boolean;
  onSeek: (seconds: number) => void;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RehearsalWaveform({
  peaks,
  progressRatio,
  currentTime,
  duration,
  isAudioAvailable,
  onSeek,
}: RehearsalWaveformProps) {
  const clipId = `waveform-clip-${useId().replace(/:/g, "")}`;
  const unplayedGradientId = `waveform-gradient-${useId().replace(/:/g, "")}`;

  const totalWidth = 800;
  const totalHeight = 130;
  const centerY = totalHeight / 2;
  const barCount = peaks.length;
  const barPitch = totalWidth / barCount;
  const barWidth = 3.6;

  // Calculate geometric bars
  const bars = useMemo(() => {
    return peaks.map((peak, index) => {
      // Natural variation, minimum height 10px, maximum height 112px
      const clampedPeak = Math.max(0.08, Math.min(peak, 1.0));
      const height = Math.round(clampedPeak * 110);
      const x = Number((index * barPitch + (barPitch - barWidth) / 2).toFixed(2));
      const y = Number((centerY - height / 2).toFixed(2));
      return { x, y, width: barWidth, height, rx: 1.8 };
    });
  }, [peaks, barPitch, barWidth, centerY]);

  // Current playhead x coordinate (clamped between 0 and totalWidth)
  const playheadX = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.max(0, Math.min(progressRatio * totalWidth, totalWidth));
  }, [progressRatio, duration, totalWidth]);

  const durationFormatted =
    duration !== null && duration > 0 ? formatTime(duration) : "--:--";
  const currentTimeFormatted = formatTime(currentTime);

  const ariaValueText =
    duration !== null && duration > 0
      ? `${currentTimeFormatted} of ${durationFormatted}`
      : "Audio unavailable";

  return (
    <div className="marketing-rehearsal-waveform-wrapper">
      <div className="marketing-rehearsal-waveform-stage">
        {/* SVG Waveform Rendering */}
        <svg
          className="marketing-rehearsal-waveform-svg"
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Played region clip mask */}
            <clipPath id={clipId}>
              <rect x="0" y="0" width={playheadX} height={totalHeight} />
            </clipPath>

            {/* Unplayed bars gentle distant fade gradient */}
            <linearGradient id={unplayedGradientId} x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
              {!isAudioAvailable && <><stop offset="0%" stopColor="#fa5d19" /><stop offset="44%" stopColor="#fa5d19" /><stop offset="44.1%" stopColor="#d4d4d4" /></>}
              {isAudioAvailable && <stop offset="0%" stopColor="#d4d4d4" stopOpacity="0.95" />}
              {isAudioAvailable && <stop offset="35%" stopColor="#d4d4d4" stopOpacity="0.9" />}
              <stop offset="70%" stopColor="#d4d4d4" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#d4d4d4" stopOpacity="0.38" />
            </linearGradient>
          </defs>

          {/* Layer 1: Upcoming unplayed bars (charcoal with gentle distant fade) */}
          <g fill={`url(#${unplayedGradientId})`}>
            {bars.map((bar, i) => (
              <rect
                key={`unplayed-${i}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={bar.rx}
                ry={bar.rx}
              />
            ))}
          </g>

          {/* Layer 2: Played bars (vibrant heat orange #fa5d19), clipped by playhead */}
          <g clipPath={`url(#${clipId})`} fill="#fa5d19">
            {bars.map((bar, i) => (
              <rect
                key={`played-${i}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={bar.rx}
                ry={bar.rx}
              />
            ))}
          </g>

          {/* Playhead: thin orange vertical line + bottom scrubber dot (shown if duration > 0 or during active playback) */}
          {duration !== null && duration > 0 && playheadX > 0 && (
            <g className="marketing-rehearsal-playhead-group">
              <line
                x1={playheadX}
                y1={4}
                x2={playheadX}
                y2={totalHeight - 8}
                stroke="#fa5d19"
                strokeWidth="1.75"
              />
              <circle
                cx={playheadX}
                cy={totalHeight - 8}
                r="4.5"
                fill="#fa5d19"
              />
            </g>
          )}
        </svg>

        {/* Real Accessible Range Input for Seeking */}
        <input
          type="range"
          min={0}
          max={duration && duration > 0 ? duration : 100}
          step={0.1}
          value={duration && duration > 0 ? currentTime : 0}
          disabled={!isAudioAvailable || !duration || duration <= 0}
          aria-label="Seek test call"
          aria-valuetext={ariaValueText}
          className="marketing-rehearsal-seek-slider"
          onChange={(e) => onSeek(Number(e.target.value))}
          onKeyDown={(e) => {
            if (!duration || duration <= 0) return;
            const step = 2.0;
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              onSeek(Math.max(0, currentTime - step));
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              onSeek(Math.min(duration, currentTime + step));
            } else if (e.key === "Home") {
              e.preventDefault();
              onSeek(0);
            } else if (e.key === "End") {
              e.preventDefault();
              onSeek(duration);
            }
          }}
        />
      </div>

      {/* Timestamps Row */}
      <div className="marketing-rehearsal-timestamps">
        <span className="marketing-rehearsal-time-current font-mono">
          {currentTimeFormatted}
        </span>
        <span className="marketing-rehearsal-time-duration font-mono">
          {durationFormatted}
        </span>
      </div>
    </div>
  );
}
