"use client";

import { Download, Pause, Play, Volume2, VolumeX } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatDuration } from "../../lib/format";
import type { TranscriptSegment, VoiceWaveform } from "../../lib/types";

interface RecordingPlayerProps {
  durationSeconds: number;
  currentTimeSeconds: number;
  onSeek: (seconds: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  recordingAvailable: boolean;
  recordingUrl?: string | null;
  callerRecordingUrl?: string | null;
  recordingOffsetMs: number;
  callerRecordingOffsetMs: number;
  onTimeUpdate: (seconds: number) => void;
  waveform?: VoiceWaveform | null;
  transcript?: TranscriptSegment[];
  callId?: string;
  workspaceId?: string;
}

export function RecordingPlayer({
  durationSeconds,
  currentTimeSeconds,
  onSeek,
  isPlaying,
  onTogglePlay,
  recordingAvailable,
  recordingUrl,
  callerRecordingUrl,
  recordingOffsetMs,
  callerRecordingOffsetMs,
  onTimeUpdate,
  waveform,
  transcript = [],
  callId,
  workspaceId,
}: RecordingPlayerProps) {
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const agentAudioRef = useRef<HTMLAudioElement>(null);
  const callerAudioRef = useRef<HTMLAudioElement>(null);
  const scheduledStartsRef = useRef<number[]>([]);
  const endedTracksRef = useRef<Set<string>>(new Set());

  const clearScheduledStarts = () => {
    scheduledStartsRef.current.forEach((timer) => window.clearTimeout(timer));
    scheduledStartsRef.current = [];
  };

  const audioTracks = () =>
    [
      { key: "caller", audio: callerAudioRef.current, offset: callerRecordingOffsetMs / 1000 },
      { key: "agent", audio: agentAudioRef.current, offset: recordingOffsetMs / 1000 },
    ].filter(
      (track): track is { key: string; audio: HTMLAudioElement; offset: number } =>
        Boolean(track.audio),
    );

  useEffect(() => {
    for (const track of audioTracks()) {
      track.audio.playbackRate = playbackRate;
      track.audio.muted = isMuted;
      if (!isPlaying) track.audio.pause();
    }
    if (!isPlaying) clearScheduledStarts();
  }, [isPlaying, isMuted, playbackRate, recordingUrl, callerRecordingUrl]);

  const safeDuration = durationSeconds > 0 ? durationSeconds : 60;
  const progressRatio = Math.min(1, Math.max(0, currentTimeSeconds / safeDuration));

  // Compute dual-track bars accurately from real peaks or transcript intervals
  const barCount = 64;
  const bars = useMemo(() => {
    const result: Array<{
      id: number;
      agentHeight: number; // 0 to 100
      callerHeight: number; // 0 to 100
      isPast: boolean;
    }> = [];

    const hasRealAgentPeaks = waveform?.agentPeaks && waveform.agentPeaks.length > 0;
    const hasRealCallerPeaks = waveform?.callerPeaks && waveform.callerPeaks.length > 0;
    const hasSinglePeaks = waveform?.peaks && waveform.peaks.length > 0;

    for (let i = 0; i < barCount; i++) {
      const sliceStartSec = (i / barCount) * safeDuration;
      const sliceEndSec = ((i + 1) / barCount) * safeDuration;
      const sliceMidMs = ((sliceStartSec + sliceEndSec) / 2) * 1000;
      const isPast = (i + 0.5) / barCount <= progressRatio;

      let agentH = 15;
      let callerH = 15;

      if (hasRealAgentPeaks && hasRealCallerPeaks) {
        const peakIdx = Math.floor((i / barCount) * (waveform!.agentPeaks.length - 1));
        agentH = Math.max(12, Math.min(100, (waveform!.agentPeaks[peakIdx] ?? 0) * 100));
        callerH = Math.max(12, Math.min(100, (waveform!.callerPeaks[peakIdx] ?? 0) * 100));
      } else if (hasSinglePeaks) {
        const peakIdx = Math.floor((i / barCount) * (waveform!.peaks.length - 1));
        const val = Math.max(15, Math.min(100, (waveform!.peaks[peakIdx] ?? 0) * 100));
        agentH = val;
        callerH = Math.max(12, val * 0.8);
      } else if (transcript.length > 0) {
        // Derive from actual speaker turn intervals in transcript
        const matchingTurn = transcript.find(
          (t) => sliceMidMs >= t.startMs && sliceMidMs <= t.endMs,
        );
        if (matchingTurn) {
          if (matchingTurn.speaker === "agent") {
            agentH = 65 + (i % 5) * 6;
            callerH = 12;
          } else {
            callerH = 60 + (i % 4) * 8;
            agentH = 12;
          }
        }
      } else {
        // Fallback subtle baseline
        agentH = 20 + ((i * 7) % 25);
        callerH = 18 + ((i * 11) % 20);
      }

      result.push({ id: i, agentHeight: agentH, callerHeight: callerH, isPast });
    }

    return result;
  }, [waveform, transcript, safeDuration, progressRatio]);

  function handleProgressBarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seconds = Math.floor(ratio * safeDuration);
    seekTracks(seconds);
    onSeek(seconds);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(ratio * safeDuration);
  }

