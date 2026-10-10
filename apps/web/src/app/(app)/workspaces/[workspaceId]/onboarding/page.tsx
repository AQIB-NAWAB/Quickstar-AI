import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loadWorkspaceShell } from "@/lib/auth/session";

type Props = { params: { workspaceId: string } };

export default async function OnboardingPage({ params }: Props) {
  const { me, activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <Suspense fallback={<div className="text-sm text-neutral-500">Loading setup…</div>}>
      <OnboardingWizard
        workspaceId={activeWorkspace.id}
        workspaceName={activeWorkspace.name}
        userEmail={me.user.email}
      />
    </Suspense>
  );
}
