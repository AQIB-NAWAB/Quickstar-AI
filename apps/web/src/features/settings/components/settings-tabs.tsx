"use client";

import type { SettingsTab } from "../lib/types";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members & Roles" },
  { id: "api-keys", label: "API Keys" },
  { id: "secrets", label: "Secrets Vault" },
  { id: "publishable-keys", label: "Publishable Keys" },
  { id: "danger", label: "Danger Zone" },
];

export function SettingsTabs({ activeTab, onSelectTab }: SettingsTabsProps) {
  return (
    <div className="border-b border-border-faint overflow-x-auto no-scrollbar">
      <nav className="flex space-x-6 min-w-max" aria-label="Settings sections">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`pb-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-heat-100 text-heat-100"
                  : "border-transparent text-neutral-500 hover:text-accent-black"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
