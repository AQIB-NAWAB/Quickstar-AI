"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Cpu,
  FileText,
  HelpCircle,
} from "lucide-react";

type Props = {
  model: string;
  temperature: number;
  maxTokens: number;
  isDirty: boolean;
  onChangeModel: (model: string) => void;
  onChangeTemperature: (temp: number) => void;
  onChangeMaxTokens: (tokens: number) => void;
};

type ModelOption = {
  id: string;
  name: string;
  provider: string;
  desc: string;
};

const DEFAULT_MODELS: ModelOption[] = [
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI", desc: "Fast, cost-efficient, everyday queries" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", desc: "Advanced reasoning and complex tool calls" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", desc: "Superior nuanced writing & instruction following" },
  { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", desc: "Sub-second fast streaming response" },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", provider: "Groq", desc: "High-throughput open model" },
  { id: "meta/llama-3.2-11b-vision-instruct", name: "Llama 3.2 11B", provider: "Blueminds", desc: "Fast multimodal open model" },
];

export function ModelTab({
  model,
  temperature,
  maxTokens,
  isDirty,
  onChangeModel,
  onChangeTemperature,
  onChangeMaxTokens,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure current model is present in options
  const models = [...DEFAULT_MODELS];
  if (!models.some((m) => m.id === model)) {
    models.unshift({
      id: model,
      name: model,
      provider: "Custom",
      desc: "Currently configured model",
    });
  }

  const selectedModel = models.find((m) => m.id === model) || models[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-semibold text-[#202125]">Model &amp; parameters</h2>
        <p className="mt-1 text-[14px] text-[#667085]">
          Choose how your agent generates responses.
        </p>
      </div>

      {/* Language Model Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[14px] font-medium text-[#202125]">
          <span>Language model</span>
          <span title="Used for your agent's responses.">
            <HelpCircle className="w-3.5 h-3.5 text-[#667085] cursor-help" />
          </span>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className="w-full flex items-center justify-between p-3.5 bg-white border border-[#E1E5EA] rounded-lg shadow-sm hover:border-[#CCD2D8] transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-[#202125] text-white flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[15px] font-semibold text-[#202125] truncate leading-tight">
                  {selectedModel.name}
                </span>
                <span className="block text-[13px] text-[#667085] leading-tight mt-0.5">
                  {selectedModel.provider}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#667085] shrink-0 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto bg-white border border-[#E1E5EA] rounded-lg shadow-xl py-1"
            >
              {models.map((m) => {
                const isSelected = m.id === model;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChangeModel(m.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                      isSelected
                        ? "bg-[#FFF3ED] text-[#F15A24] font-medium"
                        : "hover:bg-[#F8F9FA] text-[#202125]"
                    }`}
                  >
                    <div>
                      <div className="text-[14px] font-medium leading-tight">{m.name}</div>
                      <div className="text-[12px] text-[#667085] mt-0.5 leading-tight">{m.desc}</div>
                    </div>
                    <span className="text-[12px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#344054]">
                      {m.provider}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <p className="text-[13px] text-[#667085]">Used for your agent&apos;s responses.</p>
      </div>

      {/* Response Settings Section */}
      <div className="pt-6 border-t border-[#EDF0F2] space-y-5">
        <h3 className="text-[22px] font-semibold text-[#202125]">Response settings</h3>

        {/* Temperature */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label htmlFor="temperature-number-input" className="text-[14px] font-medium text-[#202125]">
                Temperature
              </label>
              <span title="Lower values give more consistent responses. Higher values produce more varied text.">
                <HelpCircle className="w-3.5 h-3.5 text-[#667085] cursor-help" />
              </span>
            </div>

            <input
              id="temperature-number-input"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0 && v <= 1) {
                  onChangeTemperature(v);
                }
              }}
              className="w-[112px] h-11 px-3 py-1 text-[14px] text-center font-mono text-[#202125] bg-white border border-[#E1E5EA] rounded-md focus:outline-none focus:border-[#F15A24]"
            />
          </div>

          <p className="text-[13px] text-[#667085]">Lower values give more consistent responses.</p>

          {/* Range Slider */}
          <div className="space-y-1.5">
            <input
              aria-label="Temperature"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => onChangeTemperature(parseFloat(e.target.value))}
              className="w-full accent-[#F15A24] cursor-pointer"
            />

            <div className="flex items-center justify-between text-[12px] text-[#7A808A]">
              <div>
                <span className="font-medium text-[#344054]">0</span>
                <span className="block text-[11px]">More consistent</span>
              </div>
              <span className="font-medium text-[#344054]">0.5</span>
              <div className="text-right">
                <span className="font-medium text-[#344054]">1</span>
                <span className="block text-[11px]">More varied</span>
              </div>
            </div>
          </div>
        </div>

        {/* Maximum response tokens */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="max-tokens-input" className="block text-[14px] font-medium text-[#202125]">
                Maximum response tokens
              </label>
              <p className="text-[13px] text-[#667085] mt-0.5">The upper limit for a single reply.</p>
            </div>

            <input
              id="max-tokens-input"
              type="number"
              min="128"
              max="4096"
              step="128"
              value={maxTokens}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 128 && v <= 4096) {
                  onChangeMaxTokens(v);
                }
              }}
              className="w-[180px] h-11 px-3 py-1.5 text-[14px] text-center font-mono text-[#202125] bg-white border border-[#E1E5EA] rounded-md focus:outline-none focus:border-[#F15A24]"
            />
          </div>
          <p className="text-[12px] text-[#7A808A]">A limit, not a target length.</p>
        </div>
      </div>

      {/* Bottom Helper */}
      <div className="pt-2 flex items-center gap-2 text-[13px] text-[#667085]">
        <FileText className="w-3.5 h-3.5 text-[#667085]" aria-hidden="true" />
        <span>
          {isDirty
            ? "Unsaved changes. Save your draft before publishing."
            : "Saved to draft. Publish to apply these settings to your live agent."}
        </span>
      </div>
    </div>
  );
}
