"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Search,
  Trash2,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import type { MemoryFact } from "../lib/types";
import { listFacts } from "../lib/client";
import { EditableFactRow } from "./editable-fact-row";
import { DeleteFactModal } from "./delete-fact-modal";
import { EraseSubjectModal } from "./erase-subject-modal";
import { KnowledgeNavSwitcher } from "./knowledge-nav-switcher";
import { FeatureDialog } from "./feature-dialog";

interface MemoryFactsProps {
  workspaceId: string;
}

export function MemoryFacts({ workspaceId }: MemoryFactsProps) {
  // Separate draft input from currently loaded subject
  const [subjectDraft, setSubjectDraft] = useState("");
  const [loadedSubject, setLoadedSubject] = useState<string | null>(null);

  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Inline editing state
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [hasDirtyEdit, setHasDirtyEdit] = useState(false);

  // Pending subject lookup when switching with dirty edit
  const [pendingFactEdit, setPendingFactEdit] = useState<string | null>(null);
  const [pendingSubjectLookup, setPendingSubjectLookup] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Modals
  const [deletingFact, setDeletingFact] = useState<MemoryFact | null>(null);
  const [eraseModalOpen, setEraseModalOpen] = useState(false);

  // Live accessibility announcement
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const loadController = useRef<AbortController | null>(null);
  const loadVersion = useRef(0);
  const requestedSubject = useRef("");
  useEffect(() => () => { loadVersion.current++; loadController.current?.abort(); }, [workspaceId]);
  async function executeLoadFacts(subjectToLoad: string) {
    requestedSubject.current = subjectToLoad;
    const version = ++loadVersion.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setIsLoading(true);
    setError(null);
    setEditingFactId(null);
    setHasDirtyEdit(false);
    setSearchQuery("");

    const res = await listFacts(workspaceId, subjectToLoad, 20, controller.signal).catch(error => {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      throw error;
    });
    if (!res || version !== loadVersion.current) return;
    setIsLoading(false);

    if (res.facts) {
      setLoadedSubject(subjectToLoad);
      setFacts(res.facts);
      setAnnouncement(`Loaded ${res.facts.length} facts for ${subjectToLoad}.`);
    } else {
      setError(res.error?.message || "Failed to load memory facts.");
    }
  }

  function handleLookupSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = subjectDraft.trim();
    if (!trimmed) {
      setInputError("Please enter a subject key.");
      return;
    }
    if (trimmed.length > 255) {
      setInputError("Subject key must be at most 255 characters.");
      return;
    }
    setInputError(null);

    // If an edit is currently dirty, ask for confirmation first
    if (hasDirtyEdit) {
      setPendingSubjectLookup(trimmed);
      setShowDiscardConfirm(true);
      return;
    }

    void executeLoadFacts(trimmed);
  }

  function confirmDiscardAndLoad() {
    if (pendingFactEdit) {
      setEditingFactId(pendingFactEdit); setPendingFactEdit(null); setHasDirtyEdit(false); setShowDiscardConfirm(false); return;
    }
    setShowDiscardConfirm(false);
    setHasDirtyEdit(false);
    setEditingFactId(null);
    if (pendingSubjectLookup) {
      void executeLoadFacts(pendingSubjectLookup);
      setPendingSubjectLookup(null);
          setPendingFactEdit(null);
    }
  }

  // Filtered facts based on local query
  const filteredFacts = useMemo(() => {
    if (!searchQuery.trim()) return facts;
    const q = searchQuery.toLowerCase().trim();
    return facts.filter(
      (f) =>
        (f.fact_key && f.fact_key.toLowerCase().includes(q)) ||
        f.fact_text.toLowerCase().includes(q),
    );
  }, [facts, searchQuery]);

  function handleFactUpdated(updated: MemoryFact) {
    setFacts((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setAnnouncement("Fact updated.");
  }

  function handleFactDeleted(factId: string) {
    setFacts((prev) => prev.filter((f) => f.id !== factId));
    setAnnouncement("Fact deleted.");
    setDeletingFact(null);
  }

  function handleSubjectErased(deletedCount?: number) {
    setFacts([]);
    setEditingFactId(null);
    setHasDirtyEdit(false);
    const msg =
      deletedCount !== undefined
        ? `Erased ${deletedCount} memory facts for subject.`
        : "Subject memory erased.";
    setAnnouncement(msg);
  }

  return (
    <div className="console-feature knowledge-feature space-y-6">
      {/* Screen Reader Live Region */}
      {announcement ? (
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      ) : null}

      {/* Header and Mobile Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-accent-black tracking-tight">
            Memory
          </h1>
          <p className="text-xs text-neutral-500">
            Inspect and manage facts stored for a subject.
          </p>
        </div>

        <KnowledgeNavSwitcher workspaceId={workspaceId} />
      </div>

      {/* Subject Lookup Card */}
      <div className="space-y-3">
        <form onSubmit={handleLookupSubmit} className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="subject-lookup-input"
            className="block text-xs font-semibold text-accent-black"
          >
            Subject key
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <input
              id="subject-lookup-input"
              type="text"
              value={subjectDraft}
              onChange={(e) => {
                setSubjectDraft(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="Enter a subject key (e.g. customer:1042)"
              className="w-full sm:w-[320px] font-mono rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {isLoading ? "Loading..." : "Load facts"}
            </button>
          </div>
          {inputError ? (
            <p className="text-xs text-accent-crimson font-medium">{inputError}</p>
          ) : null}
        </form>
      </div>

      {error && !loadedSubject && <div role="alert" className="rounded-12 border border-red-200 bg-red-50 p-4 text-sm text-accent-crimson">{error}<button className="ml-3 underline" onClick={() => void executeLoadFacts(requestedSubject.current)}>Retry</button></div>}
      {/* Loaded Facts Workspace Panel */}
      {loadedSubject ? (
        <div className="space-y-4">
          {/* Panel Header */}
          <div className="p-4 bg-white border border-border-faint rounded-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <span className="font-mono text-sm font-bold text-accent-black break-words">
                {loadedSubject}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
                {facts.length} loaded {facts.length === 1 ? "fact" : "facts"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search facts query */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search loaded facts"
                  placeholder="Search loaded facts..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-10 border border-border-faint bg-white text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 transition-shadow"
                />
              </div>

              {/* Erase subject memory button */}
              <button
                type="button"
                onClick={() => setEraseModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-10 border border-red-200 text-accent-crimson bg-white hover:bg-red-50 text-xs font-semibold transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Erase subject memory</span>
              </button>
            </div>
          </div>

          {/* 20-fact cap notice */}
          {facts.length === 20 ? (
            <div
              role="note"
              className="p-3 bg-neutral-50 border border-border-faint rounded-10 flex items-center gap-2 text-xs text-neutral-600"
            >
              <AlertCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>
                Showing up to 20 facts. Additional facts may exist for this subject.
              </span>
            </div>
          ) : null}

          {/* Table or Empty States */}
          {isLoading ? (
            <div className="border border-border-faint rounded-10 bg-white p-6 space-y-3 animate-pulse">
              <div className="h-6 bg-neutral-100 rounded" />
              <div className="h-6 bg-neutral-100 rounded" />
              <div className="h-6 bg-neutral-100 rounded" />
            </div>
          ) : error ? (
            <div className="p-8 bg-red-50 border border-red-200 rounded-10 text-center space-y-3">
              <p className="text-xs font-semibold text-accent-crimson">{error}</p>
              <button
                type="button"
                onClick={() => void executeLoadFacts(requestedSubject.current)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-border-faint text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : facts.length === 0 ? (
            <div className="p-10 bg-white border border-border-faint rounded-10 text-center space-y-2 shadow-sm">
              <p className="text-xs font-semibold text-accent-black">
                No facts stored for this subject
              </p>
              <p className="text-xs text-neutral-500">
                Memory facts are extracted automatically during agent conversations.
              </p>
            </div>
          ) : filteredFacts.length === 0 ? (
            <div className="p-8 bg-white border border-border-faint rounded-10 text-center space-y-2 shadow-sm">
              <p className="text-xs font-semibold text-accent-black">
                No facts match your search
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-3 py-1.5 rounded-8 bg-neutral-100 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="border border-border-faint rounded-10 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-faint bg-neutral-50/60 text-neutral-500 font-medium">
                      <th scope="col" className="py-3 px-4 font-semibold w-48">
                        Fact key
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold">
                        Fact
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold w-40">
                        Updated
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold text-right w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-faint">
                    {filteredFacts.map((fact) => (
                      <EditableFactRow
                        key={fact.id}
                        workspaceId={workspaceId}
                        fact={fact}
                        isEditing={editingFactId === fact.id}
                        onStartEdit={() => {
                          if (hasDirtyEdit && editingFactId !== fact.id) {
                            setPendingFactEdit(fact.id);
                            setShowDiscardConfirm(true);
                            return;
                          }
                          setEditingFactId(fact.id);
                        }}
                        onCancelEdit={() => setEditingFactId(null)}
                        onFactUpdated={handleFactUpdated}
                        onDeleteClicked={(f) => setDeletingFact(f)}
                        hasDirtyEdit={hasDirtyEdit && editingFactId === fact.id}
                        setHasDirtyEdit={setHasDirtyEdit}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-[11px] text-neutral-400 pt-1">
            Subject keys are matched exactly.
          </p>
        </div>
      ) : (
        /* Initial Empty State */
        <div className="p-12 bg-white border border-border-faint rounded-10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-accent-black">
            Load a subject to view memory facts
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Enter an exact subject identifier (such as a customer ID or user key) above to inspect and manage remembered context.
          </p>
        </div>
      )}

      {/* Delete Single Fact Modal */}
      {deletingFact ? (
        <DeleteFactModal
          open={Boolean(deletingFact)}
          onClose={() => setDeletingFact(null)}
          workspaceId={workspaceId}
          fact={deletingFact}
          onDeleted={handleFactDeleted}
        />
      ) : null}

      {/* Erase Subject Memory Modal */}
      {eraseModalOpen && loadedSubject ? (
        <EraseSubjectModal
          open={eraseModalOpen}
          onClose={() => setEraseModalOpen(false)}
          workspaceId={workspaceId}
          subjectKey={loadedSubject}
          onErased={handleSubjectErased}
        />
      ) : null}

      {/* Discard Edit Confirmation Dialog */}
      <FeatureDialog
        open={showDiscardConfirm}
        onClose={() => {
          setShowDiscardConfirm(false);
          setPendingSubjectLookup(null);
          setPendingFactEdit(null);
        }}
        title="Discard unsaved changes?"
        maxWidthClass="max-w-[420px]"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              You are currently editing a fact. Continuing will discard your unsaved edits.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-faint">
            <button
              type="button"
              onClick={() => {
                setShowDiscardConfirm(false);
                setPendingSubjectLookup(null);
          setPendingFactEdit(null);
              }}
              className="px-3.5 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={confirmDiscardAndLoad}
              className="px-3.5 py-2 rounded-10 bg-accent-crimson text-white text-xs font-semibold hover:bg-red-700"
            >
              Discard and switch
            </button>
          </div>
        </div>
      </FeatureDialog>
    </div>
  );
}
