"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { listRuns } from "../lib/client";
import type { LeadGenerationRunSummary } from "../lib/types";
import { LeadGenerationNewRunPage } from "./new-run-page";

function CreateQueryOpener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "1") onOpen();
  }, [searchParams, onOpen]);
  return null;
}

export function LeadGenerationRunsListPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [runs, setRuns] = useState<LeadGenerationRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = useCallback(() => setCreateOpen(true), []);

  function closeCreate() {
    setCreateOpen(false);
    if (typeof window !== "undefined" && window.location.search.includes("create=1")) {
      router.replace(`/workspaces/${workspaceId}/lead-generation/runs`);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await listRuns(workspaceId);
      if (!active) return;
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Failed to load runs");
        setLoading(false);
        return;
      }
      setRuns(res.data.items ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead generation runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a research run after your business profile is ready.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href={`/workspaces/${workspaceId}/lead-generation/profile`}
            className="font-medium underline-offset-4 hover:underline"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-heat-100 px-3 py-1.5 text-sm font-semibold text-white"
          >
            New run
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading runs…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <Link
                  href={`/workspaces/${workspaceId}/lead-generation/runs/${run.id}`}
                  className="font-medium text-heat-100 underline-offset-4 hover:underline"
                >
                  {run.id.slice(0, 8)}…
                </Link>
                <p className="text-muted-foreground">
                  {(run.brief?.categories ?? []).join(", ") || "—"} ·{" "}
                  {run.brief?.location ?? "any location"}
                </p>
              </div>
              <div className="text-right">
                <div className="font-medium">{run.status}</div>
                <div className="text-muted-foreground">
                  accepted {Number(run.accepted ?? 0)}
                  {run.stop_reason ? ` · ${run.stop_reason}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Suspense fallback={null}>
        <CreateQueryOpener onOpen={openCreate} />
      </Suspense>
      <FeatureDialog
        open={createOpen}
        onClose={closeCreate}
        title="New research run"
        description="Brief, constraints, then start."
        maxWidthClass="max-w-2xl"
      >
        {createOpen ? (
          <LeadGenerationNewRunPage workspaceId={workspaceId} embedded onCancel={closeCreate} />
        ) : null}
      </FeatureDialog>
    </div>
  );
}
