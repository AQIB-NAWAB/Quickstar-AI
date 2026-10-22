import { MessageSquare } from "lucide-react";

export function EmptyInboxState() {
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-8 bg-[#FAFBFC] text-center">
      <div className="flex flex-col items-center max-w-[420px]">
        <div className="mb-4 text-[#667085]">
          <MessageSquare className="w-10 h-10 stroke-[1.5]" />
        </div>
        <h2 className="text-[22px] font-semibold text-[#202125] tracking-tight">
          Select a conversation
        </h2>
        <p className="mt-2 text-[14px] text-[#667085] leading-relaxed">
          Choose a conversation from the inbox to read messages, review details, or take over from
          your agent.
        </p>
      </div>
    </div>
  );
}
