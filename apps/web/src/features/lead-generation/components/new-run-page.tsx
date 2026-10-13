"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createRun, getPolicy, getProfile } from "../lib/client";
import type { LeadPolicy, LeadRunInput } from "../lib/types";

export function LeadGenerationNewRunPage({
  workspaceId,
  embedded = false,
  onCancel,
}: {
  workspaceId: string;
  embedded?: boolean;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [policy, setPolicy] = useState<LeadPolicy | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [categories, setCategories] = useState("");
  const [location, setLocation] = useState("");
  const [targetCount, setTargetCount] = useState(5);
  const [requiredContact, setRequiredContact] =
    useState<LeadRunInput["required_contact"]>("email");
  const [excluded, setExcluded] = useState("");
  const [instructions, setInstructions] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const [policyRes, profileRes] = await Promise.all([
        getPolicy(workspaceId),
        getProfile(workspaceId),
      ]);
      if (policyRes.data?.policy) setPolicy(policyRes.data.policy);
      const status = String(profileRes.data?.profile?.research_status ?? "");
      setProfileReady(status === "ready" || Boolean(profileRes.data?.profile?.supplied));
      const cats = (profileRes.data?.profile?.supplied as { target_categories?: string[] } | undefined)
        ?.target_categories;
      if (cats?.length) setCategories(cats.join(", "));
      const locs = (profileRes.data?.profile?.supplied as { locations?: string[] } | undefined)
        ?.locations;
      if (locs?.[0]) setLocation(locs[0]);
    })();
  }, [workspaceId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body: LeadRunInput = {
      categories: categories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      location: location.trim() || undefined,
      excluded_domains: excluded
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      required_contact: requiredContact,
      target_count: targetCount,
      instructions: instructions.trim() || undefined,
      campaign_id: campaignId.trim() || undefined,
    };
    const key = `ui-run:${workspaceId}:${crypto.randomUUID()}`;
    const res = await createRun(workspaceId, body, key);
    setSubmitting(false);
    if (res.error || !res.data?.run?.id) {
      setError(res.error?.message ?? "Failed to create run");
      return;
    }
    router.push(`/workspaces/${workspaceId}/lead-generation/runs/${res.data.run.id}`);
  }

  return (
    <div className={embedded ? "space-y-5" : "mx-auto max-w-2xl space-y-6"}>
      {!embedded && (
        <Link
          href={`/workspaces/${workspaceId}/lead-generation/runs`}
          className="text-sm font-medium text-neutral-500 underline-offset-4 hover:underline"
        >
          ← Runs
        </Link>
      )}
      <ol aria-label="New run progress" className="grid grid-cols-3 gap-2">
        {["Brief", "Constraints", "Review"].map((label, index) => {
          const number = index + 1;
          const current = step === number;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={number > step}
                onClick={() => number < step && setStep(number)}
                className={`flex w-full items-center gap-2 rounded-10 px-2 py-2 text-left text-[12px] font-semibold ${current ? "bg-heat-8 text-heat-100" : "text-neutral-600"}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] ring-1 ring-border-faint">
                  {number}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-accent-black">
          {step === 1 ? "Research brief" : step === 2 ? "Constraints" : "Review and start"}
        </h2>
        <p className="mt-1 text-[13px] font-medium text-neutral-500">
          {profileReady
            ? "Profile is set. Configure categories and target count."
            : "Save a business profile first so research has context."}
        </p>
        {policy ? (
          <p className="mt-1 text-xs font-medium text-neutral-500">
            Policy: max {policy.max_target_count} targets, min fit {policy.min_fit_score}, daily runs{" "}
            {policy.daily_runs}.
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          if (step < 3) {
            event.preventDefault();
            if (step === 1 && !categories.trim()) {
              setError("Add at least one category.");
              return;
            }
            setError(null);
            setStep(step + 1);
            return;
          }
          void onSubmit(event);
        }}
        className="space-y-4"
      >
        {step === 1 && (
          <>
        <label className="block space-y-1 text-sm font-medium">
          <span>Categories (comma-separated)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Location</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Target count</span>
          <input
            type="number"
            min={1}
            max={policy?.max_target_count ?? 50}
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            required
          />
        </label>
          </>
        )}
        {step === 2 && (
          <>
        <label className="block space-y-1 text-sm font-medium">
          <span>Required contact</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
            value={requiredContact}
            onChange={(e) =>
              setRequiredContact(e.target.value as LeadRunInput["required_contact"])
            }
          >
            <option value="none">None</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Excluded domains (comma-separated)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
            value={excluded}
            onChange={(e) => setExcluded(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Campaign ID (optional delivery target)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="UUID of an existing campaign"
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Extra instructions</span>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>
          </>
        )}
        {step === 3 && (
          <dl className="space-y-2 rounded-12 border border-border-faint bg-neutral-50 p-4 text-sm font-medium">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Categories</dt>
              <dd className="text-right text-accent-black">{categories || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Location</dt>
              <dd className="text-right text-accent-black">{location || "Any"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Targets</dt>
              <dd className="text-right text-accent-black">{targetCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Required contact</dt>
              <dd className="text-right capitalize text-accent-black">{requiredContact}</dd>
            </div>
          </dl>
        )}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex gap-2">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
            ) : null}
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
              >
                Back
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={submitting || !profileReady}
            className="rounded-md bg-heat-100 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {step < 3 ? "Continue" : submitting ? "Starting…" : "Start run"}
          </button>
        </div>
      </form>
    </div>
  );
}
