"use client";

import { Play } from "lucide-react";
import { useEffect,useRef } from "react";
import { formatSecondsOffset } from "../../lib/format";
import type { TranscriptSegment } from "../../lib/types";

interface TranscriptViewerProps {
  transcript: TranscriptSegment[];
  currentTimeSeconds: number;
  onSeek: (seconds: number) => void;
  followPlayback: boolean;
  onToggleFollowPlayback: () => void;
  onSelectTurn?: (turnId: string) => void;
}

export function TranscriptViewer({
  transcript,
  currentTimeSeconds,
  onSeek,
  followPlayback,
  onToggleFollowPlayback,
  onSelectTurn,
}: TranscriptViewerProps) {
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const currentTimeMs = currentTimeSeconds * 1000;

  // Scroll to active segment when followPlayback is true
  useEffect(() => {
    if (followPlayback && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentTimeSeconds, followPlayback]);

  return (
    <div className="space-y-3 pt-2">
      {/* Transcript Header with Follow Playback Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-accent-black">Transcript</h2>

        <div className="flex items-center gap-2">
          <label
            htmlFor="follow-playback-toggle"
            className="text-xs text-neutral-500 cursor-pointer select-none"
          >
            Follow playback
          </label>
          <button
            id="follow-playback-toggle"
            type="button"
            role="switch"
            aria-checked={followPlayback}
            onClick={onToggleFollowPlayback}
            className={`w-8 h-4 rounded-full p-0.5 transition-colors relative cursor-pointer ${
              followPlayback ? "bg-heat-100" : "bg-neutral-300"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                followPlayback ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Segments List */}
      <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
        {transcript.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-400">
            No transcript available for this call.
          </div>
        ) : (
          transcript.map((seg) => {
            const isActive =
              currentTimeMs >= seg.startMs && currentTimeMs < seg.endMs;

            return (
              <div
                key={seg.id}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => seg.processingTurnId && onSelectTurn?.(seg.processingTurnId)}
                className={`flex items-start gap-2.5 p-2 rounded-8 text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-orange-50/70 border-l-2 border-heat-100 pl-2.5"
                    : "hover:bg-neutral-50/70 border-l-2 border-transparent"
                }`}
              >
                {/* Timestamp button (click to seek) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(Math.floor(seg.startMs / 1000));
                  }}
                  title="Seek to turn"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-400 hover:text-heat-100 transition-colors shrink-0 pt-0.5"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{formatSecondsOffset(Math.floor(seg.startMs / 1000))}</span>
                </button>

                {/* Speaker pill */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0  ${
                    seg.speaker === "agent"
                      ? "bg-orange-50 text-heat-100 border border-orange-200"
                      : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                  }`}
                >
                  {seg.speaker === "agent" ? "Agent" : "User"}
                </span>

                {/* Text */}
                <span className="text-neutral-700 leading-relaxed flex-1">
                  {seg.text}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
