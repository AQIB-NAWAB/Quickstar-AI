"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Globe,
  MapPin,
  Save,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChipInput } from "@/components/ui/chip-input";
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

export function LeadGenerationProfilePage({ workspaceId }: { workspaceId: string }) {
  const [profile, setProfile] = useState<LeadGenerationProfile | null>(null);
  const [business, setBusiness] = useState<BusinessInput>(emptyBusiness());
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track if user has made edits so polling does NOT overwrite dirty inputs
  const isDirtyRef = useRef(false);
  const isFetchingRef = useRef(false);

  const load = useCallback(
    async (isInitial = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (isInitial) setLoading(true);

      try {
        const res = await getProfile(workspaceId);
        if (res.error || !res.data) {
          if (isInitial) setError(res.error?.message ?? "Failed to load profile");
          return;
        }

        const p = res.data.profile;
        setProfile(p);

        // Only update input form values if not dirty or on initial load
        if (isInitial || !isDirtyRef.current) {
          const supplied = (p?.supplied as BusinessInput | undefined) ?? emptyBusiness();
          setBusiness({
            name: supplied.name || "",
            website: supplied.website || "https://",
            description: supplied.description || "",
            offerings: supplied.offerings ?? [],
            target_categories: supplied.target_categories ?? [],
            locations: supplied.locations ?? [],
          });
          if (isInitial) isDirtyRef.current = false;
        }
      } finally {
        if (isInitial) setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const isResearching = profile?.research_status
    ? ["queued", "running"].includes(String(profile.research_status))
    : false;

  // Poll research status without wiping user's unsaved edits
  useEffect(() => {
    if (!isResearching) return;
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void load(false);
    }, 3000);
    return () => clearInterval(t);
  }, [isResearching, load]);

  function updateField<K extends keyof BusinessInput>(field: K, value: BusinessInput[K]) {
    isDirtyRef.current = true;
    setBusiness((prev) => ({ ...prev, [field]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!business.name.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!business.website.trim() || business.website.trim() === "https://") {
      setError("Company website is required.");
      return;
    }
    if (!business.description.trim()) {
      setError("Company description is required.");
      return;
    }
    if (business.target_categories.length === 0) {
      setError("At least one target category is required.");
      return;
    }
    if (business.locations.length === 0) {
      setError("At least one location is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    const body = {
      expected_version: Number(profile?.version ?? 0),
      business: {
        ...business,
        name: business.name.trim(),
        website: business.website.trim(),
        description: business.description.trim(),
        offerings: business.offerings.map((s) => s.trim()).filter(Boolean),
        target_categories: business.target_categories.map((s) => s.trim()).filter(Boolean),
        locations: business.locations.map((s) => s.trim()).filter(Boolean),
      },
    };

    const res = await putProfile(workspaceId, body);
    setSaving(false);

    if (res.error || !res.data) {
      setError(res.error?.message ?? "Failed to save profile");
      return;
    }

    setProfile(res.data.profile);
    isDirtyRef.current = false;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    await load(false);
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 w-48 bg-neutral-100 rounded-8 animate-pulse" />
        <div className="h-96 bg-white border border-neutral-200 rounded-8 animate-pulse" />
      </div>
    );
  }

  const isResearchFailed = profile?.research_status === "failed";
  const hasSavedDetails = Boolean(profile?.supplied && (profile.supplied as BusinessInput).name);

  return (
    <div className="lead-console lead-profile space-y-8">
      {/* 1. Header matching 8.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Business profile</h1>

        <Link
          href={`/workspaces/${workspaceId}/lead-generation/runs`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-8 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs transition-colors self-start sm:self-auto shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-neutral-600" />
          <span>Back to runs</span>
        </Link>
      </div>

      {/* 2. Research Notice Banner matching 8.png */}
      {isResearchFailed && (
        <div className="flex items-start gap-3 p-4 rounded-8 border border-amber-200 bg-amber-50/80 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-amber-950">Website research failed</p>
            {hasSavedDetails && (
              <p className="text-amber-800">Your saved business details are still available.</p>
            )}
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-8 border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-8 border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Form Layout: Unframed settings sections matching 8.png */}
      <form onSubmit={onSave} className="space-y-8">
        {/* SECTION 1: YOUR BUSINESS */}
        <div className="flex flex-col md:flex-row gap-6 pt-2">
          {/* Left Column: Label ~240-280px */}
          <div className="w-full md:w-[260px] shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-base">
              <Building2 className="w-5 h-5 text-neutral-700" />
              <span>Your business</span>
            </div>
            <p className="text-xs text-neutral-500 font-normal">
              Company details and offerings.
            </p>
          </div>

          {/* Right Column: Form Fields */}
          <div className="min-w-0 flex-1 space-y-6 lead-profile-fields">
            {/* Paired Company Name + Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Company name <span className="text-heat-100">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={business.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full h-11 px-3.5 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Website <span className="text-heat-100">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="url"
                    required
                    value={business.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://example.com"
                    className="w-full h-11 pl-10 pr-3.5 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-800">
                Description <span className="text-heat-100">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={business.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="What does your company do and what value do you provide?"
                className="w-full p-3.5 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors"
              />
            </div>

            {/* Core offerings ChipInput */}
            <div className="space-y-1.5">
              <ChipInput
                label="Core offerings"
                values={business.offerings}
                onChange={(vals) => updateField("offerings", vals)}
                placeholder="Add offering..."
                helperText="Add an offering and press Enter."
              />
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* SECTION 2: TARGET CUSTOMERS */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column: Label ~240-280px */}
          <div className="w-full md:w-[260px] shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-base">
              <Target className="w-5 h-5 text-neutral-700" />
              <span>Target customers</span>
            </div>
            <p className="text-xs text-neutral-500 font-normal">
              Categories and locations.
            </p>
          </div>

          {/* Right Column: Form Fields */}
          <div className="min-w-0 flex-1 space-y-6 lead-profile-fields">
            {/* Target categories */}
            <div className="space-y-1.5">
              <ChipInput
                label="Target categories"
                required
                values={business.target_categories}
                onChange={(vals) => updateField("target_categories", vals)}
                placeholder="Add category..."
              />
            </div>

            {/* Locations */}
            <div className="space-y-1.5">
              <ChipInput
                label="Locations"
                required
                icon={MapPin}
                values={business.locations}
                onChange={(vals) => updateField("locations", vals)}
                placeholder="Add location..."
              />
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* 4. Footer Actions matching 8.png */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <p className="text-xs text-neutral-500 font-normal">
            Changes apply to future research runs.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="h-11 px-6 rounded-8 bg-heat-100 hover:bg-orange-600 text-xs font-semibold text-white inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 self-end sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving…" : "Save profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
