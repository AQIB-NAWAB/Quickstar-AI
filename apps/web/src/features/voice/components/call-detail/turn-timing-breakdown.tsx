"use client";

import React,{ useState } from "react";
import type { ProcessingTurn } from "../../lib/types";

interface TurnTimingBreakdownProps {
  turns: ProcessingTurn[];
  selectedTurnId?: string;
  onSelectTurn?: (turnId: string) => void;
}

export function TurnTimingBreakdown({
  turns,
  selectedTurnId,
  onSelectTurn,
}: TurnTimingBreakdownProps) {
  const [internalTurnId, setInternalTurnId] = useState<string>(
    selectedTurnId || (turns.length > 1 ? turns[1].id : turns[0]?.id || "")
  );

  const activeTurnId = selectedTurnId || internalTurnId;
  const currentTurn = turns.find((t) => t.id === activeTurnId) || turns[0];

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setInternalTurnId(val);
    onSelectTurn?.(val);
  }

  if (!currentTurn) {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs text-xs text-neutral-400">
        No timing metrics captured for this call.
      </div>
    );
  }

  // Calculate percentages for stacked bar
  const total = currentTurn.sttMs + currentTurn.llmMs + currentTurn.ttsMs;
  const sttPct = total > 0 ? (currentTurn.sttMs / total) * 100 : 33;
  const llmPct = total > 0 ? (currentTurn.llmMs / total) * 100 : 34;
  const ttsPct = total > 0 ? (currentTurn.ttsMs / total) * 100 : 33;

  function formatMsOrSec(ms: number) {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)} s`;
    }
    return `${ms} ms`;
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-4">
      {/* Header and Turn Selector */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-accent-black">
            Turn timing breakdown
          </h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            STT, LLM, and TTS processing durations.
          </p>
        </div>

        <select
          value={activeTurnId}
          onChange={handleSelectChange}
          aria-label="Select turn"
          className="text-xs bg-neutral-50 border border-neutral-200 rounded-6 px-2.5 py-1 text-accent-black font-semibold focus:outline-none focus:ring-1 focus:ring-heat-100"
        >
          {turns.map((t) => (
            <option key={t.id} value={t.id}>
              Turn {t.turnNumber}
            </option>
          ))}
        </select>
      </div>

      {/* Stage Pills */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-heat-100 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              STT
            </span>
            <span className="font-bold text-accent-black font-mono">
              {currentTurn.sttMs} ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              LLM
            </span>
            <span className="font-bold text-accent-black font-mono">
              {currentTurn.llmMs} ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              TTS
            </span>
            <span className="font-bold text-accent-black font-mono">
              {currentTurn.ttsMs} ms
            </span>
          </div>
        </div>
      </div>

      {/* Stacked Bar with Sequential Total Label */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] text-neutral-500 font-medium">
          Sequential sample total:{" "}
          <span className="font-mono text-accent-black font-bold">
            {formatMsOrSec(currentTurn.totalMs)}
          </span>
        </div>

        <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-100">
          <div
            className="bg-heat-100 h-full transition-all duration-300"
            style={{ width: `${sttPct}%` }}
            title={`STT: ${currentTurn.sttMs} ms`}
          />
          <div
            className="bg-neutral-600 h-full transition-all duration-300"
            style={{ width: `${llmPct}%` }}
            title={`LLM: ${currentTurn.llmMs} ms`}
          />
          <div
            className="bg-neutral-300 h-full transition-all duration-300"
            style={{ width: `${ttsPct}%` }}
            title={`TTS: ${currentTurn.ttsMs} ms`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-0.5">
          <span>STT ({currentTurn.sttMs} ms)</span>
          <span>LLM ({currentTurn.llmMs} ms)</span>
          <span>TTS ({currentTurn.ttsMs} ms)</span>
        </div>
      </div>

      {/* Turns Table */}
      <div className="border border-border-faint rounded-8 overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/70 border-b border-border-faint text-[10px] font-semibold text-neutral-400 ">
              <th className="py-2 px-3">Turn</th>
              <th className="py-2 px-2">STT</th>
              <th className="py-2 px-2">LLM</th>
              <th className="py-2 px-2">TTS</th>
              <th className="py-2 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-faint font-mono text-[11px]">
            {turns.map((t) => {
              const isSelected = t.id === activeTurnId;
              return (
                <tr
                  key={t.id}
                  onClick={() => {
                    setInternalTurnId(t.id);
                    onSelectTurn?.(t.id);
                  }}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-orange-50/60 font-semibold text-accent-black"
                      : "hover:bg-neutral-50 text-neutral-600"
                  }`}
                >
                  <td className="py-2 px-3 font-medium">{t.turnNumber}</td>
                  <td className="py-2 px-2">{t.sttMs} ms</td>
                  <td className="py-2 px-2">{t.llmMs} ms</td>
                  <td className="py-2 px-2">{t.ttsMs} ms</td>
                  <td className="py-2 px-3 text-right text-accent-black font-semibold">
                    {formatMsOrSec(t.totalMs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Helper Note */}
      <p className="text-[11px] text-neutral-400 leading-relaxed">
        Processing durations are separate from spoken audio duration.
      </p>
    </div>
  );
}
