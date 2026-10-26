import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { PhoneNumbersPanel } from "@/features/voice/components/phone-numbers-panel";

export const metadata = {
  title: "Phone Numbers — Voice — QuickStart AI",
  description: "Buy and route Telnyx phone numbers through LiveKit SIP for inbound calling.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceVoiceNumbersPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <PhoneNumbersPanel key={activeWorkspace.id} workspaceId={activeWorkspace.id} isPreview={false} />
    </div>
  );
}
