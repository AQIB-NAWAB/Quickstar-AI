import { clsx } from "clsx";
import type { ConversationState } from "@/features/inbox/lib/types";
import { stateLabel } from "@/features/inbox/lib/types";

const styles: Record<ConversationState, string> = {
  bot: "bg-neutral-100 text-neutral-700 border-neutral-200",
  waiting: "bg-amber-50 text-amber-900 border-amber-200",
  human: "bg-heat-12 text-heat-100 border-heat-24",
};

export function StateBadge({ state }: { state: ConversationState }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[state],
      )}
    >
      {stateLabel(state)}
    </span>
  );
}
