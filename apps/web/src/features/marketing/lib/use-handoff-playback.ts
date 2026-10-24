"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HANDOFF_SCENARIOS, type HandoffScenario } from "../content/handoff-scenarios";

export type HandoffOwnership = "team" | "agent";

export type PlaybackPhase =
  | "complete"
  | "fading-out"
  | "showing-customer"
  | "moving-signal"
  | "typing-reply";

export interface SubmittedReply {
  id: string;
  text: string;
  timestamp: string;
}

export interface AttachmentPreview {
  name: string;
}

export function useHandoffPlayback() {
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);
  const [ownership, setOwnership] = useState<HandoffOwnership>("team");
  const [phase, setPhase] = useState<PlaybackPhase>("complete");

  // Interaction & pause states
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(true);
  const [isSectionInView, setIsSectionInView] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Local composer state
  const [draftText, setDraftText] = useState<string>("");
  const [attachment, setAttachment] = useState<AttachmentPreview | null>(null);
  const [submittedReplies, setSubmittedReplies] = useState<SubmittedReply[]>([]);

  // Timer ref to manage rotation sequence without memory leaks
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  const activeScenario: HandoffScenario = useMemo(() => {
    return HANDOFF_SCENARIOS[scenarioIndex] || HANDOFF_SCENARIOS[0];
  }, [scenarioIndex]);

  // Reduced motion media query listener
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Document visibility listener
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Check whether auto-rotation is paused
  const hasDraft = draftText.trim().length > 0;
  const hasAttachment = attachment !== null;

  const isPaused = useMemo(() => {
    return (
      prefersReducedMotion ||
      hasInteracted ||
      isFocused ||
      !isDocumentVisible ||
      !isSectionInView ||
      hasDraft ||
      hasAttachment
    );
  }, [
    prefersReducedMotion,
    hasInteracted,
    isFocused,
    isDocumentVisible,
    isSectionInView,
    hasDraft,
    hasAttachment,
  ]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Central rotation loop
  useEffect(() => {
    clearTimer();

    // If reduced motion is requested, immediately set to complete static scene
    if (prefersReducedMotion) {
      setPhase("complete");
      return;
    }

    if (isPaused) {
      // If paused during an intermediate transition, snap to complete to avoid hanging half-rendered states
      if (phase !== "complete") {
        setPhase("complete");
      }
      return;
    }

    if (!started.current) {
      started.current = true;
      setPhase("showing-customer");
      return;
    }

    // Phase: complete -> hold for 8 seconds, then begin transition sequence
    if (phase === "complete") {
      timerRef.current = setTimeout(() => {
        setPhase("fading-out");
      }, 8000);
      return;
    }

    // Step A: Fade out current scenario over ~180ms
    if (phase === "fading-out") {
      timerRef.current = setTimeout(() => {
        // Step B: Advance to next scenario
        setScenarioIndex((prev) => (prev + 1) % HANDOFF_SCENARIOS.length);
        // Step C: Fade new customer in
        setPhase("showing-customer");
      }, 360);
      return;
    }

    // Step C: Showing new customer for ~220ms before signal starts
    if (phase === "showing-customer") {
      timerRef.current = setTimeout(() => {
        // Step D: Start orange signal traversal
        setPhase("moving-signal");
      }, activeScenario.question.length * 30 + 500);
      return;
    }

    // Step D: Moving signal traverses over ~1300ms
    if (phase === "moving-signal") {
      timerRef.current = setTimeout(() => {
        // Step E: Reveal matching reply and return to complete phase
        setPhase("typing-reply");
      }, 1600);
      return;
    }
    if (phase === "typing-reply") {
      const message = ownership === "agent" ? activeScenario.agentMessage : activeScenario.teamReply;
      timerRef.current = setTimeout(() => setPhase("complete"), message.length * 25 + 100);
    }
  }, [phase, isPaused, prefersReducedMotion, clearTimer, activeScenario, ownership]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // Handlers for user interactions (stops rotation permanently for session)
  const selectOwnership = useCallback((newOwner: HandoffOwnership) => {
    setOwnership(newOwner);
  }, []);

  const handBackToAgent = useCallback(() => {
    setOwnership("agent");
  }, []);

  const sendReply = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || ownership === "agent") return;

      const newReply: SubmittedReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: trimmed,
        timestamp: "Just now",
      };

      setSubmittedReplies((prev) => [...prev, newReply]);
      setDraftText("");
      setAttachment(null);
      setHasInteracted(true);
    },
    [ownership]
  );

  const selectAttachment = useCallback((file: { name: string }) => {
    setAttachment(file);
    setHasInteracted(true);
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachment(null);
  }, []);

  return {
    activeScenario,
    scenarioIndex,
    ownership,
    phase,
    isPaused,
    hasInteracted,
    prefersReducedMotion,
    draftText,
    setDraftText: (text: string) => { setDraftText(text); setHasInteracted(true); },
    attachment,
    selectAttachment,
    removeAttachment,
    submittedReplies,
    setIsFocused,
    setIsSectionInView,
    selectOwnership,
    handBackToAgent,
    sendReply,
  };
}
