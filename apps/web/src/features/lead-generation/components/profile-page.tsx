"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
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
  const [savedSuccess, setSavedSuccess] = useState(false);
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
    setSavedSuccess(false);

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
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-6 w-48 bg-neutral-100 rounded animate-pulse" />
        <div className="h-80 bg-white border border-border-faint rounded-12 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-faint">
        <div>
          <h1 className="text-2xl font-bold text-accent-black tracking-tight">
            Business profile
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Configure your business offering and target customer profile for lead research.
          </p>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/lead-generation/runs`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 text-xs font-medium border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black shadow-xs transition-colors self-start sm:self-auto shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-neutral-500" />
          <span>Back to runs</span>
        </Link>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-8 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-8 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={onSave} className="bg-white border border-border-faint rounded-12 p-6 shadow-xs space-y-6">
        {/* Section 1: Business identity */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Company information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="biz-name" className="text-xs font-medium text-neutral-700">
                Company name
              </label>
              <input
                id="biz-name"
                type="text"
                placeholder="Acme Support AI"
                value={business.name}
                onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))}
                required
                className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:border-heat-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="biz-website" className="text-xs font-medium text-neutral-700">
                Website
              </label>
              <input
                id="biz-website"
                type="url"
                placeholder="https://acme.example.com"
                value={business.website}
                onChange={(e) => setBusiness((b) => ({ ...b, website: e.target.value }))}
                required
                className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:border-heat-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="biz-desc" className="text-xs font-medium text-neutral-700">
              Description
            </label>
            <textarea
              id="biz-desc"
              rows={3}
              placeholder="Autonomous AI voice and chat agents for clinics, healthcare practices, and B2B companies."
              value={business.description}
              onChange={(e) => setBusiness((b) => ({ ...b, description: e.target.value }))}
              required
              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 p-3 text-xs text-accent-black placeholder:text-neutral-400 focus:border-heat-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-colors"
            />
          </div>
        </div>

        {/* Section 2: Offerings and Targeting */}
        <div className="space-y-4 pt-4 border-t border-border-faint">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Targeting criteria
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="biz-offerings" className="text-xs font-medium text-neutral-700">
              Core offerings <span className="text-neutral-400 font-normal">(comma-separated)</span>
            </label>
            <input
              id="biz-offerings"
              type="text"
              placeholder="AI Voice Inbound & Outbound, Customer Support Chat, Appointment Booking"
              value={offeringsText}
              onChange={(e) => setOfferingsText(e.target.value)}
              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:border-heat-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="biz-categories" className="text-xs font-medium text-neutral-700">
              Target categories <span className="text-neutral-400 font-normal">(comma-separated)</span>
            </label>
            <input
              id="biz-categories"
              type="text"
              placeholder="Dental clinics, Cosmetic surgery, Healthcare practices, B2B SaaS"
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
              required
              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:border-heat-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="biz-locations" className="text-xs font-medium text-neutral-700">
              Locations <span className="text-neutral-400 font-normal">(comma-separated)</span>
            </label>
            <input
              id="biz-locations"
              type="text"
              placeholder="United States, Worldwide"
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
              required
              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:border-heat-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-heat-100 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border-faint">
          <span className="text-xs text-neutral-400">
            Status: {profile?.research_status || "ready"}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-heat-100 hover:bg-heat-200 text-white text-xs font-semibold rounded-8 shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <span>Save profile</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
