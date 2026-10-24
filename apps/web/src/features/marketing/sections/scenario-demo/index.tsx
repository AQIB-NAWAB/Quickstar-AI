"use client";

import { useState, type KeyboardEvent } from "react";
import { CalendarDays, MessageSquare, Users } from "lucide-react";
import { DEMO_SCENARIOS, type SourceSnippet } from "../../content/demo-scenarios";
import { ConversationPane } from "./conversation-pane";
import { SourcePane } from "./source-pane";
import "../../styles/demo.css";

const icons = [MessageSquare, CalendarDays, Users];
export function ScenarioDemoSection() {
  const [selected, setSelected] = useState(0);
  const [source, setSource] = useState<SourceSnippet | null>(null);
  const scenario = DEMO_SCENARIOS[selected];
  const select = (index: number) => { setSelected(index); setSource(null); };
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const directions: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next = index;
    if (event.key in directions) next = (index + directions[event.key] + 3) % 3;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 2;
    else return;
    event.preventDefault(); select(next);
    document.getElementById(`demo-tab-${DEMO_SCENARIOS[next].id}`)?.focus();
  };
  return (
    <section id="demo" aria-labelledby="demo-heading" className="demo-section">
      <div className="demo-container">
        <div className="demo-header-block">
          <p className="demo-eyebrow-label">LIVE DEMO</p>
          <h2 id="demo-heading" className="demo-heading">Try one before you <em>build one.</em></h2>
          <p className="demo-description">Choose a scenario. See the conversation and what powers the answer.</p>
        </div>
        <div className="demo-panel">
          <div className="demo-tablist" role="tablist" aria-label="Demo scenarios" aria-orientation="vertical">
            {DEMO_SCENARIOS.map((item, index) => {
              const Icon = icons[index];
              return <button key={item.id} id={`demo-tab-${item.id}`} type="button" role="tab" aria-selected={selected === index} aria-controls={`demo-panel-${scenario.id}`} tabIndex={selected === index ? 0 : -1} className="demo-tab" onClick={() => select(index)} onKeyDown={event => onKeyDown(event, index)}><Icon size={20} aria-hidden="true" /><span>{item.title}</span></button>;
            })}
          </div>
          <div id={`demo-panel-${scenario.id}`} role="tabpanel" aria-labelledby={`demo-tab-${scenario.id}`} className="demo-body">
            <ConversationPane key={scenario.id} messages={scenario.messages} revealedCount={scenario.messages.length} onSourceSelect={setSource} />
            <SourcePane scenario={scenario} selectedSource={source} />
          </div>
        </div>
      </div>
    </section>
  );
}
