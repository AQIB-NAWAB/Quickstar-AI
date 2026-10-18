"use client";
import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, RotateCcw, Info } from "lucide-react";
import type { GraphSessionState } from "@quickstart/contracts";
import type { ChatMessageItem } from "./chat-workbench";
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  abort: () => void;
};
export type VoiceWorkbenchProps = {
  draftRevision: number;
  sessionState: GraphSessionState | null;
  onSendMessage: (text: string) => Promise<void>;
  onResetSession: () => Promise<void>;
  messages: ChatMessageItem[];
  isLoading: boolean;
};
export const VoiceWorkbench: React.FC<VoiceWorkbenchProps> = (p) => {
  const [active, setActive] = useState(false),
    [muted, setMuted] = useState(false),
    [audioMuted, setAudioMuted] = useState(false),
    [status, setStatus] = useState("Ready"),
    [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null),
    stream = useRef<MediaStream | null>(null),
    generation = useRef(0),
    live = useRef(false),
    seen = useRef(new Set<string>()),
    busy = useRef(false),
    speech = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = () => {
    generation.current++;
    live.current = false;
    if (recognition.current) {
      recognition.current.onend = null;
      recognition.current.abort();
      recognition.current = null;
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (speech.current) window.speechSynthesis?.cancel();
    speech.current = null;
    setActive(false);
    setStatus("Ready");
  };
  useEffect(
    () => () => {
      generation.current++;
      live.current = false;
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.abort();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      if (speech.current) window.speechSynthesis?.cancel();
    },
    [],
  );
  useEffect(() => {
    busy.current = p.isLoading;
    if (active && p.isLoading) setStatus("Processing");
  }, [p.isLoading, active]);
  useEffect(() => {
    if (!active) return;
    const fresh = p.messages.filter((m) => m.sender === "assistant" && !seen.current.has(m.id));
    for (const m of fresh) {
      seen.current.add(m.id);
      if (audioMuted || !window.speechSynthesis) continue;
      const u = new SpeechSynthesisUtterance(m.text.replace(/[*#`]/g, ""));
      speech.current = u;
      u.onstart = () => {
        if (live.current) {
          setStatus("Agent speaking");
          recognition.current?.abort();
        }
      };
      u.onend = () => {
        speech.current = null;
        if (live.current) {
          setStatus(muted ? "Microphone muted" : "Listening");
          if (!muted)
            try {
              recognition.current?.start();
            } catch {
              /* Already active. */
            }
        }
      };
      u.onerror = () => {
        speech.current = null;
        if (live.current) setStatus("Ready");
      };
      window.speechSynthesis.speak(u);
    }
  }, [p.messages, active, audioMuted, muted]);
  const start = async () => {
    setError(null);
    const ticket = ++generation.current;
    const Ctor =
      (
        window as unknown as {
          SpeechRecognition?: new () => Recognition;
          webkitSpeechRecognition?: new () => Recognition;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition })
        .webkitSpeechRecognition;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Browser speech recognition is unavailable. Use chat preview or a supported browser.",
      );
      return;
    }
    if (!p.sessionState) {
      setError("Initialize the preview session using Reset session first.");
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (ticket !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const r = new Ctor();
      r.continuous = false;
      r.interimResults = false;
      r.lang = "en-US";
      r.onresult = async (e) => {
        const last = e.results[e.results.length - 1];
        if (!last.isFinal || busy.current || !live.current) return;
        const text = last[0].transcript.trim();
        if (!text) return;
        busy.current = true;
        setStatus("Processing");
        try {
          await p.onSendMessage(text);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Voice turn failed.");
        } finally {
          busy.current = false;
          if (live.current && !speech.current) setStatus("Listening");
        }
      };
      r.onend = () => {
        if (
          live.current &&
          !busy.current &&
          !speech.current &&
          stream.current?.getAudioTracks().some((t) => t.enabled)
        )
          try {
            r.start();
          } catch {
            /* Session is stopping. */
          }
      };
      r.onerror = (e) => {
        if (!["no-speech", "aborted"].includes(e.error)) {
          setError(`Speech recognition: ${e.error}`);
          stop();
        }
      };
      recognition.current = r;
      live.current = true;
      setActive(true);
      setMuted(false);
      setStatus("Listening");
      seen.current = new Set(p.messages.map((m) => m.id));
      r.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access failed.");
      stop();
    }
  };
  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      <div className="p-4 space-y-3 shrink-0">
        <div className="rounded-lg border border-[#EDEDED] p-3 flex gap-2 text-xs">
          <Info className="w-4 h-4 shrink-0" />
          <div>
            <strong>Browser speech preview</strong>
            <p className="mt-1 text-neutral-500">
              Uses browser speech recognition and voice. Does not place a phone call or preview the
              configured speech provider.
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-500">Draft v{p.draftRevision}</p>
        {error && (
          <p
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </p>
        )}
        <div className="rounded-lg border border-[#EDEDED] p-4">
          <p role="status" className="text-xs font-medium mb-5">
            {status}
          </p>
          {!active ? (
            <button
              onClick={() => void start()}
              disabled={p.isLoading}
              className="rounded-lg bg-[#FA5D19] text-white px-4 py-2 text-xs flex gap-2 items-center disabled:opacity-40"
            >
              <Mic className="w-4 h-4" />
              Start voice session
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  stream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
                  if (next) {
                    recognition.current?.abort();
                    setStatus("Microphone muted");
                  } else {
                    setStatus("Listening");
                    try {
                      recognition.current?.start();
                    } catch {}
                  }
                }}
                className="rounded-lg border p-3 flex flex-col items-center gap-2"
              >
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {muted ? "Unmute mic" : "Mute mic"}
              </button>
              <button
                onClick={() => {
                  setAudioMuted(!audioMuted);
                  if (!audioMuted && speech.current) {
                    window.speechSynthesis.cancel();
                    speech.current = null;
                    setStatus(muted ? "Microphone muted" : "Listening");
                  }
                }}
                className="rounded-lg border p-3 flex flex-col items-center gap-2"
              >
                {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {audioMuted ? "Unmute audio" : "Mute audio"}
              </button>
              <button
                onClick={stop}
                className="rounded-lg border border-red-200 bg-red-50 text-red-600 p-3 flex flex-col items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End session
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 space-y-3">
        <h3 className="text-sm font-semibold">Transcript</h3>
        {!p.messages.length && (
          <p className="text-xs text-neutral-500">
            Initialize the preview, then start a voice session.
          </p>
        )}
        {p.messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg border border-[#EDEDED] p-3 text-[13px] ${m.sender === "user" ? "bg-neutral-50" : "bg-white"}`}
          >
            <p className="text-[11px] text-neutral-500 mb-1">
              {m.sender === "assistant" ? "Agent" : m.sender === "user" ? "You" : "System"} ·{" "}
              {m.timestamp}
            </p>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <footer className="shrink-0 p-4 border-t border-[#EDEDED]">
        <button
          disabled={p.isLoading}
          onClick={() => {
            stop();
            void p.onResetSession();
          }}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset session
        </button>
      </footer>
    </div>
  );
};
