"use client";

import type { SettingsTab } from "../lib/types";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}

const ACCOUNT: { id: SettingsTab; label: string }[] = [{ id: "account", label: "Profile" }];

const WORKSPACE: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "api-keys", label: "API keys" },
  { id: "secrets", label: "Secrets" },
  { id: "publishable-keys", label: "Publishable keys" },
  { id: "custom-tools", label: "Custom tools" },
  { id: "danger", label: "Danger" },
];

export function SettingsTabs({ activeTab, onSelectTab }: SettingsTabsProps) {
  return (
    <nav aria-label="Settings sections" className="w-full md:w-52 shrink-0 space-y-5">
      <Section label="Account" items={ACCOUNT} activeTab={activeTab} onSelectTab={onSelectTab} />
      <Section
        label="Workspace"
        items={WORKSPACE}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />
    </nav>
  );
}

function Section({
  label,
  items,
  activeTab,
  onSelectTab,
}: {
  label: string;
  items: { id: SettingsTab; label: string }[];
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}) {
  return (
    <div>
      <h2 className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </h2>
      <div className="space-y-0.5">
        {items.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex w-full rounded-10 px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                isActive
                  ? "bg-heat-8 text-heat-100"
                  : "text-neutral-700 hover:bg-neutral-50 hover:text-accent-black"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
