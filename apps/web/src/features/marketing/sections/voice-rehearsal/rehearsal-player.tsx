"use client";

import Image from "next/image";
import { useState } from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { RehearsalWaveform } from "./rehearsal-waveform";
import type { RehearsalPlaybackState } from "../../lib/use-rehearsal-playback";

const excerpts = {
  customer: "Thursday at 3 works for me.",
  agent: "Of course. I have Thursday at 3 PM. Would that work for you?",
};

export function RehearsalPlayer({ playback }: { playback: RehearsalPlaybackState }) {
  const [previewSpeaker, setPreviewSpeaker] = useState<"customer" | "agent">("agent");
  const { currentCall, isAudioAvailable, isPlaying, isLoading, currentCaption, currentTime, duration, progressRatio, playbackError, togglePlay, seekTo } = playback;
  const speaker = isAudioAvailable && currentCaption ? currentCaption.speaker : previewSpeaker;
  const text = isAudioAvailable ? playback.currentExcerptText : excerpts[speaker];
  return (
    <div className="marketing-rehearsal-player-root">
      <div className="marketing-rehearsal-speaker-heading">
        {speaker === "agent" ? <span className="marketing-rehearsal-brand"><BrandLogo size={30} fillColor="#fff" /></span> : <Image unoptimized src="/marketing/use-cases/portrait-appointment.png" width={54} height={54} alt="Customer" />}
        <div><strong>{speaker === "agent" ? "Your agent" : "Customer"}</strong><span>{currentCall.title}</span></div>
      </div>
      <div className="marketing-rehearsal-quote"><p key={speaker + text}>{text}</p></div>
      <div className={`marketing-rehearsal-speaking ${isPlaying ? "is-playing" : ""}`}>
        <span className="marketing-rehearsal-signal" aria-hidden="true"><i /><i /><i /></span>
        <span>{isPlaying ? (speaker === "agent" ? "Your agent is speaking" : "Customer is speaking") : "Conversation preview"}</span>
      </div>
      <div className="marketing-rehearsal-audio-row">
        <button type="button" className="marketing-rehearsal-play-btn" onClick={togglePlay} disabled={!isAudioAvailable} aria-label={!isAudioAvailable ? "Test-call audio is being prepared" : isPlaying ? "Pause test call" : "Listen to test call"} aria-describedby={!isAudioAvailable ? "rehearsal-audio-status" : undefined}>
          {isLoading ? <LoaderCircle className="marketing-rehearsal-loading" size={22} /> : isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
        </button>
        <RehearsalWaveform peaks={currentCall.peaks} progressRatio={progressRatio} currentTime={currentTime} duration={duration} isAudioAvailable={isAudioAvailable} onSeek={seekTo} />
      </div>
      <div className="marketing-rehearsal-speakers-group" role="group" aria-label="Preview a speaker">
        <button type="button" onClick={() => setPreviewSpeaker("customer")} aria-label="Customer" aria-pressed={previewSpeaker === "customer"} className={`marketing-rehearsal-speaker-btn ${previewSpeaker === "customer" ? "active" : ""}`} disabled={isPlaying}>
          <Image unoptimized src="/marketing/use-cases/portrait-appointment.png" width={42} height={42} alt="" /><span>Customer</span>
        </button>
        <span className="marketing-rehearsal-speaker-separator" aria-hidden="true" />
        <button type="button" onClick={() => setPreviewSpeaker("agent")} aria-label="Your agent" aria-pressed={previewSpeaker === "agent"} className={`marketing-rehearsal-speaker-btn ${previewSpeaker === "agent" ? "active" : ""}`} disabled={isPlaying}>
          <span className="marketing-rehearsal-brand small"><BrandLogo size={25} fillColor="#fff" /></span><span>Your agent</span>
        </button>
      </div>
      {!isAudioAvailable && <p id="rehearsal-audio-status" className="marketing-rehearsal-audio-status">Test-call audio is being prepared.</p>}
      {playbackError && <p role="alert" className="marketing-rehearsal-audio-status">{playbackError}</p>}
    </div>
  );
}
