"use client";

import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCampaignRepository } from "../../lib/repository";
import type { CampaignRepository, WizardDraft } from "../../lib/types";
import { AudienceStep } from "./audience-step";
import { DetailsStep } from "./details-step";
import { RetryPolicyStep } from "./retry-policy-step";
import { ReviewStep } from "./review-step";
import { ScheduleStep } from "./schedule-step";
import { WizardStepper } from "./wizard-stepper";

export function createDefaultDraft(): WizardDraft {
  return {
    name: "Product demo follow-up",
    description: "Outbound follow-up for contacts who requested a product demo.",
    agentId: "00000000-0000-4000-8000-000000000001",
    agentName: "Sales assistant",
    audienceSource: "csv",
    fileName: "demo-contacts.csv",
    rowCount: 1200,
    csvHeaders: ["phone_number", "full_name", "email", "company", "title"],
    columnMappings: [
      { sourceColumn: "phone_number", key: "phone", role: "dial" },
      { sourceColumn: "full_name", key: "name", role: "identity" },
      { sourceColumn: "email", key: "email", role: "contact_email" },
      { sourceColumn: "company", key: "company", role: "custom" },
      { sourceColumn: "title", key: "title", role: "custom" },
    ],
    mappedColumns: {
      phone: "phone_number",
      name: "full_name",
      email: "email",
      customFields: { company: "company", title: "title" },
    },
    parsedRowsPreview: [
      {
        name: "Alex Morgan",
        phone: "+12025550104",
        email: "alex@example.com",
        customFields: { company: "Acme Labs", title: "VP Sales" },
      },
      {
        name: "Jordan Lee",
        phone: "+12025550118",
        email: "jordan@example.com",
        customFields: { company: "Brightfield", title: "Founder" },
      },
    ],
    preparedTargets: [
      {
        phone: "+12025550104",
        name: "Alex Morgan",
        email: "alex@example.com",
        attributes: { company: "Acme Labs", title: "VP Sales" },
      },
      {
        phone: "+12025550118",
        name: "Jordan Lee",
        email: "jordan@example.com",
        attributes: { company: "Brightfield", title: "Founder" },
      },
    ],
    validCount: 2,
    invalidCount: 0,
    duplicateCount: 0,
    schedule: {
      startDate: "2026-10-13",
      startTime: "09:00",
      timezone: "UTC",
      dailyWindowFrom: "09:00",
      dailyWindowTo: "17:00",
    },
    pacing: {
      maxConcurrentCalls: 10,
      maxCallStartsPerMinute: 30,
    },
    retryPolicy: {
      maxRetries: 2,
      retryIntervalMinutes: 30,
      eligibleOutcomes: ["no_answer", "busy", "transient_error"],
    },
  };
}

interface CampaignWizardProps {
  workspaceId: string;
  isPreview?: boolean;
  repository?: CampaignRepository;
  onSaved?: (campaignId: string) => void;
  baseBackUrl?: string;
}

export function CampaignWizard({
  workspaceId,
  isPreview = false,
  repository,
  onSaved,
  baseBackUrl,
}: CampaignWizardProps) {
  const router = useRouter();
  const repo = repository || getCampaignRepository(isPreview);
  const localDraftKey = `quickstart:campaign-draft:${workspaceId}`;

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(() => createDefaultDraft());
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [localDraftSaved, setLocalDraftSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const backUrl =
    baseBackUrl || (isPreview ? "/preview/campaigns" : `/workspaces/${workspaceId}/campaigns`);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(localDraftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { draft?: WizardDraft; step?: number };
        if (parsed.draft) {
          setDraft(parsed.draft);
          setStep(Math.min(5, Math.max(1, parsed.step ?? 1)));
          setLocalDraftSaved(true);
        }
      }
    } catch {
      window.localStorage.removeItem(localDraftKey);
    }
    setDraftLoaded(true);
  }, [localDraftKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(localDraftKey, JSON.stringify({ draft, step }));
      setLocalDraftSaved(true);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [draft, draftLoaded, localDraftKey, step]);

  // Prompt before unload if dirty
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function updateDraft(patch: Partial<WizardDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }

  async function handleSaveDraft() {
    setSaveStatus("saving");
    setErrorMessage(null);

    const res = await repo.saveDraft(workspaceId, draft);
    if (res.status === "ready") {
      window.localStorage.removeItem(localDraftKey);
      setSaveStatus("saved");
      setIsDirty(false);
      setTimeout(() => {
        if (onSaved) {
          onSaved(res.data.id);
        } else {
          router.push(
            isPreview
              ? `/preview/campaigns/${res.data.id}`
              : `/workspaces/${workspaceId}/campaigns/${res.data.id}`,
          );
        }
      }, 1200);
    } else {
      window.localStorage.setItem(localDraftKey, JSON.stringify({ draft, step }));
      setLocalDraftSaved(true);
      setSaveStatus("saved");
      setIsDirty(false);
      setErrorMessage(null);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Top back navigation and header */}
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All campaigns
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-accent-black">Create campaign</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Set up an outbound calling campaign with custom audience, schedule, and retry rules.
          </p>
        </div>

        {/* Stepper on top right / center */}
        <div className="bg-white border border-border-faint rounded-16 px-4 py-2 shadow-sm">
          <WizardStepper
            currentStep={step}
            onSelectStep={(target) => {
              if (target <= step) {
                setStep(target);
              }
            }}
          />
        </div>
      </div>

      {/* Save status notification banner */}
      {saveStatus === "saved" && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-10 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {localDraftSaved
              ? "Draft saved on this device. Return to campaign setup to continue."
              : "Campaign draft saved successfully."}
          </span>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-10 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage || "Failed to save draft."}</span>
        </div>
      )}

      {/* Active Wizard Step Panel */}
      <div>
        {step === 1 && (
          <DetailsStep
            name={draft.name}
            description={draft.description}
            agentId={draft.agentId}
            onUpdate={(data) => updateDraft(data)}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <AudienceStep
            draft={draft}
            onUpdate={(patch) => updateDraft(patch)}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <ScheduleStep
            schedule={draft.schedule}
            pacing={draft.pacing}
            onUpdate={({ schedule, pacing }) => updateDraft({ schedule, pacing })}
            onBack={() => setStep(2)}
            onContinue={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <RetryPolicyStep
            retryPolicy={draft.retryPolicy}
            onUpdate={(retryPolicy) => updateDraft({ retryPolicy })}
            onBack={() => setStep(3)}
            onContinue={() => setStep(5)}
          />
        )}

        {step === 5 && (
          <ReviewStep
            draft={draft}
            isPreview={isPreview}
            onGoToStep={(target) => setStep(target)}
            onBack={() => setStep(4)}
            onSaveDraft={handleSaveDraft}
          />
        )}
      </div>
    </div>
  );
}