  function handleMouseLeave() {
    setHoverPosition(null);
  }

  function seekTracks(positionSeconds: number) {
    clearScheduledStarts();
    endedTracksRef.current.clear();
    for (const track of audioTracks()) {
      const localPosition = positionSeconds - track.offset;
      if (localPosition >= 0) {
        track.audio.currentTime = localPosition;
        if (isPlaying)
          void track.audio
            .play()
            .catch(() => setPlaybackError("One of the call audio tracks could not be played."));
        else track.audio.pause();
      } else {
        track.audio.currentTime = 0;
        track.audio.pause();
        if (isPlaying) {
          const timer = window.setTimeout(() => {
            void track.audio
              .play()
              .catch(() => setPlaybackError("One of the call audio tracks could not be played."));
          }, Math.round(-localPosition * 1000));
          scheduledStartsRef.current.push(timer);
        }
      }
    }
  }

  function handleTrackEnded(trackKey: string) {
    endedTracksRef.current.add(trackKey);
    const tracks = audioTracks();
    if (isPlaying && tracks.every((track) => endedTracksRef.current.has(track.key))) {
      clearScheduledStarts();
      onTogglePlay();
    }
  }

  function handleTogglePlayback() {
    setPlaybackError(null);
    if (!isPlaying) {
      endedTracksRef.current.clear();
      clearScheduledStarts();
      for (const track of audioTracks()) {
        const localPosition = currentTimeSeconds - track.offset;
        track.audio.currentTime = Math.max(0, localPosition);
        if (localPosition >= 0) {
          void track.audio
            .play()
            .catch(() =>
              setPlaybackError("This recording could not be played. Try reloading the call details."),
            );
        } else {
          const timer = window.setTimeout(() => {
            void track.audio
              .play()
              .catch(() =>
                setPlaybackError("This recording could not be played. Try reloading the call details."),
              );
          }, Math.round(-localPosition * 1000));
          scheduledStartsRef.current.push(timer);
        }
      }
      onTogglePlay();
      return;
    }
    clearScheduledStarts();
    audioTracks().forEach((track) => track.audio.pause());
    onTogglePlay();
  }

  const downloadUrl =
    recordingUrl ||
    (workspaceId && callId
      ? `/api/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound/${encodeURIComponent(callId)}/recording`
      : null);

