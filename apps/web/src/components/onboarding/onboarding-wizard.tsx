"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bot, CheckCircle2, Inbox, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  markOnboardingComplete,
  onboardingPath,
  workspaceHomePath,
} from "@/lib/onboarding";

type Props = {
  workspaceId: string;
  workspaceName: string;
  userEmail: string;
};

const STEPS = [
  { id: 1, title: "Welcome" },
  { id: 2, title: "Your workspace" },
  { id: 3, title: "What's next" },
] as const;

export function OnboardingWizard({ workspaceId, workspaceName, userEmail }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const [step, setStep] = useState(1);

  function finish(destination: "home" | "inbox") {
    markOnboardingComplete(workspaceId);
    const path =
      destination === "inbox"
        ? `/workspaces/${workspaceId}/inbox`
        : workspaceHomePath(workspaceId);
    router.replace(path);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-heat-100">
          {isWelcome ? "Account created" : "Setup guide"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-accent-black">
          {step === 1 && (isWelcome ? "Welcome to QuickStart AI" : "Finish setting up")}
          {step === 2 && "Your workspace is ready"}
          {step === 3 && "Pick your next step"}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Signed in as <span className="font-medium text-accent-black">{userEmail}</span>
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s.id <= step ? "bg-heat-100" : "bg-border-faint"
            }`}
            aria-hidden
          />
        ))}
      </div>

      <div className="rounded-16 border border-border-faint bg-white p-6 md:p-8 shadow-firecrawl-card">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-heat-100 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-600 leading-relaxed">
                QuickStart is your control plane for AI agents: conversations, human handoff, and (soon) voice and
                workflows. Everything staff-facing goes through this app and talks to the API gateway — not individual
                service ports.
              </p>
            </div>
            <p className="text-sm text-neutral-600">
              This short guide takes under a minute. You can reopen it anytime from Overview.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-12 border border-border-faint bg-background-lighter p-4">
              <p className="text-xs font-mono text-neutral-500 uppercase tracking-wide">Workspace</p>
              <p className="mt-1 text-lg font-semibold text-accent-black">{workspaceName}</p>
              <p className="mt-1 text-xs font-mono text-neutral-400 break-all">{workspaceId}</p>
            </div>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-forest shrink-0 mt-0.5" />
                Organization and membership are tied to your login (JWT + workspace RBAC).
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-forest shrink-0 mt-0.5" />
                Open the inbox to read threads, take handoff, and send human replies.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                Team invites and email verification ship in later settings work (F10).
              </li>
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-12 border border-border-faint p-4 hover:border-heat-24 transition-colors">
              <LayoutDashboard className="w-5 h-5 text-heat-100 mb-2" />
              <h3 className="text-sm font-semibold text-accent-black">Overview</h3>
              <p className="mt-1 text-xs text-neutral-500">Dashboard and setup checklist.</p>
            </div>
            <div className="rounded-12 border border-border-faint p-4 hover:border-heat-24 transition-colors">
              <Inbox className="w-5 h-5 text-heat-100 mb-2" />
              <h3 className="text-sm font-semibold text-accent-black">Inbox preview</h3>
              <p className="mt-1 text-xs text-neutral-500">See where live chat will live (F4).</p>
            </div>
            <div className="rounded-12 border border-dashed border-border-muted p-4 opacity-80 sm:col-span-2">
              <Bot className="w-5 h-5 text-neutral-400 mb-2" />
              <h3 className="text-sm font-semibold text-accent-black">Agents</h3>
              <p className="mt-1 text-xs text-neutral-500">Agent builder UI arrives in F2 — use API/curl until then.</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2">
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <Link
                href={workspaceHomePath(workspaceId)}
                className="text-xs font-medium text-neutral-500 hover:text-accent-black py-2"
              >
                Skip for now
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {step < 3 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => finish("inbox")}>
                  Open inbox
                </Button>
                <Button type="button" onClick={() => finish("home")}>
                  Go to overview
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-400">
        Need this again?{" "}
        <Link href={onboardingPath(workspaceId)} className="text-heat-100 font-medium hover:underline">
          Reopen setup guide
        </Link>
      </p>
    </div>
  );
}
