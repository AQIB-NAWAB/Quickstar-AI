import { InboxSidebar } from "@/features/inbox/components/inbox-sidebar";

type Props = {
  children: React.ReactNode;
  params: { workspaceId: string };
};

export default function InboxLayout({ children, params }: Props) {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-white">
      <InboxSidebar workspaceId={params.workspaceId} />
      <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
