"use client";

import { Pause,Play,Volume2,VolumeX } from "lucide-react";
import React,{ useEffect,useRef,useState } from "react";
import { formatDuration } from "../../lib/format";

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
}: RecordingPlayerProps) {
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const agentAudioRef = useRef<HTMLAudioElement>(null);
  const callerAudioRef = useRef<HTMLAudioElement>(null);
  const scheduledStartsRef = useRef<number[]>([]);
  const endedTracksRef = useRef(new Set<string>());

  const clearScheduledStarts = () => {
    scheduledStartsRef.current.forEach((timer) => window.clearTimeout(timer));
    scheduledStartsRef.current = [];
  };

  const audioTracks = () => [
    { key: "caller", audio: callerAudioRef.current, offset: callerRecordingOffsetMs / 1000 },
    { key: "agent", audio: agentAudioRef.current, offset: recordingOffsetMs / 1000 },
  ].filter((track): track is { key: string; audio: HTMLAudioElement; offset: number } => Boolean(track.audio));

  useEffect(() => {
    for (const track of audioTracks()) {
      track.audio.playbackRate = playbackRate;
      track.audio.muted = isMuted;
      if (!isPlaying) track.audio.pause();
    }
    if (!isPlaying) clearScheduledStarts();
  }, [isPlaying, isMuted, playbackRate, recordingUrl, callerRecordingUrl]);

  const safeDuration = durationSeconds > 0 ? durationSeconds : 252;
  const progressRatio = Math.min(1, Math.max(0, currentTimeSeconds / safeDuration));

  // Handle click on waveform/progress bar
  function handleProgressBarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seconds = Math.floor(ratio * safeDuration);
    seekTracks(seconds);
    onSeek(seconds);
  }

  function seekTracks(positionSeconds: number) {
    clearScheduledStarts();
    endedTracksRef.current.clear();
    for (const track of audioTracks()) {
      const localPosition = positionSeconds - track.offset;
      if (localPosition >= 0) {
        track.audio.currentTime = localPosition;
        if (isPlaying) void track.audio.play().catch(() => setPlaybackError("One of the call audio tracks could not be played."));
        else track.audio.pause();
      } else {
        track.audio.currentTime = 0;
        track.audio.pause();
        if (isPlaying) {
          const timer = window.setTimeout(() => {
            void track.audio.play().catch(() => setPlaybackError("One of the call audio tracks could not be played."));
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
          // Start available tracks in the click handler to preserve browser gesture permission.
          void track.audio.play().catch(() => setPlaybackError("This recording could not be played. Try reloading the call details."));
        } else {
          const timer = window.setTimeout(() => {
            void track.audio.play().catch(() => setPlaybackError("This recording could not be played. Try reloading the call details."));
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

  // Generate stylized vertical bars for waveform visualization
  const barCount = 42;
  const bars = Array.from({ length: barCount }, (_, i) => {
    void _;
    // Generate deterministic wave heights
    const sin1 = Math.sin((i / barCount) * Math.PI * 4);
    const cos1 = Math.cos((i / barCount) * Math.PI * 2);
    const heightPercent = 25 + Math.abs(sin1 * 45) + Math.abs(cos1 * 25);
    const isCompletedBar = i / barCount <= progressRatio;
    return { id: i, heightPercent, isCompletedBar };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span className="font-semibold text-accent-black text-xs">Call recording</span>
        <span className="text-[11px] text-neutral-400">
          Playback highlights the current speaker turn.
        </span>
      </div>

      <p className="text-[11px] text-neutral-500">Caller and agent voices are mixed into one synchronized playback.</p>

      <div className="bg-neutral-50 border border-border-faint rounded-12 p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
        {callerRecordingUrl && (
          <audio
            ref={callerAudioRef}
            src={callerRecordingUrl}
            preload="metadata"
            className="sr-only"
            onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime + callerRecordingOffsetMs / 1000)}
            onEnded={() => handleTrackEnded("caller")}
            onError={() => setPlaybackError("This recording could not be loaded. Please try again.")}
          />
        )}
        {recordingUrl && (
          <audio
            ref={agentAudioRef}
            src={recordingUrl}
            preload="metadata"
            className="sr-only"
            onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime + recordingOffsetMs / 1000)}
            onEnded={() => handleTrackEnded("agent")}
            onError={() => setPlaybackError("This recording could not be loaded. Please try again.")}
          />
        )}
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlayback}
          disabled={!recordingAvailable || !recordingUrl}
          aria-label={isPlaying ? "Pause playback" : "Start playback"}
          className="w-10 h-10 rounded-full bg-heat-100 hover:bg-heat-200 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        {/* Waveform / Progress bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="flex-1 min-w-[120px] sm:min-w-0 h-9 flex items-center gap-[2.5px] cursor-pointer group px-1 py-1"
          role="slider"
          aria-label="Seek recording"
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={currentTimeSeconds}
          tabIndex={0}
        >
          {bars.map((bar) => (
            <div
              key={bar.id}
              className={`flex-1 rounded-full transition-colors ${
                bar.isCompletedBar
                  ? "bg-heat-100"
                  : "bg-neutral-200 group-hover:bg-neutral-300"
              }`}
              style={{ height: `${bar.heightPercent}%` }}
            />
          ))}
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
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Mute button */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="text-neutral-400 hover:text-accent-black transition-colors shrink-0 p-1"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {!recordingAvailable && (
        <p className="text-[11px] text-neutral-400 italic">
          No recording is available for this call.
        </p>
      )}
      {playbackError && (
        <p role="alert" className="text-[11px] text-red-600">{playbackError}</p>
      )}
    </div>
  );
}
