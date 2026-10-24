"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  REHEARSAL_CALLS,
  type CaptionSegment,
  type RehearsalCall,
  type TranscriptEntry,
} from "../sections/voice-rehearsal/content";

export type SpeakerFilter = "all" | "customer" | "agent";

export interface RehearsalPlaybackState {
  currentCall: RehearsalCall;
  isAudioAvailable: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  playbackError: string | null;
  currentTime: number;
  duration: number | null;
  progressRatio: number;
  currentCaption: CaptionSegment | null;
  currentExcerptText: string;
  currentExcerptSpeaker: "customer" | "agent";
  activeSpeakerFilter: SpeakerFilter;
  isTranscriptExpanded: boolean;
  filteredTranscript: TranscriptEntry[];
  prefersReducedMotion: boolean;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  replayCall: () => void;
  selectSpeakerFilter: (filter: SpeakerFilter) => void;
  toggleTranscript: () => void;
  setIsTranscriptExpanded: (expanded: boolean) => void;
  setIsSectionInView: (inView: boolean) => void;
}

export function useRehearsalPlayback(initialCallIndex = 0): RehearsalPlaybackState {
  const [selectedCallIndex] = useState(initialCallIndex);
  const currentCall = REHEARSAL_CALLS[selectedCallIndex] || REHEARSAL_CALLS[0];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(currentCall.durationSeconds);
  const [activeSpeakerFilter, setActiveSpeakerFilter] = useState<SpeakerFilter>("all");
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isSectionInView, setIsSectionInView] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isAudioAvailable = Boolean(currentCall.audioSrc);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Initialize or update HTMLAudioElement when call changes
  useEffect(() => {
    // Stop any existing animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Clean up previous audio instance
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
    setPlaybackError(null);
    setIsTranscriptExpanded(false);
    setActiveSpeakerFilter("all");
    setCurrentTime(0);
    setDuration(currentCall.durationSeconds);

    if (!currentCall.audioSrc) {
      return;
    }

    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = currentCall.audioSrc;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const onPause = () => {
      setIsPlaying(false);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const onWaiting = () => {
      setIsLoading(true);
    };

    const onCanPlay = () => {
      setIsLoading(false);
    };

    const onError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setPlaybackError("Failed to load test call audio.");
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [currentCall]);

  // RequestAnimationFrame loop for silky smooth playhead updates during active playback
  useEffect(() => {
    if (!isPlaying || !audioRef.current || prefersReducedMotion) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const step = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
        rafIdRef.current = requestAnimationFrame(step);
      }
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, prefersReducedMotion]);

  // Pause playback when tab/document is hidden or section exits viewport
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isSectionInView && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [isSectionInView]);

  // Toggle playback
  const togglePlay = useCallback(() => {
    if (!isAudioAvailable) {
      // Audio is absent; do not fake playback
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== "AbortError") {
            setPlaybackError("Playback was interrupted or blocked.");
          }
        });
      }
    }
  }, [isAudioAvailable, isPlaying]);

  // Seek to position
  const seekTo = useCallback(
    (seconds: number) => {
      if (!Number.isFinite(seconds) || !isAudioAvailable || !audioRef.current || duration === null || duration <= 0) {
        return;
      }

      const clamped = Math.max(0, Math.min(seconds, duration));
      audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [isAudioAvailable, duration]
  );

  // Replay call
  const replayCall = useCallback(() => {
    if (!isAudioAvailable || !audioRef.current) {
      setCurrentTime(0);
      return;
    }

    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err.name !== "AbortError") {
          setPlaybackError("Playback could not be started.");
        }
      });
    }
  }, [isAudioAvailable]);

  // Speaker filter selection
  const selectSpeakerFilter = useCallback((filter: SpeakerFilter) => {
    setActiveSpeakerFilter((prev) => (prev === filter ? "all" : filter));
  }, []);

  // Toggle full transcript expansion
  const toggleTranscript = useCallback(() => {
    setIsTranscriptExpanded((prev) => !prev);
  }, []);

  // Compute progress ratio (0 to 1)
  const progressRatio = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.max(0, Math.min(currentTime / duration, 1));
  }, [currentTime, duration]);

  // Active caption segment
  const currentCaption = useMemo(() => {
    if (!isAudioAvailable) return null;
    return (
      currentCall.captions.find(
        (cap) => currentTime >= cap.start && currentTime <= cap.end
      ) || null
    );
  }, [isAudioAvailable, currentCall.captions, currentTime]);

  // Display excerpt: if audio is active and a caption matches, show it.
  // Otherwise, default to the approved reference excerpt.
  const currentExcerptText = isAudioAvailable
    ? currentCaption?.text || "Press play to hear the rehearsal."
    : currentCall.defaultExcerpt.text;
  const currentExcerptSpeaker = currentCaption?.speaker || currentCall.defaultExcerpt.speaker;

  // Filtered transcript entries based on speaker filter
  const filteredTranscript = useMemo(() => {
    if (activeSpeakerFilter === "all") return currentCall.transcript;
    return currentCall.transcript.filter(
      (entry) => entry.speaker === activeSpeakerFilter
    );
  }, [currentCall.transcript, activeSpeakerFilter]);

  return {
    currentCall,
    isAudioAvailable,
    isPlaying,
    isLoading,
    playbackError,
    currentTime,
    duration,
    progressRatio,
    currentCaption,
    currentExcerptText,
    currentExcerptSpeaker,
    activeSpeakerFilter,
    isTranscriptExpanded,
    filteredTranscript,
    prefersReducedMotion,
    togglePlay,
    seekTo,
    replayCall,
    selectSpeakerFilter,
    toggleTranscript,
    setIsTranscriptExpanded,
    setIsSectionInView,
  };
}
