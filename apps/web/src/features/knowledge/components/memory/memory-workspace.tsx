"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { CreateFactInput, MemoryFact } from "../../lib/types";
import {
  createFact,
  deleteFact,
  eraseSubjectMemory,
  listFacts,
  updateFact,
} from "../../lib/client";
import { MemorySubjectLookup } from "./memory-subject-lookup";
import { MemorySubjectHeader } from "./memory-subject-header";
import { MemoryFactsTable } from "./memory-facts-table";
import { AddFactModal } from "./add-fact-modal";
import { DeleteFactModal } from "./delete-fact-modal";
import { EraseSubjectModal } from "./erase-subject-modal";
import { DiscardChangesModal } from "./discard-changes-modal";
import {
  MemoryFilterEmptyState,
  MemoryInitialState,
  MemoryZeroFactsState,
} from "./memory-empty-state";
import { MemoryLoadingState } from "./memory-loading-state";

interface MemoryWorkspaceProps {
  workspaceId: string;
}

type DialogState =
  | { type: "add" }
  | { type: "delete"; fact: MemoryFact }
  | { type: "erase"; subjectKey: string; count: number }
  | {
      type: "discard";
      onConfirm: () => void;
      factKey?: string | null;
      context?: "switching-subject" | "switching-fact" | "closing-modal";
    }
  | null;

