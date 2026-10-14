"use client";

import {
  Ban,
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Lock,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Phone,
  Play,
  Plus,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChipInput } from "@/components/ui/chip-input";
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [policy, setPolicy] = useState<LeadPolicy | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [profileReady, setProfileReady] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Form state
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [targetCount, setTargetCount] = useState(5);

  const [requiredContact, setRequiredContact] =
    useState<LeadRunInput["required_contact"]>("email");
  const [instructions, setInstructions] = useState("");
  const [excludedDomains, setExcludedDomains] = useState<string[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [campaignOpen, setCampaignOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingProfile(true);
      const [policyRes, profileRes] = await Promise.all([
        getPolicy(workspaceId),
        getProfile(workspaceId),
      ]);
      if (!active) return;

      if (policyRes.data?.policy) setPolicy(policyRes.data.policy);
      else setError(policyRes.error?.message ?? "Research limits could not be loaded.");

      const profile = profileRes.data?.profile;
      const supplied = profile?.supplied as
        | { name?: string; target_categories?: string[]; locations?: string[] }
        | undefined;

      const name = supplied?.name || "";
      setProfileName(name);

      const status = String(profile?.research_status ?? "");
      setProfileReady(status === "ready" || Boolean(supplied?.name));

      if (supplied?.target_categories?.length) {
        setCategories(supplied.target_categories);
      }
      if (supplied?.locations?.[0]) {
        setLocation(supplied.locations[0]);
      }
      setLoadingProfile(false);
    })();

    return () => {
      active = false;
    };
  }, [workspaceId]);

  const maxTargetCount = policy?.max_target_count ?? 100;
  const minFitScore = policy?.min_fit_score ?? 70;

  function handleIncrementTarget() {
    setTargetCount((prev) => Math.min(maxTargetCount, prev + 1));
  }

  function handleDecrementTarget() {
    setTargetCount((prev) => Math.max(1, prev - 1));
  }

  function handleTargetCountChange(val: string) {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setTargetCount(Math.min(maxTargetCount, Math.max(1, num)));
    }
  }

  function validateStep1(): boolean {
    if (categories.length === 0) {
      setError("Please add at least one target category.");
      return false;
    }
    setError(null);
    return true;
  }

  function handleContinue() {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const body: LeadRunInput = {
      categories: categories.map((s) => s.trim()).filter(Boolean),
      location: location.trim() || undefined,
      excluded_domains: excludedDomains.map((s) => s.trim().toLowerCase()).filter(Boolean),
      required_contact: requiredContact,
      target_count: targetCount,
      instructions: instructions.trim() || undefined,
      campaign_id: campaignId.trim() || undefined,
    };

    const idempotencyKey = `ui-run:${workspaceId}:${crypto.randomUUID()}`;
    const res = await createRun(workspaceId, body, idempotencyKey);
    setSubmitting(false);

    if (res.error || !res.data?.run?.id) {
      setError(res.error?.message ?? "Failed to create run");
      return;
    }

    if (onCancel) onCancel();
    router.push(`/workspaces/${workspaceId}/lead-generation/runs/${res.data.run.id}`);
  }

  return (
    <div className={`lead-console lead-wizard ${embedded ? "lead-wizard-embedded" : "lead-wizard-standalone"}`}>
      {/* 1. Stepper matching 5.png, 6.png, 7.png */}
      <div className="lead-wizard-stepper flex items-center justify-between border-b border-neutral-200">
        <nav aria-label="Wizard Steps" className="flex items-center gap-3">
          {/* Step 1: Targeting */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-xs font-semibold focus:outline-none"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > 1
                  ? "bg-heat-100 text-white"
                  : step === 1
                  ? "bg-heat-100 text-white"
                  : "border border-neutral-300 text-neutral-500 bg-white"
              }`}
            >
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </span>
            <span className={step === 1 ? "text-neutral-900 font-bold" : "text-neutral-600"}>
              Targeting
            </span>
          </button>

          <span className="w-8 h-[1px] bg-neutral-200" />

          {/* Step 2: Requirements */}
          <button
            type="button"
            disabled={step < 2}
            onClick={() => validateStep1() && setStep(2)}
            className="flex items-center gap-2 text-xs font-semibold focus:outline-none disabled:opacity-50"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > 2
                  ? "bg-heat-100 text-white"
                  : step === 2
                  ? "bg-heat-100 text-white"
                  : "border border-neutral-300 text-neutral-500 bg-white"
              }`}
            >
              {step > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
            </span>
            <span className={step === 2 ? "text-neutral-900 font-bold" : "text-neutral-500"}>
              Requirements
            </span>
          </button>

          <span className="w-8 h-[1px] bg-neutral-200" />

          {/* Step 3: Review */}
          <button
            type="button"
            disabled={step < 3}
            onClick={() => validateStep1() && setStep(3)}
            className="flex items-center gap-2 text-xs font-semibold focus:outline-none disabled:opacity-50"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 3
                  ? "bg-heat-100 text-white"
                  : "border border-neutral-300 text-neutral-500 bg-white"
              }`}
            >
              3
            </span>
            <span className={step === 3 ? "text-neutral-900 font-bold" : "text-neutral-500"}>
              Review
            </span>
          </button>
        </nav>

        <span className="text-xs text-neutral-400 font-medium font-sans">
          Step {step} of 3
        </span>
      </div>

      <div className="lead-wizard-body">
      {error && (
        <div className="rounded-8 border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: TARGETING (Image 5.png) */}
      {/* ======================================================== */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Business Profile Row */}
          <div className="flex items-center justify-between py-2 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 className="w-4 h-4 text-neutral-500 shrink-0" />
              <span className="text-neutral-500 font-medium">Business profile</span>
              <span className="font-bold text-neutral-900 truncate">
                {profileName || (loadingProfile ? "Loading…" : "Not configured")}
              </span>
            </div>
            <Link
              href={`/workspaces/${workspaceId}/lead-generation/profile`}
              className="text-xs font-semibold text-neutral-600 hover:text-heat-100 inline-flex items-center gap-1 transition-colors shrink-0"
            >
              <span>View profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Heading */}
          <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
            Who are you looking for?
          </h3>

          {/* Target categories */}
          <div className="space-y-1.5">
            <ChipInput
              label="Target categories"
              required
              maxItems={policy?.max_categories}
              values={categories}
              onChange={setCategories}
              placeholder="Add category..."
              helperText="Add a category and press Enter."
              className="w-full"
            />
          </div>

          {/* Location (optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
              <span>Location</span>
              <span className="text-neutral-400 font-normal">(optional)</span>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Los Angeles, Austin, UK"
                className="w-full h-11 pl-10 pr-3 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors"
              />
            </div>
            <p className="text-[11px] text-neutral-500">Leave blank to search any location.</p>
          </div>

          {/* Lead target */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-800">
              Lead target
            </label>
            <p className="text-[11px] text-neutral-500">Accepted leads to aim for</p>

            <div className="flex items-center gap-3 pt-1">
              <div className="inline-flex items-center rounded-8 border border-neutral-300 bg-white h-11 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={handleDecrementTarget}
                  disabled={targetCount <= 1}
                  className="w-10 h-full flex items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                  aria-label="Decrease target"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxTargetCount}
                  value={targetCount}
                  onChange={(e) => handleTargetCountChange(e.target.value)}
                  className="w-16 h-full text-center text-xs font-bold text-neutral-900 tabular-nums border-x border-neutral-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleIncrementTarget}
                  disabled={targetCount >= maxTargetCount}
                  className="w-10 h-full flex items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                  aria-label="Increase target"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-xs text-neutral-500 font-sans">
                {policy ? `Maximum ${maxTargetCount} per run` : "Limits unavailable"}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 pt-0.5">
              Research may finish before reaching this target.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: REQUIREMENTS (Image 6.png) */}
      {/* ======================================================== */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
            What makes a lead a fit?
          </h3>

          {/* Required contact radio options */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-800">
              Required contact
            </label>

            <div role="radiogroup" aria-label="Required contact" className="lead-contact-options grid grid-cols-1 sm:grid-cols-3">
              {[
                { id: "email", label: "Email address", icon: Mail },
                { id: "phone", label: "Phone number", icon: Phone },
                { id: "none", label: "No requirement", icon: Ban },
              ].map((opt) => {
                const isSelected = requiredContact === opt.id;
                const Icon = opt.icon;

                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 p-3 text-xs font-medium text-left cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-orange-50/70 text-neutral-900"
                        : "bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <input type="radio" name="required-contact" value={opt.id} checked={isSelected}
                      onChange={() => setRequiredContact(opt.id as LeadRunInput["required_contact"])}
                      className="h-5 w-5 shrink-0 accent-orange-600" />
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-heat-100" : "text-neutral-500"}`} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500">
              Only accept businesses with the selected contact method.
            </p>
          </div>

          {/* Minimum fit score row */}
          <div className="flex items-center justify-between py-5 border-t border-neutral-200">
            <div className="flex items-center gap-2.5 text-xs text-neutral-800 font-semibold">
              <Lock className="w-4 h-4 text-neutral-500" />
              <span>Minimum fit score</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-neutral-900 tabular-nums">
                {policy ? `${minFitScore} / 100` : "Not available"}
              </span>
              <p className="text-[11px] text-neutral-400 font-sans">Workspace policy</p>
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Research instructions (optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
              <span>Research instructions</span>
              <span className="text-neutral-400 font-normal">(optional)</span>
            </div>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Find decision-maker names, company size, and social profiles."
              className="w-full p-3 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 transition-colors"
            />
          </div>

          {/* Excluded websites (optional) */}
          <div className="space-y-1.5">
            <ChipInput
              label="Excluded websites"
              values={excludedDomains}
              onChange={setExcludedDomains}
              placeholder="Add a domain..."
              helperText="Add domains you want to skip."
            />
          </div>

          {/* Campaign delivery disclosure */}
          <div className="border-t border-neutral-200 bg-white pt-4 space-y-2">
            <button
              type="button"
              onClick={() => setCampaignOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-800 focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-neutral-500" />
                <span>Campaign delivery</span>
                <span className="text-[10px] font-medium bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200/60">
                  Optional
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  campaignOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <p className="text-[11px] text-neutral-500">
              {campaignId ? `Campaign: ${campaignId}` : "No campaign selected"}
            </p>

            {campaignOpen && (
              <div className="pt-2 border-t border-neutral-100">
                <label className="block text-[11px] text-neutral-600 font-medium mb-1">
                  Destination Campaign ID
                </label>
                <input
                  type="text"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="Paste destination campaign UUID..."
                  className="w-full h-10 px-3 border border-neutral-300 rounded-8 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: REVIEW (Image 7.png) */}
      {/* ======================================================== */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
            Review your research run
          </h3>

          {/* Business Profile Summary Row */}
          <div className="flex items-center gap-3 py-1">
            <Building2 className="w-5 h-5 text-neutral-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-neutral-900">
                {profileName || "Business profile"}
              </p>
              <p className="text-[11px] text-neutral-500">Business profile</p>
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Targeting Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-neutral-900">Targeting</h4>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-heat-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start">
                <span className="text-neutral-500 w-32 shrink-0">Categories</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {categories.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-6 bg-neutral-100 text-neutral-800 border border-neutral-200/80 font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <span className="text-neutral-500 w-32 shrink-0">Location</span>
                <span className="text-neutral-900 font-medium">
                  {location || "Any location"}
                </span>
              </div>

              <div className="flex items-center">
                <span className="text-neutral-500 w-32 shrink-0">Lead target</span>
                <span className="text-neutral-900 font-medium">
                  {targetCount} accepted leads
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Requirements Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-neutral-900">Requirements</h4>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-heat-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <span className="text-neutral-500 w-32 shrink-0">Required contact</span>
                <div className="flex items-center gap-1.5 text-neutral-900 font-medium">
                  {requiredContact === "email" && (
                    <>
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Email address</span>
                    </>
                  )}
                  {requiredContact === "phone" && (
                    <>
                      <Phone className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Phone number</span>
                    </>
                  )}
                  {requiredContact === "none" && <span>No requirement</span>}
                </div>
              </div>

              <div className="flex items-center">
                <span className="text-neutral-500 w-32 shrink-0">Minimum fit score</span>
                <div className="flex items-center gap-1.5 text-neutral-900 font-medium">
                  <span>{policy ? `${minFitScore} / 100` : "Not available"}</span>
                  <Lock className="w-3.5 h-3.5 text-neutral-400 ml-1" />
                  <span className="text-neutral-400 font-normal">Workspace policy</span>
                </div>
              </div>

              <div className="flex items-start">
                <span className="text-neutral-500 w-32 shrink-0">Research instructions</span>
                <span className="text-neutral-900 flex-1">
                  {instructions ? instructions : <span className="text-neutral-400 italic">None added</span>}
                </span>
              </div>

              <div className="flex items-start">
                <span className="text-neutral-500 w-32 shrink-0">Excluded websites</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {excludedDomains.length > 0 ? (
                    excludedDomains.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-6 bg-neutral-100 text-neutral-800 border border-neutral-200/80 font-medium"
                      >
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-400 italic">None</span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className="text-neutral-500 w-32 shrink-0">Campaign delivery</span>
                <span className="text-neutral-900 font-mono text-[11px]">
                  {campaignId ? campaignId : <span className="text-neutral-400 font-sans italic">Not configured</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Info note */}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Info className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>Research may finish before reaching the lead target.</span>
          </div>
        </div>
      )}

      </div>
      {/* ======================================================== */}
      {/* FOOTER ACTIONS (Cancel, Back, Continue / Start run) */}
      {/* ======================================================== */}
      <div className="lead-wizard-footer flex items-center justify-between border-t border-neutral-200">
        <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (onCancel) onCancel();
            else router.push(`/workspaces/${workspaceId}/lead-generation/runs`);
          }}
          className="h-11 px-4 rounded-8 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors shadow-xs"
        >
          Cancel
        </button>

          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s === 3 ? 2 : 1)}
              className="h-11 px-4 rounded-8 border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 inline-block mr-2" />Back
            </button>
          )}

        </div>
        <div className="flex items-center gap-2.5">
          {step < 3 ? (
            <button
              type="button"
              disabled={loadingProfile || !profileReady || !policy}
              onClick={handleContinue}
              className="h-11 px-5 rounded-8 bg-heat-100 hover:bg-orange-600 text-xs font-semibold text-white inline-flex items-center gap-2 shadow-xs transition-colors"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !profileReady || !policy}
              onClick={handleSubmit}
              className="h-11 px-5 rounded-8 bg-heat-100 hover:bg-orange-600 text-xs font-semibold text-white inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? "Starting…" : "Start run"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
