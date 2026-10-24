"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { KNOWLEDGE_EXAMPLE } from "./content";

interface GroundedAnswerProps {
  expanded: boolean;
  onToggle: () => void;
  onEmphasis: (value: boolean) => void;
}

export function GroundedAnswer({ expanded, onToggle, onEmphasis }: GroundedAnswerProps) {
  const [compact, setCompact] = useState(false);
  const citationRef = useRef<HTMLButtonElement>(null);
  const closeExcerpt = () => { onToggle(); citationRef.current?.focus(); };
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1099px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return (
    <>
      <p className="marketing-knowledge-question">{KNOWLEDGE_EXAMPLE.question}</p>
      <div className="marketing-knowledge-agent">
        <span className="marketing-knowledge-avatar" aria-hidden="true"><BrandLogo size={26} fillColor="#ffffff" /></span>
        <span>QuickStart agent</span>
      </div>
      <p className="marketing-knowledge-answer">
        <span>Yes. You can reschedule</span>
        <span>up to <mark>24 hours before</mark></span>
        <span>your appointment.</span>
      </p>
      <button ref={citationRef} type="button" className="marketing-knowledge-citation" aria-expanded={compact ? expanded : undefined}
        aria-pressed={compact ? undefined : expanded}
        aria-controls={compact ? "knowledge-citation-excerpt" : "knowledge-source-booking"} onClick={onToggle}
        onMouseEnter={() => onEmphasis(true)} onMouseLeave={() => onEmphasis(false)}
        onFocus={() => onEmphasis(true)} onBlur={() => onEmphasis(false)}>
        <FileText size={19} aria-hidden="true" /><span>Booking policy · page 2</span>
      </button>
      <div id="knowledge-citation-excerpt" className="marketing-knowledge-citation-excerpt" hidden={!expanded || !compact}
        onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeExcerpt(); } }}>
        <p><strong>Booking policy · page 2</strong></p>
        <p>{KNOWLEDGE_EXAMPLE.booking.before}<mark>{KNOWLEDGE_EXAMPLE.booking.highlight}</mark>.</p>
        <button type="button" onClick={closeExcerpt}>Close source excerpt</button>
      </div>
    </>
  );
}
