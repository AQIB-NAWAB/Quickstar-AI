import { VoiceStatusBadge } from "../voice-status-badge";

interface CallMetadataCardProps {
  callId: string;
  conversationId?: string | null;
  direction?: string;
  disposition?: string;
}

export function CallMetadataCard({
  callId,
  conversationId,
  direction = "Inbound",
  disposition = "Completed",
}: CallMetadataCardProps) {
  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-3">
      <h2 className="text-xs font-bold text-accent-black">Call metadata</h2>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
            Call ID
          </span>
          <span className="font-mono text-accent-black font-semibold">{callId}</span>
        </div>

        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
            Conversation
          </span>
          <span className="font-mono text-neutral-700">
            {conversationId || "—"}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
            Direction
          </span>
          <span className="text-neutral-700 font-medium">{direction}</span>
        </div>

        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
            Disposition
          </span>
          <div className="pt-0.5">
            <VoiceStatusBadge status={disposition.toLowerCase()} />
          </div>
        </div>
      </div>
    </div>
  );
}
