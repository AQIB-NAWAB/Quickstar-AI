type BadgeStyle = {
  label: string;
  className: string;
  dot: string;
  pulse?: boolean;
};

function campaignStyle(status: string): BadgeStyle {
  switch (status) {
    case "sending":
      return { label: "Sending", className: "bg-blue-50 text-blue-700", dot: "bg-blue-600", pulse: true };
    case "scheduled":
      return { label: "Scheduled", className: "bg-blue-50 text-blue-700", dot: "bg-blue-600" };
    case "completed":
      return { label: "Completed", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" };
    case "paused":
      return { label: "Paused", className: "bg-amber-50 text-amber-700", dot: "bg-amber-600" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-50 text-red-700", dot: "bg-red-600" };
    case "failed":
      return { label: "Failed", className: "bg-red-50 text-red-700", dot: "bg-red-600" };
    case "draft":
      return { label: "Draft", className: "bg-neutral-100 text-neutral-600", dot: "bg-neutral-500" };
    default:
      return {
        label: status,
        className: "bg-neutral-100 text-neutral-600 capitalize",
        dot: "bg-neutral-500",
      };
  }
}

function recipientStyle(status: string): BadgeStyle {
  switch (status) {
    case "sent":
      return { label: "Sent", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" };
    case "pending":
      return { label: "Pending", className: "bg-blue-50 text-blue-700", dot: "bg-blue-600" };
    case "retrying":
      return { label: "Retrying", className: "bg-amber-50 text-amber-700", dot: "bg-amber-600", pulse: true };
    case "suppressed":
      return { label: "Suppressed", className: "bg-red-50 text-red-700", dot: "bg-red-600" };
    case "failed":
      return { label: "Failed", className: "bg-red-50 text-red-700", dot: "bg-red-600" };
    case "opted_out":
      return { label: "Opted out", className: "bg-neutral-100 text-neutral-600", dot: "bg-neutral-500" };
    case "skipped":
      return { label: "Skipped", className: "bg-neutral-100 text-neutral-600", dot: "bg-neutral-500" };
    default:
      return {
        label: status,
        className: "bg-neutral-100 text-neutral-600 capitalize",
        dot: "bg-neutral-500",
      };
  }
}

export function EmailCampaignStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const style = campaignStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-tight whitespace-nowrap ${style.className} ${className}`}
    >
      <span className={`h-2 w-4 rounded-full ${style.dot}${style.pulse ? " animate-pulse" : ""}`} />
      {style.label}
    </span>
  );
}

export function EmailRecipientStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const style = recipientStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight whitespace-nowrap ${style.className} ${className}`}
    >
      <span className={`h-1.5 w-3 rounded-full ${style.dot}${style.pulse ? " animate-pulse" : ""}`} />
      {style.label}
    </span>
  );
}
