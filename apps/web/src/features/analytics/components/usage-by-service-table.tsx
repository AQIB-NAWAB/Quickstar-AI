"use client";

import { Bot, Cpu, Info, Mic } from "lucide-react";
import { formatCompactNumber, formatExactNumber } from "../lib/format";
import type { ServiceUsageItem } from "../lib/types";

interface UsageByServiceTableProps {
  items: ServiceUsageItem[];
  isLoading?: boolean;
}

export function UsageByServiceTable({ items, isLoading }: UsageByServiceTableProps) {
  function renderServiceIcon(service: string, provider: string, kind: string) {
    if (kind === "voice" || service.includes("voice") || service.includes("speech")) {
      return (
        <div className="w-8 h-8 rounded-8 bg-neutral-100 flex items-center justify-center text-neutral-700">
          <Mic className="w-4 h-4" />
        </div>
      );
    }
    if (service.includes("gemini") || provider.toLowerCase().includes("google")) {
      return (
        <div className="w-8 h-8 rounded-8 bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
          <span className="text-sm">G</span>
        </div>
      );
    }
    if (service.includes("gpt") || provider.toLowerCase().includes("openai")) {
      return (
        <div className="w-8 h-8 rounded-8 bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-8 bg-neutral-100 text-neutral-600 flex items-center justify-center">
        <Cpu className="w-4 h-4" />
      </div>
    );
  }

  function formatUnits(units: number, unitLabel: string): string {
    if (unitLabel === "characters") {
      return `${formatExactNumber(units)} characters`;
    }
    if (unitLabel === "minutes") {
      return `${formatExactNumber(units)} minutes`;
    }
    if (units >= 1_000_000) {
      const m = units / 1_000_000;
      return `${Number.isInteger(m) ? m : m.toFixed(1)}M ${unitLabel}`;
    }
    return `${formatCompactNumber(units)} ${unitLabel}`;
  }

  return (
    <div className="bg-white border border-[#EAECF0] rounded-12 p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#18181B]">Usage by service</h2>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-[#EAECF0] text-xs font-medium text-[#71717A]">
              <th className="py-2.5 pr-4 font-normal">Service</th>
              <th className="py-2.5 px-4 font-normal">Units</th>
              <th className="py-2.5 px-4 font-normal">Input tokens</th>
              <th className="py-2.5 px-4 font-normal">Output tokens</th>
              <th className="py-2.5 pl-4 text-right font-normal">Estimated cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAECF0] text-xs text-[#18181B]">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-400">
                  Loading usage details...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-400">
                  No usage recorded for this period.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={`${item.service}-${idx}`} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      {renderServiceIcon(item.service, item.provider, item.kind)}
                      <span className="font-mono text-xs font-medium text-[#18181B]">
                        {item.service}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-sans text-neutral-600">
                    {formatUnits(item.units, item.unitLabel)}
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-600">
                    {item.inputTokens !== null ? formatCompactNumber(item.inputTokens) : "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-600">
                    {item.outputTokens !== null ? formatCompactNumber(item.outputTokens) : "—"}
                  </td>
                  <td className="py-3 pl-4 text-right font-mono font-medium text-[#18181B]">
                    {item.isUnpriced ? (
                      <span className="text-neutral-400 italic">Unpriced</span>
                    ) : (
                      `$${item.estimatedCostUsd.toFixed(2)}`
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 pt-2 text-xs text-[#71717A]">
        <Info className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
        <span>Estimates may differ from provider invoices.</span>
      </div>
    </div>
  );
}
