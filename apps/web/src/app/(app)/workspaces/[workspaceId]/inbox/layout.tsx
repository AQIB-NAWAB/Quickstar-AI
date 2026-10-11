import { InboxSidebar } from "@/features/inbox/components/inbox-sidebar";

type Props = {
  children: React.ReactNode;
  params: { workspaceId: string };
};

export default function InboxLayout({ children, params }: Props) {
  return (
    <div className="-m-4 md:-m-6 flex h-[calc(100dvh-4rem)] min-h-[480px] overflow-hidden bg-background-base">
      <InboxSidebar workspaceId={params.workspaceId} />
      <div className="flex flex-1 min-w-0 min-h-0 flex-col">{children}</div>
    </div>
  );
}
