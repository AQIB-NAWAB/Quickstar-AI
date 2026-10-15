"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

export type CatalogVoice = {
  id: string;
  provider: string;
  label: string;
  language: string;
  description: string;
  sample_text: string;
  available: boolean;
};

type Props = {
  workspaceId: string;
  voiceId: string;
  onChange: (voice: CatalogVoice) => void;
};

export function VoiceCatalogPicker({ workspaceId, voiceId, onChange }: Props) {
  const [voices, setVoices] = useState<CatalogVoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/voice/catalog`)
      .then(async (res) => {
        const body = (await res.json()) as { voices?: CatalogVoice[]; error?: { message?: string } };
        if (!res.ok) throw new Error(body.error?.message || "Could not load voices");
        if (!cancelled) setVoices(body.voices ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load voices");
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function preview(voice: CatalogVoice) {
    setPreviewError(null);
    setPreviewing(voice.id);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/voice/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voice.id, text: voice.sample_text }),
      });
      const body = (await res.json()) as {
        audio_b64?: string;
        mime?: string;
        error?: { message?: string };
      };
      if (!res.ok || !body.audio_b64) {
        throw new Error(body.error?.message || "Preview failed");
      }
      const audio = new Audio(`data:${body.mime || "audio/mpeg"};base64,${body.audio_b64}`);
      await audio.play();
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(null);
    }
  }

  return (
    <div className="pt-2">
      <span className="block text-xs font-bold text-accent-black mb-1">Spoken voice</span>
      <p className="text-[10px] text-neutral-500 mb-2">
        Cascade voices. Preview uses the provider key on the voice service. Publish the agent so live calls use this voice.
      </p>
      {loadError ? <p className="text-[11px] text-red-600 mb-2">{loadError}</p> : null}
      <div className="space-y-2">
        {voices.map((voice) => {
          const selected = voice.id === voiceId;
          return (
            <div
              key={voice.id}
              className={`flex items-center gap-3 p-3 rounded-10 border ${
                selected ? "border-heat-100 bg-orange-50/40" : "border-border-faint"
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(voice)}
                className="flex-1 text-left"
              >
                <p className="text-xs font-semibold text-accent-black">
                  {voice.label}
                  <span className="ml-2 font-normal text-neutral-500">{voice.language}</span>
                </p>
                <p className="text-[10px] text-neutral-500">{voice.description}</p>
                {!voice.available ? (
                  <p className="text-[10px] text-amber-700 mt-1">Provider key not configured on the voice service.</p>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => void preview(voice)}
                disabled={previewing === voice.id}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-8 border border-border-faint text-[11px] font-semibold text-accent-black hover:bg-neutral-50 disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                {previewing === voice.id ? "Playing" : "Preview"}
              </button>
            </div>
          );
        })}
      </div>
      {previewError ? <p className="text-[11px] text-red-600 mt-2">{previewError}</p> : null}
    </div>
  );
}
