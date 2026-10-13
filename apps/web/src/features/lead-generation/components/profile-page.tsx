"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getProfile, putProfile } from "../lib/client";
import type { BusinessInput, LeadGenerationProfile } from "../lib/types";

const emptyBusiness = (): BusinessInput => ({
  name: "",
  website: "https://",
  description: "",
  offerings: [],
  target_categories: [],
  locations: [],
});

function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function LeadGenerationProfilePage({ workspaceId }: { workspaceId: string }) {
  const [profile, setProfile] = useState<LeadGenerationProfile | null>(null);
  const [business, setBusiness] = useState<BusinessInput>(emptyBusiness());
  const [offeringsText, setOfferingsText] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [locationsText, setLocationsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getProfile(workspaceId);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "Failed to load profile");
      setLoading(false);
      return;
    }
    const p = res.data.profile;
    setProfile(p);
    const supplied = (p?.supplied as BusinessInput | undefined) ?? emptyBusiness();
    setBusiness(supplied);
    setOfferingsText((supplied.offerings ?? []).join(", "));
    setCategoriesText((supplied.target_categories ?? []).join(", "));
    setLocationsText((supplied.locations ?? []).join(", "));
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profile?.research_status || !["queued", "running"].includes(String(profile.research_status))) {
      return;
    }
    const t = setInterval(() => void load(), 2000);
    return () => clearInterval(t);
  }, [profile?.research_status, load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      expected_version: Number(profile?.version ?? 0),
      business: {
        ...business,
        offerings: csv(offeringsText),
        target_categories: csv(categoriesText),
        locations: csv(locationsText),
      },
    };
    const res = await putProfile(workspaceId, body);
    setSaving(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "Failed to save profile");
      return;
    }
    setProfile(res.data.profile);
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading business profile…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead generation profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell the research bot what you sell and who to find. Research status:{" "}
            <span className="font-medium text-foreground">
              {String(profile?.research_status ?? "none")}
            </span>
          </p>
        </div>
        <Link
          href={`/workspaces/${workspaceId}/lead-generation/runs`}
          className="text-sm font-medium text-heat-100 underline-offset-4 hover:underline"
        >
          View runs
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSave} className="space-y-4">
        {(
          [
            ["name", "Business name"],
            ["website", "Website"],
            ["description", "Description"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1 text-sm">
            <span className="font-medium">{label}</span>
            {key === "description" ? (
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                rows={3}
                value={business[key]}
                onChange={(e) => setBusiness((b) => ({ ...b, [key]: e.target.value }))}
                required
              />
            ) : (
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={business[key]}
                onChange={(e) => setBusiness((b) => ({ ...b, [key]: e.target.value }))}
                required
              />
            )}
          </label>
        ))}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Offerings (comma-separated)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            value={offeringsText}
            onChange={(e) => setOfferingsText(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Target categories (comma-separated)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Locations (comma-separated)</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            value={locationsText}
            onChange={(e) => setLocationsText(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
