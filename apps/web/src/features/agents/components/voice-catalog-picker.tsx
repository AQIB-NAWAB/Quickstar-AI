"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Play, Search, Square } from "lucide-react";

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

function formatLanguage(langCode: string): string {
  const code = langCode.toLowerCase().trim();
  if (code === "ur-pk") return "Urdu (Pakistan)";
  if (code === "ur") return "Urdu";
  if (code === "en-us" || code === "en") return "English";
  return langCode;
}

export function VoiceCatalogPicker({ workspaceId, voiceId, onChange }: Props) {
  const [voices, setVoices] = useState<CatalogVoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch voice catalog
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

  // Audio preview handler
  async function handlePreview(voice: CatalogVoice, e: React.MouseEvent) {
    e.stopPropagation();

    // If currently playing this voice, stop it
    if (previewingId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPreviewingId(null);
      setIsLoadingPreview(false);
      return;
    }

    // Stop existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPreviewError(null);
    setIsLoadingPreview(true);
    setPreviewingId(voice.id);

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
        throw new Error(body.error?.message || "Preview unavailable");
      }

      const audio = new Audio(`data:${body.mime || "audio/mpeg"};base64,${body.audio_b64}`);
      audioRef.current = audio;

      audio.onended = () => {
        setPreviewingId(null);
        setIsLoadingPreview(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPreviewError("Audio playback failed");
        setPreviewingId(null);
        setIsLoadingPreview(false);
        audioRef.current = null;
      };

      setIsLoadingPreview(false);
      await audio.play();
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
      setPreviewingId(null);
      setIsLoadingPreview(false);
      audioRef.current = null;
    }
  }

  // Filter voices
  const uniqueLanguages = Array.from(new Set(voices.map((v) => v.language)));

  const filteredVoices = voices.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.label.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.provider.toLowerCase().includes(q);
    const matchesLang = languageFilter === "all" || v.language === languageFilter;
    return matchesSearch && matchesLang;
  });

  return (
    <div className="bg-white border border-[#E1E5EA] rounded-[8px] overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-4 pb-3">
        <h3 className="text-[18px] font-semibold text-[#202125]">Spoken voice</h3>
        <p className="mt-0.5 text-[13px] text-[#667085]">
          Choose a voice and listen before saving.
        </p>

        {/* Filter Row */}
        <div className="mt-4 flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voices..."
              className="w-full pl-8 pr-3 py-2.5 text-[14px] text-[#202125] bg-white border border-[#E1E5EA] rounded-md focus:outline-none focus:border-[#F15A24] placeholder-[#98A2B3]"
            />
          </div>

          <div className="relative">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2.5 text-[14px] font-medium text-[#344054] bg-white border border-[#E1E5EA] rounded-md focus:outline-none focus:border-[#F15A24]"
            >
              <option value="all">All languages</option>
              {uniqueLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {formatLanguage(lang)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {previewError && (
        <div className="px-4 py-2 bg-red-50 text-[12px] text-[#B42318] border-b border-red-200">
          {previewError}
        </div>
      )}

      {/* Voice List */}
      <div className="mx-4 mb-4 overflow-y-auto max-h-[520px] rounded-lg border border-[#E1E5EA] divide-y divide-[#EDF0F2]">
        {loadError ? (
          <div className="p-6 text-center text-[13px] text-[#B42318]">{loadError}</div>
        ) : filteredVoices.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[#667085]">
            No voices found matching your filters.
          </div>
        ) : (
          filteredVoices.map((voice) => {
            const isSelected = voice.id === voiceId;
            const isPlayingThis = previewingId === voice.id;

            return (
              <div
                key={voice.id}
                role="radio"
                aria-checked={voiceId === voice.id}
                tabIndex={0}
                onClick={() => onChange(voice)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(voice);
                  }
                }}
                className={`min-h-[72px] px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#FFF3ED]"
                    : "hover:bg-[#F8F9FA]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Radio button */}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-[#F15A24] bg-[#F15A24]"
                        : "border-[#D0D5DD] bg-white"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <div className="min-w-0">
                    <span className="block text-[14px] font-semibold text-[#202125] leading-tight truncate">
                      {voice.label}
                    </span>
                    <span className="block text-[12px] text-[#667085] leading-normal mt-1">
                      {formatLanguage(voice.language)} · {voice.description}
                    </span>
                  </div>
                </div>

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={(e) => void handlePreview(voice, e)}
                  title="Preview voice"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#344054] bg-white border border-[#E1E5EA] rounded hover:bg-[#F8F9FA] transition-colors shrink-0 shadow-sm"
                >
                  {isPlayingThis ? (
                    isLoadingPreview ? (
                      <span>Loading...</span>
                    ) : (
                      <>
                        <Square className="w-2.5 h-2.5 fill-current text-[#F15A24]" />
                        <span>Stop</span>
                      </>
                    )
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 fill-current text-[#475467]" />
                      <span>Preview</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3.5 bg-[#FAFBFB] border-t border-[#EDF0F2] text-[12px] text-[#667085]">
        Publish to use the selected voice in live calls.
      </div>
    </div>
  );
}