export function MemoryWorkspace({ workspaceId }: MemoryWorkspaceProps) {
  // Input in lookup box vs actually loaded subject
  const [subjectDraft, setSubjectDraft] = useState("");
  const [loadedSubject, setLoadedSubject] = useState<string | null>(null);

  // Loaded facts and total count
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lookupInputError, setLookupInputError] = useState<string | null>(null);

  // Search filter query
  const [filterQuery, setFilterQuery] = useState("");

  // Inline editing state
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [hasDirtyEdit, setHasDirtyEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Active modal dialog
  const [activeDialog, setActiveDialog] = useState<DialogState>(null);

  // Screen-reader live region announcement
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Request race condition guards
  const loadVersionRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up on unmount or workspace change
  useEffect(() => {
    return () => {
      loadVersionRef.current++;
      abortControllerRef.current?.abort();
    };
  }, [workspaceId]);

  // Guard browser tab reload/close when an edit is dirty
  useEffect(() => {
    if (!hasDirtyEdit) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDirtyEdit]);

  // Load facts for a given subject key
  async function executeLoadFacts(subjectToLoad: string) {
    const version = ++loadVersionRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setLoadError(null);
    setEditingFactId(null);
    setHasDirtyEdit(false);
    setFilterQuery("");

    try {
      const res = await listFacts(workspaceId, subjectToLoad, 50, controller.signal);
      if (version !== loadVersionRef.current) return;

      if (res.facts) {
        // Deterministic sort: updated_at descending, id ascending
        const sorted = [...res.facts].sort((a, b) => {
          const timeDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          if (timeDiff !== 0) return timeDiff;
          return a.id.localeCompare(b.id);
        });

        setLoadedSubject(subjectToLoad);
        setFacts(sorted);
        setTotalCount(res.total ?? sorted.length);
        setAnnouncement(
          `Loaded ${sorted.length} memory facts for subject ${subjectToLoad}.`,
        );
      } else {
        setLoadError(res.error?.message || "Failed to load memory facts.");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (version === loadVersionRef.current) {
        setLoadError(err instanceof Error ? err.message : "Failed to load memory facts.");
      }
    } finally {
      if (version === loadVersionRef.current) {
        setIsLoading(false);
      }
    }
  }

  // Handle subject lookup submission
  function handleLookupSubmit(subjectToLoad: string) {
    const trimmed = subjectToLoad.trim();
    if (!trimmed) {
      setLookupInputError("Please enter a subject key.");
      return;
    }
    if (trimmed.length > 255) {
      setLookupInputError("Subject key must be at most 255 characters.");
      return;
    }
    setLookupInputError(null);

    // If there is an unsaved inline edit, prompt discard confirmation first
    if (hasDirtyEdit) {
      const currentEditingFact = facts.find((f) => f.id === editingFactId);
      setActiveDialog({
        type: "discard",
        context: "switching-subject",
        factKey: currentEditingFact?.fact_key,
        onConfirm: () => {
          setActiveDialog(null);
          setHasDirtyEdit(false);
          setEditingFactId(null);
          void executeLoadFacts(trimmed);
        },
      });
      return;
    }

    void executeLoadFacts(trimmed);
  }

  // Inline edit start with dirty guard
  function handleStartEdit(factId: string) {
    if (hasDirtyEdit && editingFactId !== factId) {
      const currentEditingFact = facts.find((f) => f.id === editingFactId);
      setActiveDialog({
        type: "discard",
        context: "switching-fact",
        factKey: currentEditingFact?.fact_key,
        onConfirm: () => {
          setActiveDialog(null);
          setHasDirtyEdit(false);
          setEditingFactId(factId);
        },
      });
      return;
    }
    setEditingFactId(factId);
  }

  function handleCancelEdit() {
    setEditingFactId(null);
    setHasDirtyEdit(false);
  }

  // Save inline edit
  async function handleSaveEdit(factId: string, updatedText: string): Promise<boolean> {
    setIsSavingEdit(true);
    const res = await updateFact(workspaceId, factId, { fact_text: updatedText });
    setIsSavingEdit(false);

    if (res.fact) {
      const updatedFact = res.fact;
      setFacts((prev) => {
        const next = prev.map((f) => (f.id === factId ? updatedFact : f));
        return next.sort((a, b) => {
          const timeDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          if (timeDiff !== 0) return timeDiff;
          return a.id.localeCompare(b.id);
        });
      });
      setHasDirtyEdit(false);
      setEditingFactId(null);
      setAnnouncement("Fact updated successfully.");
      return true;
    }

    return false;
  }

  // Save new fact (from Add Fact Modal)
  async function handleSaveNewFact(
    input: CreateFactInput,
  ): Promise<{ success: boolean; error?: string }> {
    const res = await createFact(workspaceId, input);
    if (!res.fact) {
      return { success: false, error: res.error?.message || "Failed to create fact." };
    }

    const saved = res.fact;
    setFacts((prev) => {
      // Check if keyed upsert updated an existing row
      const existingIndex = prev.findIndex((f) => f.id === saved.id);
      let next: MemoryFact[];
      if (existingIndex >= 0) {
        next = prev.map((f) => (f.id === saved.id ? saved : f));
      } else {
        next = [saved, ...prev];
        setTotalCount((c) => c + 1);
      }
      return next.sort((a, b) => {
        const timeDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });
    });

    setAnnouncement(`Fact saved for ${input.subject_key}.`);
    return { success: true };
  }

  // Delete single fact
  async function handleConfirmDelete(factId: string): Promise<boolean> {
    const res = await deleteFact(workspaceId, factId);
    if (res.success) {
      setFacts((prev) => prev.filter((f) => f.id !== factId));
      setTotalCount((c) => Math.max(0, c - 1));
      setAnnouncement("Fact deleted.");
      return true;
    }
    return false;
  }

  // Erase subject memory
  async function handleConfirmErase(subjectKey: string): Promise<boolean> {
    const res = await eraseSubjectMemory(workspaceId, subjectKey);
    if (res.success) {
      setFacts([]);
      setTotalCount(0);
      setEditingFactId(null);
      setHasDirtyEdit(false);
      setAnnouncement(`All memory facts erased for ${subjectKey}.`);
      return true;
    }
    return false;
  }

  // Local case-insensitive filter
  const filteredFacts = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return facts;
    return facts.filter(
      (f) =>
        (f.fact_key && f.fact_key.toLowerCase().includes(query)) ||
        f.fact_text.toLowerCase().includes(query),
    );
  }, [facts, filterQuery]);

  // Add Fact button availability: disabled until a subject has been successfully loaded
  const isAddFactDisabled = loadedSubject === null || isLoading;

  return (
    <div className="space-y-6">
      {/* Screen Reader Live Region */}
      {announcement && (
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      )}

      {/* Page Header matching Image 1 & Image 6 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight">
            Memory
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] max-w-2xl">
            Inspect, create, and manage remembered facts for customer subjects across agent sessions.
          </p>
        </div>

        {/* Desktop / Tablet "+ Add fact" CTA */}
        <div className="hidden sm:block shrink-0">
          <button
            type="button"
            disabled={isAddFactDisabled}
            onClick={() => setActiveDialog({ type: "add" })}
            className="px-4 py-2.5 rounded-[8px] bg-[#FF571A] hover:bg-[#E0460D] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add fact</span>
          </button>
        </div>
      </div>

      {/* Mobile full-width "+ Add fact" CTA (Image 6) */}
      <div className="sm:hidden">
        <button
          type="button"
          disabled={isAddFactDisabled}
          onClick={() => setActiveDialog({ type: "add" })}
          className="w-full py-3 rounded-[8px] bg-[#FF571A] hover:bg-[#E0460D] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add fact</span>
        </button>
      </div>

      {/* Find a subject lookup card */}
      <MemorySubjectLookup
        value={subjectDraft}
        onChange={(val) => {
          setSubjectDraft(val);
          if (lookupInputError) setLookupInputError(null);
        }}
        onSubmit={handleLookupSubmit}
        isLoading={isLoading}
        error={lookupInputError}
      />

      {/* Server / Network Error Banner */}
      {loadError && (
        <div
          role="alert"
          className="p-4 rounded-[12px] bg-red-50 border border-red-200 text-sm text-[#B42318] flex items-center justify-between gap-3 shadow-sm"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              if (subjectDraft.trim()) handleLookupSubmit(subjectDraft.trim());
            }}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content Area according to State */}
      {isLoading ? (
        <MemoryLoadingState subjectKey={subjectDraft.trim() || loadedSubject || "Subject"} />
      ) : loadedSubject === null ? (
        <MemoryInitialState />
      ) : (
        <div className="space-y-4">
          {/* Loaded Subject Header & Filter */}
          <MemorySubjectHeader
            subjectKey={loadedSubject}
            facts={facts}
            totalCount={totalCount}
            filterQuery={filterQuery}
            onFilterChange={setFilterQuery}
            onEraseClick={() =>
              setActiveDialog({
                type: "erase",
                subjectKey: loadedSubject,
                count: totalCount,
              })
            }
          />

          {/* Facts Table or Zero/Filter-Empty States */}
          {facts.length === 0 ? (
            <MemoryZeroFactsState
              subjectKey={loadedSubject}
              onAddFirstFact={() => setActiveDialog({ type: "add" })}
            />
          ) : filteredFacts.length === 0 ? (
            <MemoryFilterEmptyState onClearFilter={() => setFilterQuery("")} />
          ) : (
            <MemoryFactsTable
              facts={facts}
              filteredFacts={filteredFacts}
              totalFactsCount={totalCount}
              filterQuery={filterQuery}
              editingFactId={editingFactId}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onDeleteClick={(fact) => setActiveDialog({ type: "delete", fact })}
              onRequestDiscard={(nextAction) => {
                const currentFact = facts.find((f) => f.id === editingFactId);
                setActiveDialog({
                  type: "discard",
                  context: "switching-fact",
                  factKey: currentFact?.fact_key,
                  onConfirm: () => {
                    setActiveDialog(null);
                    setHasDirtyEdit(false);
                    nextAction();
                  },
                });
              }}
              isSavingEdit={isSavingEdit}
              onDirtyChange={setHasDirtyEdit}
            />
          )}
        </div>
      )}

      {/* Add Fact Modal */}
      {activeDialog?.type === "add" && loadedSubject && (
        <AddFactModal
          isOpen={true}
          subjectKey={loadedSubject}
          existingFacts={facts}
          totalFactsCount={totalCount}
          onClose={() => setActiveDialog(null)}
          onRequestDiscard={(nextAction) => {
            setActiveDialog({
              type: "discard",
              context: "closing-modal",
              onConfirm: () => {
                setActiveDialog(null);
                nextAction();
              },
            });
          }}
          onSaveFact={handleSaveNewFact}
        />
      )}

      {/* Delete Fact Modal */}
      {activeDialog?.type === "delete" && (
        <DeleteFactModal
          isOpen={true}
          fact={activeDialog.fact}
          totalFactsForSubject={totalCount}
          onClose={() => setActiveDialog(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {/* Erase Subject Modal */}
      {activeDialog?.type === "erase" && (
        <EraseSubjectModal
          isOpen={true}
          subjectKey={activeDialog.subjectKey}
          totalFactsCount={activeDialog.count}
          onClose={() => setActiveDialog(null)}
          onConfirmErase={handleConfirmErase}
        />
      )}

      {/* Discard Confirmation Modal */}
      {activeDialog?.type === "discard" && (
        <DiscardChangesModal
          isOpen={true}
          factKey={activeDialog.factKey}
          actionContext={activeDialog.context}
          onClose={() => setActiveDialog(null)}
          onConfirmDiscard={activeDialog.onConfirm}
        />
      )}
    </div>
  );
}
