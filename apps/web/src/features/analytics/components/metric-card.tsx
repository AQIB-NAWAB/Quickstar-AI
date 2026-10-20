import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subline: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export function MetricCard({
  label,
  value,
  subline,
  icon: Icon,
  isLoading = false,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-4 h-[108px] flex flex-col justify-between animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-neutral-100 rounded" />
          <div className="w-4 h-4 bg-neutral-100 rounded" />
        </div>
        <div className="h-6 w-24 bg-neutral-100 rounded" />
        <div className="h-3 w-32 bg-neutral-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 p-4 min-h-[108px] flex flex-col justify-between hover:border-neutral-300 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-medium text-neutral-500">
          {label}
        </span>
        <Icon className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
      </div>

      <div className="my-1">
        <span className="text-2xl font-bold tracking-tight text-accent-black tabular-nums block">
          {value}
        </span>
      </div>

      <div className="text-[11px] text-neutral-500 truncate">
        {subline}
      </div>
    </div>
  );
}