  return (
    <div className="space-y-3 bg-white border border-border-faint rounded-12 p-4 shadow-xs">
      {/* Top Header & Track Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-accent-black">Call recording & waveform</span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-heat-100">
              <span className="w-2 h-2 rounded-full bg-heat-100" />
              Agent track
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Caller track
            </span>
          </div>
        </div>

        {downloadUrl && (
          <a
            href={downloadUrl}
            download={`call-${callId || "recording"}.wav`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 hover:text-accent-black transition-colors self-start sm:self-auto px-2 py-1 rounded-6 hover:bg-neutral-100"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Download recording</span>
          </a>
        )}
      </div>

      {/* Embedded Audio Elements */}
      {callerRecordingUrl && (
        <audio
          ref={callerAudioRef}
          src={callerRecordingUrl}
          preload="metadata"
          className="sr-only"
          onTimeUpdate={(event) =>
            onTimeUpdate(event.currentTarget.currentTime + callerRecordingOffsetMs / 1000)
          }
          onEnded={() => handleTrackEnded("caller")}
          onError={() => setPlaybackError("The caller audio track could not be loaded.")}
        />
      )}
      {recordingUrl && (
        <audio
          ref={agentAudioRef}
          src={recordingUrl}
          preload="metadata"
          className="sr-only"
          onTimeUpdate={(event) =>
            onTimeUpdate(event.currentTarget.currentTime + recordingOffsetMs / 1000)
          }
          onEnded={() => handleTrackEnded("agent")}
          onError={() => setPlaybackError("The agent audio track could not be loaded.")}
        />
      )}

      {/* Main Player Row */}
      <div className="bg-neutral-50 border border-border-faint rounded-10 p-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlayback}
          disabled={!recordingAvailable || !recordingUrl}
          aria-label={isPlaying ? "Pause playback" : "Start playback"}
          className="w-10 h-10 rounded-full bg-heat-100 hover:bg-heat-200 disabled:bg-neutral-300 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        {/* Dual-Track Waveform Scrubber */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative flex-1 min-w-[140px] sm:min-w-0 h-14 flex flex-col justify-center cursor-pointer group px-1 py-1 rounded-6 bg-white/60 border border-neutral-200/60"
          role="slider"
          aria-label="Seek recording"
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={currentTimeSeconds}
          tabIndex={0}
        >
          {/* Top Half: Agent Track (Orange) */}
          <div className="h-[22px] flex items-end gap-[2px]">
            {bars.map((bar) => (
              <div
                key={`agent-${bar.id}`}
                className={`flex-1 rounded-t-sm transition-colors ${
                  bar.isPast
                    ? "bg-heat-100"
                    : "bg-orange-200/60 group-hover:bg-orange-300/60"
                }`}
                style={{ height: `${Math.max(15, bar.agentHeight)}%` }}
              />
            ))}
          </div>

          {/* Center Dividing Scrubber Line */}
          <div className="h-[1.5px] bg-neutral-200 relative my-[1px]">
            {/* Playhead thumb line */}
            <div
              className="absolute top-[-22px] bottom-[-22px] w-[2px] bg-accent-black shadow-xs pointer-events-none transition-all z-10"
              style={{ left: `${progressRatio * 100}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-accent-black -ml-1 -mt-1 shadow-sm" />
            </div>

            {/* Hover tooltip */}
            {hoverPosition !== null && (
              <div
                className="absolute -top-7 -translate-x-1/2 bg-accent-black text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-20"
                style={{ left: `${(hoverPosition / safeDuration) * 100}%` }}
              >
                {formatDuration(hoverPosition)}
              </div>
            )}
          </div>

          {/* Bottom Half: Caller Track (Slate) */}
          <div className="h-[22px] flex items-start gap-[2px]">
            {bars.map((bar) => (
              <div
                key={`caller-${bar.id}`}
                className={`flex-1 rounded-b-sm transition-colors ${
                  bar.isPast
                    ? "bg-slate-600"
                    : "bg-slate-200 group-hover:bg-slate-300"
                }`}
                style={{ height: `${Math.max(15, bar.callerHeight)}%` }}
              />
            ))}
          </div>
        </div>

        {/* Time counter */}
        <div className="font-mono text-xs text-neutral-600 whitespace-nowrap tabular-nums shrink-0">
          <span className="text-accent-black font-semibold">
            {formatDuration(currentTimeSeconds)}
          </span>
          <span className="text-neutral-400 mx-1">/</span>
          <span>{formatDuration(safeDuration)}</span>
        </div>

        {/* Playback rate selector */}
        <div className="shrink-0">
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            aria-label="Playback rate"
            className="text-xs bg-white border border-neutral-200 rounded-6 px-1.5 py-1 text-neutral-700 font-medium focus:outline-none focus:ring-1 focus:ring-heat-100"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
        </div>

        {/* Mute button */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="text-neutral-400 hover:text-accent-black transition-colors shrink-0 p-1 cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {!recordingAvailable && (
        <p className="text-[11px] text-neutral-400 italic">
          No recording audio is available for this call.
        </p>
      )}
      {playbackError && (
        <p role="alert" className="text-[11px] text-red-600">
          {playbackError}
        </p>
      )}
    </div>
  );
}
