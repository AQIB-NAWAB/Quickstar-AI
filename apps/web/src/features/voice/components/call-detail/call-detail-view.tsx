"use client";

import { ArrowLeft,Calendar,Clock,ExternalLink,Phone,User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDuration,formatUtcDateTime } from "../../lib/format";
import type { InboundCallDetail } from "../../lib/types";
import { VoiceStatusBadge } from "../voice-status-badge";
import { VoiceSubnav } from "../voice-subnav";
import { CallMetadataCard } from "./call-metadata-card";
import { RecordingPlayer } from "./recording-player";
import { TranscriptViewer } from "./transcript-viewer";
import { TurnTimingBreakdown } from "./turn-timing-breakdown";

interface CallDetailViewProps {
  call: InboundCallDetail;
  workspaceId: string;
  isPreview?: boolean;
  baseInboundUrl?: string;
}

export function CallDetailView({
  call,
  workspaceId,
  isPreview = false,
  baseInboundUrl,
}: CallDetailViewProps) {
  const backUrl = baseInboundUrl || (isPreview ? "/preview/voice/inbound" : `/workspaces/${workspaceId}/voice/inbound`);

  // Playback state (with simulated timer for preview)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [followPlayback, setFollowPlayback] = useState(true);
  const [selectedTurnId, setSelectedTurnId] = useState<string>("turn_2"); // Default Turn 2 as in screenshot

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Back Link */}
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Inbound call logs</span>
        </Link>
      </div>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-accent-black">
              Call details &middot; {call.id}
            </h1>
            <VoiceStatusBadge status={call.status} />
            {isPreview && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-50 text-heat-100 border border-orange-200">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Review the recording, transcript, and response-stage timings.
          </p>
        </div>

        {call.conversationId && (
          <Link
            href={
              isPreview
                ? "/preview/inbox"
                : `/workspaces/${workspaceId}/inbox?conversationId=${call.conversationId}`
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors self-start sm:self-auto"
          >
            <span>Open conversation</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Top Metadata Strip */}
      <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              Caller
            </span>
            <span className="font-mono text-accent-black font-semibold truncate block">
              {call.caller}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              Agent
            </span>
            <span className="text-accent-black font-semibold truncate block">
              {call.agentName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              Duration
            </span>
            <span className="font-mono text-accent-black font-semibold block">
              {formatDuration(call.durationSeconds)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              Started
            </span>
            <span className="font-mono text-neutral-700 block text-[11px]">
              {formatUtcDateTime(call.startedAt, true)}
            </span>
          </div>
        </div>
      </div>

      {/* Voice Subnav Tabs */}
      <VoiceSubnav workspaceId={workspaceId} isPreview={isPreview} liveCount={2} />

      {/* Main Grid: Left 60% (Recording & Transcript), Right 40% (Timings & Metadata) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-4">
          <RecordingPlayer
            durationSeconds={call.recordingDurationSeconds || call.durationSeconds}
            currentTimeSeconds={currentTime}
            onSeek={(s) => setCurrentTime(s)}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            recordingAvailable={call.recordingAvailable || Boolean(call.callerRecordingAvailable)}
            recordingUrl={call.recordingUrl}
            callerRecordingUrl={call.callerRecordingUrl}
            recordingOffsetMs={call.recordingOffsetMs ?? 0}
            callerRecordingOffsetMs={call.callerRecordingOffsetMs ?? 0}
            onTimeUpdate={setCurrentTime}
          />

          <div className="h-px bg-border-faint" />

          <TranscriptViewer
            transcript={call.transcript}
            currentTimeSeconds={currentTime}
            onSeek={(s) => setCurrentTime(s)}
            followPlayback={followPlayback}
            onToggleFollowPlayback={() => setFollowPlayback(!followPlayback)}
            onSelectTurn={(turnId) => setSelectedTurnId(turnId)}
          />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-4">
          <TurnTimingBreakdown
            turns={call.processingTurns}
            selectedTurnId={selectedTurnId}
            onSelectTurn={(tId) => setSelectedTurnId(tId)}
          />

          <CallMetadataCard
            callId={call.id}
            conversationId={call.conversationId}
            direction="Inbound"
            disposition={call.disposition}
          />
        </div>
      </div>
    </div>
  );
}
