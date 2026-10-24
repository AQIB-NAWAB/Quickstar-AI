"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FileText, Globe, X } from "lucide-react";

interface SourceDialogProps {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

// The project has feature-specific modals, but no shared dialog primitive.
// Native showModal supplies top-layer rendering, inert background and focus containment.
export function SourceDialog({ open, onClose, triggerRef }: SourceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"document" | "website">("document");
  const [selection, setSelection] = useState<{ kind: "document" | "website"; name: string } | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open, triggerRef]);

  return (
    <dialog ref={dialogRef} className="marketing-knowledge-dialog" aria-labelledby="knowledge-dialog-title"
      aria-describedby="knowledge-dialog-description"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      <div className="marketing-knowledge-dialog-heading">
        <h2 id="knowledge-dialog-title">Add a source</h2>
        <button type="button" onClick={onClose} aria-label="Close add source dialog" autoFocus><X size={20} aria-hidden="true" /></button>
      </div>
      <p id="knowledge-dialog-description">Your selection stays in this preview. Files are not uploaded and websites are not fetched.</p>
      <div className="marketing-knowledge-source-options" role="group" aria-label="Source type">
        <button type="button" aria-pressed={kind === "document"} onClick={() => { setKind("document"); setError(""); }}><FileText size={18} aria-hidden="true" />Document</button>
        <button type="button" aria-pressed={kind === "website"} onClick={() => { setKind("website"); setError(""); }}><Globe size={18} aria-hidden="true" />Website</button>
      </div>
      {kind === "document" ? (
        <div className="marketing-knowledge-file-picker">
          <label htmlFor="knowledge-source-file">Choose a PDF or Markdown document</label>
          <input ref={fileRef} id="knowledge-source-file" type="file" accept=".pdf,.md,.markdown,text/markdown,application/pdf"
            onChange={event => { const file = event.target.files?.[0]; if (file) setSelection({ kind: "document", name: file.name }); }} />
        </div>
      ) : (
        <form className="marketing-knowledge-url-form" onSubmit={event => {
          event.preventDefault();
          try {
            const parsed = new URL(url.trim());
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Invalid protocol");
            setSelection({ kind: "website", name: parsed.href }); setError("");
          } catch { setError("Enter a full website address starting with https:// or http://."); }
        }}>
          <label htmlFor="knowledge-source-url">Website address</label>
          <input id="knowledge-source-url" type="url" placeholder="https://example.com/services" value={url}
            onChange={event => setUrl(event.target.value)} required aria-invalid={!!error} aria-describedby={error ? "knowledge-url-error" : undefined} />
          {error && <p id="knowledge-url-error" role="alert">{error}</p>}
          <button type="submit">Preview selection</button>
        </form>
      )}
      <div className="marketing-knowledge-source-confirmation" role="status" aria-live="polite">
        {selection && <><span><strong>Selected {selection.kind === "document" ? "document" : "website"}</strong><span className="marketing-knowledge-selection-name">{selection.name}</span></span>
          <button type="button" onClick={() => { setSelection(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove selection</button></>}
      </div>
      <div className="marketing-knowledge-dialog-footer"><button type="button" onClick={onClose}>Cancel</button></div>
    </dialog>
  );
}
