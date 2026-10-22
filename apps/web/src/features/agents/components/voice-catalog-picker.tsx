"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Play, Search, Square } from "lucide-react";

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

  // Stop audio on unmount or tab switch
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

  // Audio preview handler (click on Preview does NOT select the voice radio)
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
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="text-[20px] font-semibold text-[#202125]">Spoken voice</h3>
        <p className="mt-1 text-[14px] text-[#667085]">
          Choose a voice and listen before saving.
        </p>
      </div>

      {/* Toolbar: Search input & All languages dropdown on same baseline matching 7.png */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voices..."
            className="w-full pl-9 pr-3 h-10 text-[14px] text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] focus:outline-none focus:border-[#FF571A] placeholder-[#98A2B3]"
          />
        </div>

        <div className="relative shrink-0">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 h-10 text-[14px] font-medium text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] focus:outline-none focus:border-[#FF571A] cursor-pointer"
          >
            <option value="all">All languages</option>
            {uniqueLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {formatLanguage(lang)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {previewError && (
        <div className="p-3 bg-red-50 text-[13px] text-[#B42318] rounded-[6px] border border-red-200">
          {previewError}
        </div>
      )}

      {/* Voice List matching 7.png */}
      <div className="border border-[#DCE1E8] rounded-[8px] divide-y divide-[#EAECF0] overflow-hidden bg-white max-h-[380px] overflow-y-auto">
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
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => onChange(voice)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(voice);
                  }
                }}
                className={`p-4 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                  isSelected ? "bg-[#FAFBFB]" : "hover:bg-[#F8F9FA]"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Radio selection on left matching 7.png */}
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-[#FF571A] bg-[#FF571A]"
                        : "border-[#D0D5DD] bg-white"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <div className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[#202125] leading-tight truncate">
                      {voice.label}
                    </span>
                    <span className="block text-[13px] text-[#667085] mt-0.5">
                      {formatLanguage(voice.language)}
                    </span>
                    <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">
                      {voice.description}
                    </p>
                  </div>
                </div>

                {/* Preview Button on right matching 7.png */}
                <button
                  type="button"
                  onClick={(e) => void handlePreview(voice, e)}
                  title="Preview voice"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] hover:bg-[#F8F9FA] transition-colors shrink-0 shadow-xs"
                >
                  {isPlayingThis ? (
                    isLoadingPreview ? (
                      <span>Loading...</span>
                    ) : (
                      <>
                        <Square className="w-3 h-3 fill-current text-[#FF571A]" />
                        <span>Stop</span>
                      </>
                    )
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current text-[#202125]" />
                      <span>Preview</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Notice below voice list matching 7.png */}
      <div className="flex items-center gap-2 text-[13px] text-[#667085] pt-1">
        <FileText className="w-4 h-4 text-[#667085]" aria-hidden="true" />
        <span>Save and publish to apply your voice selection.</span>
      </div>
    </div>
  );
}
