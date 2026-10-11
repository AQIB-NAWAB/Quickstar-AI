"use client";

import type { HandoffActionConfig } from "../../lib/types";

interface HandoffActionFormProps {
  config: HandoffActionConfig;
  onChange: (updated: HandoffActionConfig) => void;
}

export function HandoffActionForm({ config, onChange }: HandoffActionFormProps) {
  return (
    <div className="space-y-4 text-xs">

      {/* Destination Type */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Destination type
        </label>
        <select
          value={config.destinationType}
          onChange={(e) =>
            onChange({
              ...config,
              destinationType: e.target.value as HandoffActionConfig["destinationType"],
            })
          }
          className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        >
          <option value="human">Human operator</option>
          <option value="agent">Specialist AI agent</option>
          <option value="queue">Triage queue</option>
        </select>
      </div>

      {/* Destination Identifier */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Destination target
        </label>
        <input
          type="text"
          value={config.destination}
          onChange={(e) => onChange({ ...config, destination: e.target.value })}
          placeholder="e.g. Tier-2 billing specialist or agent ID"
          className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        />
        <p className="text-[11px] text-neutral-400">
          Transfer handling to the configured destination.
        </p>
      </div>

      {/* Optional Note */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Handoff summary note (optional)
        </label>
        <textarea
          rows={3}
          value={config.note || ""}
          onChange={(e) => onChange({ ...config, note: e.target.value })}
          placeholder="Automated escalation: matched keyword payment in customer request."
          className="w-full px-3 py-2 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        />
      </div>
    </div>
  );
}
