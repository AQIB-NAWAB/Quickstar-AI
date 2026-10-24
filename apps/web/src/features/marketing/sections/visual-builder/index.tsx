"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Calendar, Check, CheckCircle2, ChevronDown, FileText, HelpCircle, Link2, MessageCircle, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import "../../styles/visual-builder.css";

const steps = [
  { id: "welcome", title: "Welcome", subtitle: "How can I help?", icon: MessageCircle, x: 24, y: 70, description: "Start with a friendly welcome and find out what your customer needs.", detail: "How can I help you today?" },
  { id: "details", title: "Collect details", subtitle: "Service · Date", icon: FileText, x: 244, y: 70, description: "Ask for the details your agent needs before taking the next step.", detail: "Selected service and preferred date" },
  { id: "check", title: "Check availability", subtitle: "Look up open times", icon: Calendar, x: 464, y: 70, description: "Find an open time in your calendar.", detail: "Checks open times before confirming." },
  { id: "decision", title: "Time available?", subtitle: "Choose the next step", icon: Calendar, x: 494, y: 224, description: "Choose the next step based on the calendar result.", detail: "If a time is available, confirm the booking. Otherwise, bring in your team." },
  { id: "confirm", title: "Confirm booking", subtitle: "Save and send details", icon: CheckCircle2, x: 686, y: 174, description: "Confirm the time and share the booking details with your customer.", detail: "Send the service, date, and time." },
  { id: "team", title: "Ask your team", subtitle: "Notify your team to help", icon: Users, x: 686, y: 306, description: "Bring in your team when your customer needs more help.", detail: "Include the conversation and all collected details." },
];
const knowledgeSteps = steps.map((step) => step.id === "check" ? { ...step, title: "Search knowledge", subtitle: "Find a sourced answer", icon: BookOpen, description: "Find the answer in your business documents.", detail: "Keep the source with the answer." } : step.id === "decision" ? { ...step, title: "Answer found?", description: "Check whether your knowledge contains an answer.", detail: "Share a sourced answer, or bring in your team." } : step.id === "confirm" ? { ...step, title: "Share answer", subtitle: "Reply with the source", description: "Give your customer a helpful answer from your business knowledge.", detail: "Include the supporting source." } : step);
const edges = ["M204 104 H244", "M424 104 H464", "M554 138 V224", "M614 270 H642 Q652 270 652 260 V218 Q652 208 662 208 H686", "M614 270 H642 Q652 270 652 280 V330 Q652 340 662 340 H686"];
// One continuous route passes beneath the cards; only the connector portions are visible.
const route = "M114 104 H554 V270 H642 Q652 270 652 260 V218 Q652 208 662 208 H776";
const palette = [{ title: "Message", icon: MessageCircle, step: "welcome" }, { title: "Question", icon: HelpCircle, step: "details" }, { title: "Knowledge", icon: BookOpen, step: "check" }, { title: "Tool", icon: Link2, step: "check" }, { title: "Team handoff", icon: Users, step: "team" }];

const templates = [{ value: "appointment", label: "Book appointments", icon: Calendar }, { value: "knowledge", label: "Answer questions", icon: BookOpen }];

function TemplatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const id = `builder-templates-${useId().replace(/:/g, "")}`;
  const selectedIndex = templates.findIndex((item) => item.value === value);
  const close = (restore = false) => { setOpen(false); if (restore) trigger.current?.focus(); };
  useEffect(() => {
    if (open) options.current[focused]?.focus();
  }, [open, focused]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return <div ref={root} className="vb-template" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
    <button ref={trigger} type="button" className="vb-template-trigger" aria-label={`Example flow template: ${templates[selectedIndex].label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => { setFocused(selectedIndex); setOpen(!open); }} onKeyDown={(event) => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setFocused(selectedIndex); setOpen(true); }
    }}><span>{templates[selectedIndex].label}</span><ChevronDown size={15} aria-hidden="true" /></button>
    <div id={id} role="listbox" aria-label="Example flow templates" className={`vb-template-menu ${open ? "vb-template-menu-open" : ""}`} aria-hidden={!open} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); close(true); }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault(); setFocused(event.key === "Home" ? 0 : event.key === "End" ? templates.length - 1 : (focused + (event.key === "ArrowDown" ? 1 : -1) + templates.length) % templates.length);
      }
    }}>
      {templates.map(({ value: nextValue, label, icon: Icon }, index) => <button key={nextValue} ref={(element) => { options.current[index] = element; }} type="button" role="option" aria-selected={value === nextValue} tabIndex={open && focused === index ? 0 : -1} onClick={() => { onChange(nextValue); close(true); }}><Icon size={18} aria-hidden="true" /><span>{label}</span>{value === nextValue && <Check size={16} className="vb-template-check" aria-hidden="true" />}</button>)}
    </div>
  </div>;
}

export function VisualBuilderSection() {
  const section = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const bead = useRef<SVGCircleElement>(null);
  const progress = useRef(0);
  const markerId = `builder-arrow-${useId().replace(/:/g, "")}`;
  const [template, setTemplate] = useState("appointment");
  const [selected, setSelected] = useState("check");
  const [active, setActive] = useState("welcome");
  const [running, setRunning] = useState(false);
  const nodes = template === "appointment" ? steps : knowledgeSteps;
  const inspected = nodes.find((step) => step.id === selected)!;
  const InspectorIcon = inspected.icon;

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setRunning(visible && !document.hidden && !query.matches);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .2 });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    query.addEventListener("change", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); query.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    const wire = path.current;
    const dot = bead.current;
    if (!wire || !dot || !running) return;
    let frame = 0;
    let previous = 0;
    const length = wire.getTotalLength();
    const draw = (time: number) => {
      if (previous) progress.current = (progress.current + Math.min(time - previous, 64) / 12000) % 1;
      previous = time;
      const point = wire.getPointAtLength(progress.current * length);
      dot.setAttribute("cx", String(point.x));
      dot.setAttribute("cy", String(point.y));
      const next = point.y > 180 ? point.x > 686 ? "confirm" : "decision" : point.x < 224 ? "welcome" : point.x < 444 ? "details" : "check";
      setActive((current) => current === next ? current : next);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return <section ref={section} id="builder" aria-labelledby="builder-heading" className="marketing-builder-section">
    <div className="marketing-builder-container">
      <header className="marketing-builder-header">
        <p className="marketing-builder-eyebrow">VISUAL BUILDER</p>
        <h2 id="builder-heading">Give your agent a plan.<br /><em>Let it handle the steps.</em></h2>
        <p className="marketing-builder-description">Build the conversation, connect your tools, and decide when your team steps in.</p>
      </header>
      <div className="marketing-builder-frame">
        <div className="vb-toolbar">
          <span className="vb-brand"><BrandLogo size={25} fillColor="#fff" /></span>
          <span className="vb-name">{template === "appointment" ? "Appointment assistant" : "Knowledge assistant"}</span>
          <TemplatePicker value={template} onChange={(value) => { setTemplate(value); setSelected("check"); progress.current = 0; }} />
        </div>
        <div className="vb-body">
          <div className="vb-canvas-scroll" role="region" aria-label="Example workflow. Scroll horizontally to explore on smaller screens." tabIndex={0}>
            <div className="vb-canvas">
              <svg viewBox="0 0 900 410" preserveAspectRatio="none" className="vb-wires" aria-hidden="true">
                <defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="context-stroke" strokeWidth="1.5" /></marker></defs>
                {edges.map((edge, index) => <path key={edge} d={edge} className={`vb-edge ${index < 2 && ["check", "decision", "confirm"].includes(active) ? "vb-edge-complete" : ""}`} markerEnd={`url(#${markerId})`} />)}
                <path ref={path} d={route} fill="none" stroke="none" />
                <text x="652" y="194" className="vb-branch-label">Yes</text><text x="622" y="367" className="vb-branch-label">Needs help</text>
                <circle ref={bead} cx="114" cy="104" r="5" className="vb-bead" visibility={running ? "visible" : "hidden"} />
              </svg>
              {nodes.map((step) => { const Icon = step.icon; return <button key={step.id} type="button" className={`vb-node ${step.id === "decision" ? "vb-decision" : ""} ${selected === step.id ? "vb-selected" : ""} ${active === step.id && running ? "vb-active" : ""}`} style={{ left: `${step.x / 9}%`, top: step.y }} aria-pressed={selected === step.id} onClick={() => setSelected(step.id)}>
                <Icon size={25} strokeWidth={1.7} aria-hidden="true" /><span><strong>{step.title}</strong><small>{step.id === "welcome" ? <q>{step.subtitle}</q> : step.subtitle}</small></span>
                <i className="vb-port vb-port-in" /><i className="vb-port vb-port-out" />
              </button>; })}
              <p className="vb-canvas-hint">Select a step to explore it.</p>
            </div>
          </div>
          <aside className="vb-inspector" aria-label={`${inspected.title} step details`}>
            <div className="vb-inspector-heading"><p>SELECTED STEP</p><h3><InspectorIcon size={26} aria-hidden="true" />{inspected.title}</h3><span>{inspected.description}</span></div>
            <div className="vb-inspector-content">
              {selected === "check" ? <><h4>{template === "appointment" ? "Connected tool" : "Knowledge source"}</h4><div className="vb-tool"><InspectorIcon size={21} aria-hidden="true" />{template === "appointment" ? "Google Calendar" : "Your business documents"}</div><h4>Step inputs</h4><dl className="vb-inputs">{(template === "appointment" ? [["Preferred date", "Customer’s choice"], ["Service", "Selected service"]] : [["Question", "Customer’s message"], ["Sources", "Connected documents"]]).map(([key, value]) => <div key={key}><dt><FileText size={16} aria-hidden="true" />{key}</dt><dd>{value}</dd></div>)}</dl></> : <h4>What this step does</h4>}
              <p className="vb-summary"><InspectorIcon size={23} aria-hidden="true" /><span>{inspected.detail}</span></p>
            </div>
          </aside>
        </div>
        <div className="vb-palette"><span>Explore steps</span>{palette.map(({ title, icon: Icon, step }) => <button type="button" key={title} onClick={() => setSelected(step)} className={selected === step && title === "Tool" ? "vb-palette-selected" : ""}><Icon size={22} aria-hidden="true" />{title}</button>)}</div>
      </div>
    </div>
  </section>;
}
