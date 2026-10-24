"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { Plus, Pencil, X } from "lucide-react";
import { KNOWLEDGE_EXAMPLE } from "./content";

export function CustomerMemory({ onAddSource, addSourceRef }: { onAddSource: () => void; addSourceRef: RefObject<HTMLButtonElement> }) {
  const [fact, setFact] = useState<string>(KNOWLEDGE_EXAMPLE.memory);
  const [draft, setDraft] = useState(fact);
  const [mode, setMode] = useState<"view" | "edit" | "removed">("view");
  const [removing, setRemoving] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const previousMode = useRef(mode);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === previousMode.current) return;
    if (mode === "edit") { inputRef.current?.focus(); inputRef.current?.select(); }
    else if (mode === "removed") undoRef.current?.focus();
    else editRef.current?.focus();
    previousMode.current = mode;
  }, [mode]);
  useEffect(() => () => { if (removeTimer.current) clearTimeout(removeTimer.current); }, []);

  function forget() {
    setRemoving(true);
    removeTimer.current = setTimeout(() => {
      setMode("removed");
      setRemoving(false);
      setAnnouncement("Memory removed. You can undo this change.");
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150);
  }

  return (
    <div className="marketing-knowledge-memory">
      <Image src="/marketing/human-handoff/avatar-alex.png" alt="Alex, example customer" width={36} height={36} unoptimized className="marketing-knowledge-memory-portrait" />
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      {mode === "edit" ? (
        <form className="marketing-knowledge-memory-form" onSubmit={event => {
          event.preventDefault();
          const value = draft.trim();
          if (!value) return;
          setFact(value); setMode("view"); setAnnouncement("Customer memory updated.");
        }}>
          <label className="sr-only" htmlFor="knowledge-memory-fact">Customer memory</label>
          <input id="knowledge-memory-fact" ref={inputRef} value={draft} maxLength={80}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setMode("view"); } }} />
          <button type="submit" disabled={!draft.trim()}>Save</button>
          <button type="button" onClick={() => setMode("view")}>Cancel</button>
        </form>
      ) : mode === "removed" ? (
        <div className="marketing-knowledge-memory-row"><span>Memory removed</span>
          <button ref={undoRef} type="button" onClick={() => { setMode("view"); setAnnouncement("Customer memory restored."); }}>Undo</button>
        </div>
      ) : (
        <div className={`marketing-knowledge-memory-row${removing ? " marketing-knowledge-memory-removing" : ""}`}>
          <span className="marketing-knowledge-memory-fact">{fact}</span>
          <button ref={addSourceRef} type="button" onClick={onAddSource} aria-label="Add a source" aria-haspopup="dialog" disabled={removing}><span className="knowledge-action-icon"><Plus size={14} aria-hidden="true" /></span>Add</button>
          <button ref={editRef} type="button" onClick={() => { setDraft(fact); setMode("edit"); }} disabled={removing}>
            <span className="knowledge-action-icon"><Pencil size={14} aria-hidden="true" /></span>Edit
          </button>
          <button type="button" onClick={forget} disabled={removing}><span className="knowledge-action-icon"><X size={14} aria-hidden="true" /></span>Forget</button>
        </div>
      )}
    </div>
  );
}
