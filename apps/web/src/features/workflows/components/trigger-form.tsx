"use client";

import { EVENT_CATALOG,getEventCatalogItem } from "../lib/event-catalog";
import type { WorkflowTrigger } from "../lib/types";

interface TriggerFormProps {
  trigger: WorkflowTrigger;
  onChange: (updated: WorkflowTrigger) => void;
}

export function TriggerForm({ trigger, onChange }: TriggerFormProps) {
  const selectedItem = getEventCatalogItem(trigger.eventType);

  function handleSelectType(type: string) {
    const item = getEventCatalogItem(type);
    onChange({
      ...trigger,
      eventType: type,
      displayName: item?.label ?? type,
      description: item?.description ?? "",
    });
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Event trigger
        </label>
        <select
          value={trigger.eventType}
          onChange={(e) => handleSelectType(e.target.value)}
          className="w-full px-3 py-1.5 text-xs font-mono rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        >
          <optgroup label="Declared Platform Events">
            {EVENT_CATALOG.filter((e) => e.status === "declared").map((item) => (
              <option key={item.type} value={item.type}>
                {item.label} ({item.type})
              </option>
            ))}
          </optgroup>
          <optgroup label="Planned Future Events">
            {EVENT_CATALOG.filter((e) => e.status === "planned").map((item) => (
              <option key={item.type} value={item.type} disabled>
                {item.label} ({item.type}) — Planned
              </option>
            ))}
          </optgroup>
        </select>
        {selectedItem && (
          <p className="text-[11px] text-neutral-500 pt-0.5">
            {selectedItem.description}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Display label (optional)
        </label>
        <input
          type="text"
          value={trigger.displayName || ""}
          onChange={(e) => onChange({ ...trigger, displayName: e.target.value })}
          placeholder="e.g. Message appended"
          className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        />
      </div>

      {selectedItem && selectedItem.availableFields.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border-faint">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Available event payload fields
          </p>
          <div className="space-y-1 max-h-40 overflow-auto border border-border-faint rounded-8 p-2 bg-neutral-50/50">
            {selectedItem.availableFields.map((f) => (
              <div key={f.path} className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-semibold text-accent-black">{f.path}</span>
                <span className="text-[10px] text-neutral-400 font-sans">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
