"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChipInput } from "@/components/ui/chip-input";
import { confirmProfileFacts, getProfile, putProfile } from "../lib/client";
import type { BusinessInput, LeadGenerationProfile } from "../lib/types";

const emptyBusiness = (): BusinessInput => ({
  name: "",
  website: "https://",
  description: "",
  offerings: [],
  target_categories: [],
  locations: [],
  products_or_services: [],
  selling_points: [],
  ideal_customer_profile: "",
  preferred_roles: [],
  exclusions: [],
  target_countries: [],
  target_industries: [],
});

export function LeadGenerationProfilePage({ workspaceId }: { workspaceId: string }) {
  const [profile, setProfile] = useState<LeadGenerationProfile | null>(null);
  const [business, setBusiness] = useState<BusinessInput>(emptyBusiness());
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
          const confirmed = p?.confirmed_facts as any;
          const supplied = (confirmed?.confirmed_facts || p?.supplied) as BusinessInput | undefined;
          const base = supplied ?? emptyBusiness();

          setBusiness({
            name: base.name || "",
            website: base.website || "https://",
            description: base.description || "",
            offerings: base.offerings ?? [],
            target_categories: base.target_categories ?? [],
            locations: base.locations ?? [],
            products_or_services: base.products_or_services ?? [],
            selling_points: base.selling_points ?? [],
            ideal_customer_profile: base.ideal_customer_profile || "",
            preferred_roles: base.preferred_roles ?? [],
            exclusions: base.exclusions ?? [],
            target_countries: base.target_countries ?? [],
            target_industries: base.target_industries ?? [],
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
    const websiteClean = business.website?.trim() || "";
    if (websiteClean && websiteClean !== "https://" && !websiteClean.includes(".")) {
      setError("Please provide a valid company website URL or leave blank.");
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
        ...(websiteClean && websiteClean !== "https://" ? { website: websiteClean } : {}),
        description: business.description.trim(),
        offerings: business.offerings.map((s) => s.trim()).filter(Boolean),
        target_categories: business.target_categories.map((s) => s.trim()).filter(Boolean),
        locations: business.locations.map((s) => s.trim()).filter(Boolean),
        products_or_services: (business.products_or_services ?? []).map((s) => s.trim()).filter(Boolean),
        selling_points: (business.selling_points ?? []).map((s) => s.trim()).filter(Boolean),
        ideal_customer_profile: (business.ideal_customer_profile ?? "").trim(),
        preferred_roles: (business.preferred_roles ?? []).map((s) => s.trim()).filter(Boolean),
        exclusions: (business.exclusions ?? []).map((s) => s.trim()).filter(Boolean),
        target_countries: (business.target_countries ?? []).map((s) => s.trim()).filter(Boolean),
        target_industries: (business.target_industries ?? []).map((s) => s.trim()).filter(Boolean),
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

  async function handleConfirmFacts() {
    setConfirming(true);
    setError(null);
    try {
      const res = await confirmProfileFacts(workspaceId, {
        approved: true,
        confirmed_facts: business as any,
        notes: "Approved by workspace user via portal",
      });
      if (res.data) {
        setProfile(res.data.profile);
        setConfirmSuccess(true);
        setTimeout(() => setConfirmSuccess(false), 4000);
      } else {
        setError(res.error?.message || "Failed to confirm facts");
      }
    } finally {
      setConfirming(false);
    }
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
  const isResearchReady = profile?.research_status === "ready";
  const hasSavedDetails = Boolean(profile?.supplied && (profile.supplied as BusinessInput).name);
  const isFactsConfirmed = Boolean(profile?.confirmed_facts && (profile.confirmed_facts as any).approved);
  const hasResearchedFacts = Boolean(profile?.researched && Object.keys(profile.researched).length > 0);

  return (
    <div className="lead-console lead-profile space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Business profile</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Define verified business facts, selling points, ideal prospects, and targeting criteria.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          {isFactsConfirmed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Facts Approved</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleConfirmFacts}
              disabled={confirming}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{confirming ? "Approving…" : "Approve as Official Facts"}</span>
            </button>
          )}

          <Link
            href={`/workspaces/${workspaceId}/lead-generation/runs`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-8 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-600" />
            <span>Back to runs</span>
          </Link>
        </div>
      </div>

      {/* Confirmation Required Notice Banner */}
      {!isFactsConfirmed && (hasResearchedFacts || isResearchReady) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-10 border border-blue-200 bg-blue-50/70 text-blue-950">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-blue-950">AI Research Findings Require Confirmation</p>
              <p className="text-blue-800">
                AI analyzed your website and proposed business facts below. Confirm them to treat them as approved facts for lead targeting and qualification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirmFacts}
            disabled={confirming}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-8 text-xs font-semibold shrink-0 shadow-xs transition-colors disabled:opacity-50"
          >
            {confirming ? "Confirming…" : "Confirm & Approve Facts"}
          </button>
        </div>
      )}

      {/* Research Notice Banner */}
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

      {confirmSuccess && (
        <div className="flex items-center gap-2 rounded-8 border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Business facts approved and saved for future qualification runs!</span>
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

      {/* 3. Form Layout */}
      <form onSubmit={onSave} className="space-y-8">
        {/* SECTION 1: YOUR BUSINESS */}
        <div className="flex flex-col md:flex-row gap-6 pt-2">
          <div className="w-full md:w-[260px] shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-base">
              <Building2 className="w-5 h-5 text-neutral-700" />
              <span>Your business</span>
            </div>
            <p className="text-xs text-neutral-500 font-normal">
              Company details and offerings.
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-6 lead-profile-fields">
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
                  placeholder="e.g. Acme Innovations"
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-800">
                Description <span className="text-heat-100">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={business.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="What does your company do and what value do you provide?"
                className="w-full p-3.5 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <ChipInput
                label="Core offerings"
                values={business.offerings}
                onChange={(vals) => updateField("offerings", vals)}
                placeholder="Add offering..."
                helperText="Add an offering and press Enter."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <ChipInput
                  label="Products / Services"
                  values={business.products_or_services ?? []}
                  onChange={(vals) => updateField("products_or_services", vals)}
                  placeholder="e.g. AI Inbound Calling..."
                />
              </div>
              <div className="space-y-1.5">
                <ChipInput
                  label="Key Selling Points"
                  values={business.selling_points ?? []}
                  onChange={(vals) => updateField("selling_points", vals)}
                  placeholder="e.g. Sub-second latency, human transfer..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* SECTION 2: TARGET CUSTOMERS & ICP */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-[260px] shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-base">
              <Target className="w-5 h-5 text-neutral-700" />
              <span>Target prospects</span>
            </div>
            <p className="text-xs text-neutral-500 font-normal">
              Ideal customer profile and decision makers.
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-6 lead-profile-fields">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-800">
                Ideal Customer Profile (ICP)
              </label>
              <textarea
                rows={2}
                value={business.ideal_customer_profile ?? ""}
                onChange={(e) => updateField("ideal_customer_profile", e.target.value)}
                placeholder="Describe your ideal company characteristics, buying signals, or business needs..."
                className="w-full p-3.5 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <ChipInput
                  label="Target categories / industries"
                  required
                  values={business.target_categories}
                  onChange={(vals) => updateField("target_categories", vals)}
                  placeholder="Add category..."
                />
              </div>

              <div className="space-y-1.5">
                <ChipInput
                  label="Locations / Countries"
                  required
                  icon={MapPin}
                  values={business.locations}
                  onChange={(vals) => updateField("locations", vals)}
                  placeholder="Add location..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <ChipInput
                  label="Preferred Decision-Maker Roles"
                  icon={UserCheck}
                  values={business.preferred_roles ?? []}
                  onChange={(vals) => updateField("preferred_roles", vals)}
                  placeholder="e.g. VP Sales, Founder, CTO..."
                />
              </div>

              <div className="space-y-1.5">
                <ChipInput
                  label="Exclusions & Competitors"
                  values={business.exclusions ?? []}
                  onChange={(vals) => updateField("exclusions", vals)}
                  placeholder="e.g. competitor.com, agencies..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* SECTION 3: FACT PROVENANCE AUDIT */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-[260px] shrink-0 space-y-1">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-neutral-700" />
              <span>Fact Provenance</span>
            </div>
            <p className="text-xs text-neutral-500 font-normal">
              Supplied facts vs researched evidence vs AI inferences.
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 border border-neutral-200 rounded-8 bg-neutral-50/70 space-y-1">
                <span className="font-bold text-neutral-900 block">1. Supplied Facts</span>
                <p className="text-neutral-500 text-[11px]">
                  Manually supplied by your team. High confidence baseline.
                </p>
                <div className="text-[11px] font-semibold text-neutral-800 pt-1">
                  {business.name || "None configured"}
                </div>
              </div>

              <div className="p-3.5 border border-neutral-200 rounded-8 bg-neutral-50/70 space-y-1">
                <span className="font-bold text-neutral-900 block">2. Researched Evidence</span>
                <p className="text-neutral-500 text-[11px]">
                  Public findings extracted from your website via web search.
                </p>
                <div className="text-[11px] font-semibold text-neutral-800 pt-1">
                  Status: {profile?.research_status || "None"}
                </div>
              </div>

              <div className="p-3.5 border border-neutral-200 rounded-8 bg-neutral-50/70 space-y-1">
                <span className="font-bold text-neutral-900 block">3. AI Inferences</span>
                <p className="text-neutral-500 text-[11px]">
                  Deduced ICP & selling points. Requires your approval.
                </p>
                <div className="text-[11px] font-semibold text-neutral-800 pt-1">
                  {isFactsConfirmed ? "Approved ✓" : "Pending Confirmation"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200" />

        {/* 4. Footer Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <p className="text-xs text-neutral-500 font-normal">
            Changes apply to future research runs and qualification snapshots.
          </p>

          <div className="flex items-center gap-3">
            {!isFactsConfirmed && (
              <button
                type="button"
                onClick={handleConfirmFacts}
                disabled={confirming}
                className="h-11 px-5 rounded-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{confirming ? "Approving…" : "Approve as Official Facts"}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 rounded-8 bg-heat-100 hover:bg-orange-600 text-xs font-semibold text-white inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving…" : "Save profile"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

