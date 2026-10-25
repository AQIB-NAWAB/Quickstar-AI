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
  Layers,
  Lock,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Phone,
  Play,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Users,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChipInput } from "@/components/ui/chip-input";
import { createRun, getPolicy, getProfile, listCollections } from "../lib/client";
import type {
  ContactRequirement,
  LeadCollection,
  LeadPolicy,
  LeadPriorityCriterion,
  LeadRunInput,
  QualificationMode,
  LeadEntityType,
  SearchCriterion,
} from "../lib/types";

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
  const [entityType, setEntityType] = useState<LeadEntityType>("business");
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [targetCount, setTargetCount] = useState(25); // Default within 20-30 per requirements
  const [qualificationMode, setQualificationMode] = useState<QualificationMode>("strict");
  const [collectionId, setCollectionId] = useState("");
  const [availableCollections, setAvailableCollections] = useState<LeadCollection[]>([]);

  const [requiredContact, setRequiredContact] =
    useState<ContactRequirement>("email");
  const [instructions, setInstructions] = useState("");
  const [excludedDomains, setExcludedDomains] = useState<string[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [campaignOpen, setCampaignOpen] = useState(false);

  // Custom Criteria Builder state
  const [criteria, setCriteria] = useState<SearchCriterion[]>([]);
  const [newField, setNewField] = useState("");
  const [newOp, setNewOp] = useState<"equals" | "contains" | "greater_than" | "less_than" | "exists">("contains");
  const [newVal, setNewVal] = useState("");
  const [newMandatory, setNewMandatory] = useState(true);
  const [newEvidence, setNewEvidence] = useState(true);

  // Pre-dispatch Confirmed Assumptions Modal state
  const [assumptionsModalOpen, setAssumptionsModalOpen] = useState(false);
  const [confirmedAssumptions, setConfirmedAssumptions] = useState<string[]>([]);

  // Chat-assisted targeting state
  const [chatAssistantOpen, setChatAssistantOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatParsed, setChatParsed] = useState<{
    categories: string[];
    location?: string;
    contact: ContactRequirement;
    target: number;
    mode: QualificationMode;
  } | null>(null);

  const [priorities, setPriorities] = useState<LeadPriorityCriterion[]>([
    { field: "email", mandatory: true, priority: 1 },
    { field: "location", mandatory: true, priority: 2 },
    { field: "category", mandatory: true, priority: 3 },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingProfile(true);
      const [policyRes, profileRes, collectionsRes] = await Promise.all([
        getPolicy(workspaceId),
        getProfile(workspaceId),
        listCollections(workspaceId),
      ]);
      if (!active) return;

      if (policyRes.data?.policy) setPolicy(policyRes.data.policy);
      else setError(policyRes.error?.message ?? "Research limits could not be loaded.");

      if (collectionsRes.data?.items) {
        setAvailableCollections(collectionsRes.data.items);
      }

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

  function handleAnalyzeChatPrompt() {
    if (!chatPrompt.trim()) return;
    const text = chatPrompt.toLowerCase();

    // Determine target count: find digits like "25 leads" or "50 prospects"
    const countMatch = text.match(/\b(\d{1,3})\s*(?:leads?|prospects?|companies?|results?)\b/);
    const parsedTarget = countMatch ? Math.min(100, Math.max(1, parseInt(countMatch[1], 10))) : 25;

    // Contact requirement
    let parsedContact: ContactRequirement = "none";
    if (text.includes("phone and email") || text.includes("email and phone") || text.includes("both")) {
      parsedContact = "both";
    } else if (text.includes("phone or email") || text.includes("either")) {
      parsedContact = "either";
    } else if (text.includes("phone") || text.includes("call")) {
      parsedContact = "phone";
    } else if (text.includes("email")) {
      parsedContact = "email";
    }

    // Qualification mode
    let parsedMode: QualificationMode = "strict";
    if (text.includes("best match") || text.includes("broad") || text.includes("loose") || text.includes("flexible")) {
      parsedMode = "best_match";
    }

    // Location extraction heuristic
    let parsedLocation: string | undefined;
    const locKeywords = ["in the uk", "in uk", "in us", "in united states", "in california", "in europe", "in canada", "in australia", "in london", "in new york"];
    for (const kw of locKeywords) {
      if (text.includes(kw)) {
        parsedLocation = kw.replace(/^in (the )?/, "").toUpperCase();
        break;
      }
    }

    // Categories extraction
    const sampleCategories = ["jewelry", "luxury retail", "saas", "ecommerce", "fintech", "healthcare", "real estate", "manufacturing"];
    const foundCategories = sampleCategories.filter((c) => text.includes(c));
    const parsedCategories = foundCategories.length > 0 ? foundCategories : categories.length > 0 ? categories : ["General Business"];

    setChatParsed({
      categories: parsedCategories,
      location: parsedLocation || location,
      contact: parsedContact,
      target: parsedTarget,
      mode: parsedMode,
    });
  }

  function handleApplyChatCriteria() {
    if (!chatParsed) return;
    setCategories(chatParsed.categories);
    if (chatParsed.location) setLocation(chatParsed.location);
    setRequiredContact(chatParsed.contact);
    setTargetCount(chatParsed.target);
    setQualificationMode(chatParsed.mode);
    setChatAssistantOpen(false);
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

  function getGeneratedAssumptions(): string[] {
    const list: string[] = [];
    if (entityType === "business") {
      list.push("Targeting companies & organizations: corporate domain & verified web presence evaluated.");
    } else if (entityType === "professional") {
      list.push("Targeting individual professionals, owners, or executives: personal title/role evaluated.");
    } else {
      list.push("Targeting individual consumers: corporate website/domain requirement waived.");
    }

    if (location.trim()) {
      list.push(`Hierarchical geography validation for '${location.trim()}' (strict province/country resolution without code collision).`);
    } else {
      list.push("Global geographic scope (unrestricted).");
    }

    if (requiredContact === "email") {
      list.push("Mandatory verified email required (strict Observed/Format Valid/Mail Routable validation).");
    } else if (requiredContact === "phone") {
      list.push("Mandatory phone number required with format validation.");
    } else if (requiredContact === "both") {
      list.push("Both verified email and phone number required.");
    } else if (requiredContact === "either") {
      list.push("Either verified email or phone number required.");
    } else {
      list.push("No contact requirement enforced.");
    }

    if (qualificationMode === "strict") {
      list.push("Strict mode: mandatory requirements fail without verified evidence quote; no arbitrary score inflation.");
    } else {
      list.push("Best match mode: ranked by score with transparent gap analysis.");
    }

    if (criteria.length > 0) {
      list.push(`${criteria.length} custom qualification criteria rules enforced.`);
    }

    return list;
  }

  function handleStartRunClick() {
    const generated = getGeneratedAssumptions();
    setConfirmedAssumptions(generated);
    setAssumptionsModalOpen(true);
  }

  async function executeSubmit(assumptionsToSave: string[]) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const body: LeadRunInput = {
      entity_type: entityType,
      categories: categories.map((s) => s.trim()).filter(Boolean),
      location: location.trim() || undefined,
      locations: location.trim() ? [location.trim()] : undefined,
      excluded_domains: entityType === "consumer" ? [] : excludedDomains.map((s) => s.trim().toLowerCase()).filter(Boolean),
      required_contact: requiredContact,
      target_count: targetCount,
      qualification_mode: qualificationMode,
      collection_id: collectionId.trim() || undefined,
      priorities,
      criteria: criteria.length > 0 ? criteria : undefined,
      confirmed_assumptions: assumptionsToSave.length > 0 ? assumptionsToSave : undefined,
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

          {/* Chat-Assisted Request Builder Card */}
          <div className="border border-neutral-200 rounded-10 bg-gradient-to-r from-orange-50/50 via-white to-neutral-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-heat-100" />
                <span className="text-xs font-bold text-neutral-900">Chat-Assisted Targeting Assistant</span>
                <span className="text-[10px] font-semibold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">AI Assisted</span>
              </div>
              <button
                type="button"
                onClick={() => setChatAssistantOpen((prev) => !prev)}
                className="text-xs font-semibold text-heat-100 hover:text-orange-700"
              >
                {chatAssistantOpen ? "Hide Assistant" : "Describe Request"}
              </button>
            </div>

            {chatAssistantOpen && (
              <div className="space-y-3 pt-2 border-t border-neutral-200/60">
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Describe what you're looking for in plain language. AI will propose structured criteria with review before starting the run.
                </p>
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    placeholder="e.g. Find 25 high-growth SaaS founders in the UK needing voice AI automation with verified email..."
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100"
                  />
                  <button
                    type="button"
                    onClick={handleAnalyzeChatPrompt}
                    className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-6 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>Analyze & Propose Criteria</span>
                  </button>
                </div>

                {chatParsed && (
                  <div className="p-3 bg-white border border-orange-200 rounded-8 space-y-2 text-xs">
                    <span className="font-bold text-neutral-900 block text-[11px] uppercase tracking-wider text-orange-950">
                      Proposed Criteria Review:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-700">
                      <div>Categories: <strong>{chatParsed.categories.join(", ")}</strong></div>
                      <div>Location: <strong>{chatParsed.location || "Any location"}</strong></div>
                      <div>Contact: <strong>{chatParsed.contact}</strong></div>
                      <div>Target: <strong>{chatParsed.target} leads</strong></div>
                      <div>Mode: <strong className="capitalize">{chatParsed.mode}</strong></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyChatCriteria}
                      className="mt-1 px-3 py-1 bg-heat-100 hover:bg-orange-600 text-white rounded-6 text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Criteria to Form</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Heading */}
          <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
            Who are you looking for?
          </h3>

          {/* Entity Type Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-800">
              Target Entity Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "business",
                  label: "Businesses & Companies",
                  desc: "Corporate entities, B2B companies, agencies, and retail shops.",
                  icon: Building2,
                },
                {
                  id: "professional",
                  label: "Professionals & Owners",
                  desc: "Founders, executives, freelancers, or independent decision makers.",
                  icon: User,
                },
                {
                  id: "consumer",
                  label: "Individual Consumers",
                  desc: "B2C buyers, audience members, or specific individual prospects.",
                  icon: Users,
                },
              ].map((item) => {
                const isSelected = entityType === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEntityType(item.id as LeadEntityType)}
                    className={`flex flex-col text-left p-3.5 rounded-8 border transition-all ${
                      isSelected
                        ? "border-heat-100 bg-orange-50/60 shadow-xs ring-1 ring-heat-100"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-heat-100" : "text-neutral-500"}`} />
                      <span className={`text-xs font-bold ${isSelected ? "text-neutral-900" : "text-neutral-700"}`}>
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
            {entityType === "consumer" && (
              <div className="flex items-start gap-2 p-2.5 rounded-6 bg-blue-50/80 border border-blue-200 text-blue-900 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Consumer Mode Active:</strong> Corporate website and business domain requirements are relaxed. Prospects will be qualified based on personal contact points, audience attributes, and demographic alignment.
                </p>
              </div>
            )}
            {entityType === "professional" && (
              <div className="flex items-start gap-2 p-2.5 rounded-6 bg-purple-50/80 border border-purple-200 text-purple-900 text-xs">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Professional Mode Active:</strong> Prospects will be evaluated by decision-maker title, profession, company ownership, and individual credentials.
                </p>
              </div>
            )}
          </div>

          {/* Qualification Mode Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-800">
              Qualification Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-8 border cursor-pointer transition-colors ${
                  qualificationMode === "strict"
                    ? "border-heat-100 bg-orange-50/50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <input
                  type="radio"
                  name="qual-mode"
                  checked={qualificationMode === "strict"}
                  onChange={() => setQualificationMode("strict")}
                  className="mt-0.5 accent-orange-600"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-neutral-900 block">Strict Mode</span>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    Every mandatory requirement needs supporting evidence. Unknown mandatory criteria fail. Returns fewer leads rather than padding results.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-8 border cursor-pointer transition-colors ${
                  qualificationMode === "best_match"
                    ? "border-purple-600 bg-purple-50/50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <input
                  type="radio"
                  name="qual-mode"
                  checked={qualificationMode === "best_match"}
                  onChange={() => setQualificationMode("best_match")}
                  className="mt-0.5 accent-purple-600"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-neutral-900 block">Best Match Mode</span>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    Ranks promising prospects even when some criteria are unmet or unknown. Clearly exposes gaps and unverified items for review.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Collection Selector */}
          {availableCollections.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                <Layers className="w-4 h-4 text-neutral-500" />
                <span>Target Collection</span>
                <span className="text-neutral-400 font-normal">(optional)</span>
              </div>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full h-11 px-3 border border-neutral-300 rounded-8 bg-white text-xs text-neutral-900 focus:outline-none focus:border-heat-100"
              >
                <option value="">None (General Workspace)</option>
                {availableCollections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              <span>Location / Countries</span>
              <span className="text-neutral-400 font-normal">(optional)</span>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. United Kingdom, United States, California"
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

            <div role="radiogroup" aria-label="Required contact" className="lead-contact-options grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "email", label: "Email address", icon: Mail },
                { id: "phone", label: "Phone number", icon: Phone },
                { id: "either", label: "Either email or phone", icon: Mail },
                { id: "both", label: "Both email & phone", icon: Phone },
                { id: "none", label: "No requirement", icon: Ban },
              ].map((opt) => {
                const isSelected = requiredContact === opt.id;
                const Icon = opt.icon;

                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 p-3 rounded-8 border text-xs font-medium text-left cursor-pointer transition-colors ${
                      isSelected
                        ? "border-heat-100 bg-orange-50/70 text-neutral-900"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <input type="radio" name="required-contact" value={opt.id} checked={isSelected}
                      onChange={() => setRequiredContact(opt.id as ContactRequirement)}
                      className="h-4 w-4 shrink-0 accent-orange-600" />
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-heat-100" : "text-neutral-500"}`} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500">
              Only accept businesses meeting the selected contact method requirement.
            </p>
          </div>

          {/* Targeting Priorities */}
          <div className="space-y-2 border-t border-neutral-200 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-800">
                Targeting Priorities
              </label>
              <span className="text-[11px] text-neutral-400">Search order priority</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {priorities.map((p, idx) => (
                <div key={p.field} className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded-6">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-neutral-900 capitalize">
                      {p.field === "email"
                        ? "Direct Email Contact"
                        : p.field === "location"
                        ? "Target Geography / Country"
                        : p.field === "category"
                        ? "Industry Alignment"
                        : p.field.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-medium">Rank {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Criteria Builder */}
          <div className="space-y-3 border-t border-neutral-200 pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Custom Qualification Criteria
                </label>
                <p className="text-[11px] text-neutral-500">
                  Define explicit field rules that every prospect must satisfy.
                </p>
              </div>
              <span className="text-[11px] text-neutral-400 font-medium">
                {criteria.length} custom {criteria.length === 1 ? "rule" : "rules"}
              </span>
            </div>

            {/* Criteria list */}
            {criteria.length > 0 && (
              <div className="space-y-2">
                {criteria.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-6 bg-neutral-50 border border-neutral-200 text-xs"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200 text-[11px]">
                        {c.field}
                      </span>
                      <span className="text-neutral-500 font-mono text-[11px]">
                        {c.operator.replace(/_/g, " ")}
                      </span>
                      <span className="font-semibold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200 text-[11px]">
                        "{c.value}"
                      </span>
                      {c.mandatory && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                          Mandatory
                        </span>
                      )}
                      {c.evidence_required && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                          Evidence Required
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-neutral-400 hover:text-red-600 p-1 rounded transition-colors"
                      title="Remove criterion"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new criterion form */}
            <div className="p-3.5 rounded-8 bg-neutral-50/70 border border-neutral-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    placeholder="e.g. industry, role, city"
                    className="w-full h-9 px-2.5 border border-neutral-300 rounded-6 text-xs bg-white text-neutral-900 focus:outline-none focus:border-heat-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                    Operator
                  </label>
                  <select
                    value={newOp}
                    onChange={(e) => setNewOp(e.target.value as any)}
                    className="w-full h-9 px-2.5 border border-neutral-300 rounded-6 text-xs bg-white text-neutral-900 focus:outline-none focus:border-heat-100"
                  >
                    <option value="contains">contains</option>
                    <option value="equals">equals</option>
                    <option value="exists">exists</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                    Expected Value
                  </label>
                  <input
                    type="text"
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                    placeholder="e.g. Retail, Founder"
                    className="w-full h-9 px-2.5 border border-neutral-300 rounded-6 text-xs bg-white text-neutral-900 focus:outline-none focus:border-heat-100"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMandatory}
                      onChange={(e) => setNewMandatory(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span className="font-medium text-neutral-800 text-[11px]">Mandatory Requirement</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEvidence}
                      onChange={(e) => setNewEvidence(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span className="font-medium text-neutral-800 text-[11px]">Require Source Quote</span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={!newField.trim()}
                  onClick={() => {
                    if (!newField.trim()) return;
                    setCriteria((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        field: newField.trim(),
                        operator: newOp,
                        value: newVal.trim(),
                        mandatory: newMandatory,
                        evidence_required: newEvidence,
                      },
                    ]);
                    setNewField("");
                    setNewVal("");
                  }}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-6 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors self-end sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Criterion</span>
                </button>
              </div>
            </div>
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

          {/* Excluded websites (optional, only for non-consumer) */}
          {entityType !== "consumer" ? (
            <div className="space-y-1.5">
              <ChipInput
                label="Excluded websites"
                values={excludedDomains}
                onChange={setExcludedDomains}
                placeholder="Add a domain..."
                helperText="Add domains you want to skip."
              />
            </div>
          ) : (
            <div className="p-3 bg-neutral-50 rounded-8 border border-neutral-200 text-[11px] text-neutral-500">
              Domain exclusions are disabled for Consumer targets.
            </div>
          )}

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
              <div className="flex items-center">
                <span className="text-neutral-500 w-32 shrink-0">Entity type</span>
                <span className="font-semibold text-neutral-900 capitalize">
                  {entityType === "business" ? "Businesses & Companies" : entityType === "professional" ? "Professionals & Owners" : "Individual Consumers"}
                </span>
              </div>

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
                <span className="text-neutral-500 w-32 shrink-0">Mode</span>
                <span className="font-semibold text-neutral-900 capitalize">
                  {qualificationMode === "strict" ? "Strict (All mandatory facts verified)" : "Best Match (Rank with visible gaps)"}
                </span>
              </div>

              {collectionId && (
                <div className="flex items-center">
                  <span className="text-neutral-500 w-32 shrink-0">Collection</span>
                  <span className="text-neutral-900 font-medium">
                    {availableCollections.find((c) => c.id === collectionId)?.name || collectionId}
                  </span>
                </div>
              )}

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

              {criteria.length > 0 && (
                <div className="flex items-start">
                  <span className="text-neutral-500 w-32 shrink-0">Custom criteria</span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {criteria.map((c, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-6 bg-neutral-100 text-neutral-800 border border-neutral-200/80 font-mono text-[11px]">
                        {c.field} {c.operator} "{c.value}" {c.mandatory ? "(mandatory)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                  {requiredContact === "either" && <span>Either email or phone</span>}
                  {requiredContact === "both" && <span>Both email and phone</span>}
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

              {entityType !== "consumer" && (
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
              )}

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
              onClick={handleStartRunClick}
              className="h-11 px-5 rounded-8 bg-heat-100 hover:bg-orange-600 text-xs font-semibold text-white inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? "Starting…" : "Start run"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pre-Dispatch Assumptions Modal */}
      {assumptionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-12 border border-neutral-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-heat-100" />
                <h4 className="text-base font-bold text-neutral-900">
                  Confirm Research Assumptions
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAssumptionsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              QuickStart AI adheres to strict truthful qualification standards. Review and confirm the assumptions and verification rules for this lead research run:
            </p>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {confirmedAssumptions.map((assumption, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-8 bg-neutral-50 border border-neutral-200 text-xs text-neutral-800"
                >
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{assumption}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 rounded-8 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              <strong>Anti-Hallucination Guarantee:</strong> Leads without direct verified evidence will be rejected or surfaced with visible gap explanations. Unverified contacts will never be marked verified.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setAssumptionsModalOpen(false)}
                className="px-4 py-2 rounded-8 border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setAssumptionsModalOpen(false);
                  void executeSubmit(confirmedAssumptions);
                }}
                className="px-4 py-2 rounded-8 bg-heat-100 hover:bg-orange-600 text-xs font-semibold text-white inline-flex items-center gap-2 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{submitting ? "Dispatching…" : "Confirm & Dispatch Run"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
