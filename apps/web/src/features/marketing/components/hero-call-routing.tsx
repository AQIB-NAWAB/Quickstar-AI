"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import "../styles/hero-call-routing.css";
import { HeroRoutingArt } from "./hero-routing-art";

export type ScenarioType = "calls" | "lead-generation" | "campaigns";
const scenarios: { id: ScenarioType; label: string }[] = [
  { id: "calls", label: "Calls" },
  { id: "lead-generation", label: "Lead generation" },
  { id: "campaigns", label: "Campaigns" },
];

export function HeroCallRouting({ activeScenario, onScenarioChange }: {
  activeScenario?: ScenarioType;
  onScenarioChange?: (scenario: ScenarioType) => void;
}) {
  const [localScenario, setLocalScenario] = useState<ScenarioType>("calls");
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const scenario = activeScenario ?? localScenario;
  const paused = userPaused || !visible || !documentVisible;
  const select = useCallback((next: ScenarioType) => {
    setLocalScenario(next);
    onScenarioChange?.(next);
  }, [onScenarioChange]);

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => setVisible(entries[entries.length - 1].isIntersecting));
    observer.observe(element);
    const visibility = () => setDocumentVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const externalSelect = (event: Event) => {
      const next = (event as CustomEvent<ScenarioType>).detail;
      if (scenarios.some(({ id }) => id === next)) select(next);
    };
    window.addEventListener("quickstart-select-scenario", externalSelect);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("quickstart-select-scenario", externalSelect);
    };
  }, [select]);

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % scenarios.length;
    else if (event.key === "ArrowLeft") next = (index + scenarios.length - 1) % scenarios.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = scenarios.length - 1;
    else return;
    event.preventDefault();
    select(scenarios[next].id);
    wrapper.current?.querySelector<HTMLButtonElement>(`#tab-${scenarios[next].id}`)?.focus();
  }

  return (
    <div ref={wrapper} className="hero-call-routing-wrapper" id="hero-illustration" data-scenario={scenario} data-paused={paused}>
      <div className="hero-call-routing-atmosphere" aria-hidden="true" />
      <div id="playground" className="hero-call-routing-stage" role="tabpanel" aria-labelledby={`tab-${scenario}`}>
        <HeroRoutingArt uid={uid} scenario={scenario} hovered={hovered} onHover={setHovered} />
      </div>
      <div className="scenario-controls-container">
        <div role="tablist" aria-label="Illustration scenarios" className="routing-tabs">
          {scenarios.map(({ id, label }, index) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={scenario === id} aria-controls="playground" tabIndex={scenario === id ? 0 : -1} className="scenario-tab-button" onClick={() => select(id)} onKeyDown={event => tabKey(event, index)}>{label}</button>)}
        </div>
        <button type="button" className="scenario-pause-button" onClick={() => setUserPaused(value => !value)} aria-label={userPaused ? "Resume illustration" : "Pause illustration"} aria-pressed={userPaused}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">{userPaused ? <path d="M4 2.5 11 7 4 11.5Z" /> : <><rect x="3" y="2" width="2.5" height="10" rx=".8" /><rect x="8.5" y="2" width="2.5" height="10" rx=".8" /></>}</svg>
        </button>
      </div>
    </div>
  );
}
