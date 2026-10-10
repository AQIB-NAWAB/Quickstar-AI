"use client";

import { useState, type KeyboardEvent } from "react";
import { PlatformControlDemo, type PlatformViewTab } from "./platform-control-demo";
import { TeamControlIllustration } from "./team-control-illustration";

const TABS: { id: PlatformViewTab; label: string; explanation: string }[] = [
  {
    id: "versions",
    label: "Versions",
    explanation: "Edit your draft while conversations use the published version.",
  },
  {
    id: "workspaces",
    label: "Workspaces",
    explanation: "Organize information and conversations in separate workspaces.",
  },
  {
    id: "permissions",
    label: "Permissions",
    explanation: "Manage team roles and store tool credentials securely.",
  },
];

export function FeatureGrid() {
  const [active, setActive] = useState<PlatformViewTab>("versions");
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offset = ["ArrowDown", "ArrowRight"].includes(event.key)
      ? 1
      : ["ArrowUp", "ArrowLeft"].includes(event.key)
        ? -1
        : 0;
    if (!offset && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : (index + offset + TABS.length) % TABS.length;
    setActive(TABS[next].id);
    document.getElementById(`platform-tab-${TABS[next].id}`)?.focus();
  }
  return (
    <section
      id="platform"
      className="platform-control-section landing-section"
      aria-label="Platform capabilities and team controls"
    >
      <div className="platform-control-layout landing-container">
        <div className="platform-control-intro landing-intro">
          <span className="landing-eyebrow">BUILT FOR YOUR TEAM</span>
          <h2 className="platform-control-title landing-title">
            <span>Keep control.</span>
            <span>Keep</span>
            <span>improving.</span>
          </h2>
          <p className="platform-control-description landing-description landing-description-spaced">
            Make changes on your terms, with separate workspaces and clear team access.
          </p>
          <div className="platform-control-tabs" role="tablist" aria-label="Platform capabilities">
            {TABS.map((tab, index) => (
              <div className="platform-control-tab-row" key={tab.id}>
                <button
                  type="button"
                  role="tab"
                  id={`platform-tab-${tab.id}`}
                  aria-selected={active === tab.id}
                  aria-controls="platform-control-panel"
                  tabIndex={active === tab.id ? 0 : -1}
                  onClick={() => setActive(tab.id)}
                  onKeyDown={(event) => navigate(event, index)}
                >
                  <span>0{index + 1}</span>
                  <span className="platform-control-tab-label">{tab.label}</span>
                </button>
                {active === tab.id && <p>{tab.explanation}</p>}
              </div>
            ))}
          </div>
          <p className="platform-control-mobile-description">
            {TABS.find((tab) => tab.id === active)?.explanation}
          </p>
          <TeamControlIllustration key={active} active={active} />
        </div>
        <div id="platform-control-panel" role="tabpanel" aria-labelledby={`platform-tab-${active}`}>
          <PlatformControlDemo activeTab={active} />
        </div>
      </div>
    </section>
  );
}
