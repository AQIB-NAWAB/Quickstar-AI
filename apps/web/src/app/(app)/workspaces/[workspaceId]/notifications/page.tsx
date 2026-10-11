import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { NotificationCenter } from "@/features/notifications/components/notification-center";

export const metadata = {
  title: "Notification Center — QuickStart AI",
  description: "View workspace alerts, events, and notifications.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceNotificationsPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <NotificationCenter
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
