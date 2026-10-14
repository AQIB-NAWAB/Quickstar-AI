"use client";

import { Phone } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  getWidgetLiveCall,
  joinWidgetCall,
  leaveWidgetCall,
  sendWidgetCallAudio,
  takeConversation,
  type WidgetLiveCall,
} from "@/features/inbox/lib/client";
import type { Conversation } from "@/features/inbox/lib/types";

const BARS = 29;

type AudioRig = {
  ctx: AudioContext | null;
  stream: MediaStream | null;
  processor: ScriptProcessorNode | null;
  source: MediaStreamAudioSourceNode | null;
  timer: number | null;
  pending: Float32Array[];
  sending: boolean;
  play: AudioContext | null;
  playAt: number;
  analyser: AnalyserNode | null;
  time: Uint8Array<ArrayBuffer> | null;
  mic: number;
  events: EventSource | null;
};

type Props = {
  workspaceId: string;
  conversationId: string;
  agentName: string;
  state: Conversation["state"];
  onConversation: (conversation: Conversation) => void;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function floatToPcm16(input: Float32Array): Uint8Array {
  const out = new Uint8Array(input.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

export function useStaffLiveCall({ workspaceId, conversationId, agentName, state, onConversation }: Props) {
  const [call, setCall] = useState<WidgetLiveCall | null>(null);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const audioRef = useRef<AudioRig>({
    ctx: null,
    stream: null,
    processor: null,
    source: null,
    timer: null,
    pending: [],
    sending: false,
    play: null,
    playAt: 0,
    analyser: null,
    time: null,
    mic: 0,
    events: null,
  });

  const refresh = useCallback(async () => {
    const result = await getWidgetLiveCall(workspaceId, conversationId);
    if (result.error) return;
    setCall(result.live ? result.call ?? null : null);
  }, [workspaceId, conversationId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.hidden || joinedRef.current) return;
      void refresh();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    joinedRef.current = false;
    audio.mic = 0;
    if (audio.timer) window.clearInterval(audio.timer);
    audio.timer = null;
    audio.pending = [];
    try {
      audio.processor?.disconnect();
      audio.source?.disconnect();
    } catch {
      /* ignore */
    }
    audio.processor = null;
    audio.source = null;
    audio.stream?.getTracks().forEach((track) => track.stop());
    audio.stream = null;
    if (audio.ctx && audio.ctx.state !== "closed") void audio.ctx.close();
    audio.ctx = null;
    if (audio.play && audio.play.state !== "closed") void audio.play.close();
    audio.play = null;
    audio.analyser = null;
    audio.time = null;
    audio.events?.close();
    audio.events = null;
    setJoined(false);
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  useEffect(() => {
    if (state !== "human" && joinedRef.current) stopAudio();
  }, [state, stopAudio]);

  function playPcm16(b64: string, sampleRate: number) {
    const audio = audioRef.current;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const samples = new Float32Array(Math.floor(bytes.length / 2));
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    if (!samples.length) return;
    if (!audio.play || audio.play.state === "closed") {
      audio.play = new AudioContext({ sampleRate });
      const analyser = audio.play.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.32;
      analyser.connect(audio.play.destination);
      audio.analyser = analyser;
      audio.time = new Uint8Array(analyser.fftSize);
    }
    if (audio.play.state === "suspended") void audio.play.resume();
    const buffer = audio.play.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = audio.play.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.analyser ?? audio.play.destination);
    const now = audio.play.currentTime;
    if (audio.playAt < now + 0.02) audio.playAt = now + 0.05;
    source.start(audio.playAt);
    audio.playAt += buffer.duration;
  }

  async function flushMic() {
    const audio = audioRef.current;
    if (!joinedRef.current || audio.sending || audio.pending.length === 0) return;
    audio.sending = true;
    const merged = new Float32Array(audio.pending.reduce((n, chunk) => n + chunk.length, 0));
    let offset = 0;
    for (const chunk of audio.pending) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    audio.pending = [];
    try {
      await sendWidgetCallAudio(workspaceId, conversationId, bytesToBase64(floatToPcm16(merged)));
    } catch {
      /* the next chunk retries once the visitor side is ready */
    } finally {
      audio.sending = false;
    }
  }

  async function join() {
    setBusy(true);
    setError(null);
    if (state !== "human") {
      const taken = await takeConversation(workspaceId, conversationId);
      if (taken.error) {
        setError(taken.error.message);
        setBusy(false);
        return;
      }
      if (taken.conversation) onConversation(taken.conversation);
    }
    const joinedCall = await joinWidgetCall(workspaceId, conversationId, agentName);
    if (joinedCall.error) {
      setError(joinedCall.error.message);
      setBusy(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const ctx = new AudioContext({ sampleRate: 16_000 });
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(1024, 1, 1);
      const audio = audioRef.current;
      audio.stream = stream;
      audio.ctx = ctx;
      audio.source = source;
      audio.processor = processor;
      processor.onaudioprocess = (event) => {
        if (!joinedRef.current) return;
        const channel = event.inputBuffer.getChannelData(0);
        audio.pending.push(new Float32Array(channel));
        let sum = 0;
        for (let i = 0; i < channel.length; i++) sum += channel[i] * channel[i];
        const rms = Math.min(1, Math.sqrt(sum / channel.length) * 8);
        audio.mic = audio.mic * 0.55 + rms * 0.45;
      };
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(ctx.destination);
      audio.timer = window.setInterval(() => void flushMic(), 100);
      audio.events = new EventSource(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/voice/widget-live/${encodeURIComponent(conversationId)}/stream`,
      );
      audio.events.addEventListener("audio", (event) => {
        const raw = (event as MessageEvent<string>).data;
        let data: { encoding?: string; data?: string; sample_rate?: number } = {};
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          return;
        }
        if (data.encoding === "pcm16" && data.data) playPcm16(data.data, data.sample_rate || 16000);
      });
      joinedRef.current = true;
      setJoined(true);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the microphone");
      await leaveWidgetCall(workspaceId, conversationId);
      stopAudio();
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    stopAudio();
    await leaveWidgetCall(workspaceId, conversationId);
    setBusy(false);
    void refresh();
  }

  return { call, joined, busy, error, join, leave, audioRef };
}

export function LiveCallWave({
  active,
  busy,
  audioRef,
  onEnd,
}: {
  active: boolean;
  busy: boolean;
  audioRef: RefObject<AudioRig>;
  onEnd: () => void;
}) {
  const barsRef = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const paint = () => {
      const audio = audioRef.current;
      const speaking = Boolean(audio?.play && audio.analyser && audio.time && audio.play.currentTime + 0.04 < audio.playAt);
      if (speaking && audio?.analyser && audio.time) {
        audio.analyser.getByteTimeDomainData(audio.time);
        const len = audio.time.length;
        for (let i = 0; i < BARS; i++) {
          const start = Math.floor((i / BARS) * len);
          const end = Math.max(start + 1, Math.floor(((i + 1) / BARS) * len));
          let peak = 0;
          for (let s = start; s < end; s++) {
            const amp = Math.abs(audio.time[s] - 128) / 128;
            if (amp > peak) peak = amp;
          }
          const shaped = Math.min(1, Math.pow(peak, 0.6) * 1.9);
          const bar = barsRef.current[i];
          if (bar) bar.style.transform = `scaleY(${(0.08 + shaped * 0.92).toFixed(3)})`;
        }
      } else {
        const now = performance.now();
        const drive = 0.22 + (audio?.mic ?? 0) * 0.78;
        const center = (BARS - 1) / 2;
        for (let i = 0; i < BARS; i++) {
          const dist = Math.abs(i - center) / center;
          const ripple = 0.5 + 0.5 * Math.sin(now / 240 + i * 0.5);
          const scale = 0.07 + (1 - dist * 0.4) * ripple * drive * 0.38;
          const bar = barsRef.current[i];
          if (bar) bar.style.transform = `scaleY(${scale.toFixed(3)})`;
        }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [active, audioRef]);

  if (!active) return null;

  return (
    <div className="w-full">
      <div className="flex w-full items-center gap-3">
        <div
          className="flex h-[4.5rem] min-w-0 flex-1 items-center justify-center gap-[5px] rounded-[28px] px-3"
          style={{ background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--heat-100) 16%, transparent), transparent 72%)" }}
          aria-hidden="true"
        >
          {Array.from({ length: BARS }, (_, index) => (
            <i
              key={index}
              ref={(node) => {
                barsRef.current[index] = node;
              }}
              className="block h-14 w-1.5 origin-center rounded-full bg-heat-100 opacity-90 will-change-transform"
              style={{ transform: "scaleY(0.1)" }}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="End call"
          disabled={busy}
          onClick={onEnd}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-crimson text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--accent-crimson)_35%,transparent)] transition-transform hover:scale-105 disabled:opacity-60"
        >
          <Phone className="h-5 w-5 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}
