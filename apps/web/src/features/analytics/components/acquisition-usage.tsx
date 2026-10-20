import { Phone } from "lucide-react";
import { formatExactNumber } from "../lib/format";
import type { AcquisitionUsageItem } from "../lib/types";
import { ChartCard } from "./chart-card";
import { ChartDataTable,type DataTableColumn } from "./chart-data-table";

interface AcquisitionUsageProps {
  acquisitions: AcquisitionUsageItem[];
  totalBillableActions?: number;
  voiceMinutes?: number | null;
  voiceCalls?: number | null;
  isLoading?: boolean;
}

const COLUMNS: DataTableColumn[] = [
  { key: "action", header: "Action Type" },
  { key: "units", header: "Billable Actions", align: "right" },
];

export function AcquisitionUsage({
  acquisitions,
  totalBillableActions: propTotal,
  voiceMinutes,
  voiceCalls,
  isLoading = false,
}: AcquisitionUsageProps) {
  const total =
    propTotal ?? acquisitions.reduce((sum, item) => sum + item.billableUnits, 0);

  const maxUnits = Math.max(...acquisitions.map((a) => a.billableUnits), 1);

  const tableRows = acquisitions.map((a) => ({
    action: a.label,
    units: formatExactNumber(a.billableUnits),
  }));

  const footer = (
    <div className="space-y-3 pt-1">
      {/* Total billable actions row */}
      <div className="flex items-center justify-between text-xs font-semibold text-accent-black">
        <span>Total billable actions</span>
        <span className="font-mono tabular-nums">{formatExactNumber(total)}</span>
      </div>

      {/* Voice usage subline */}
      <div className="flex items-center gap-2 text-[11px] text-neutral-500 pt-2 border-t border-border-faint">
        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
        <span>
          {voiceMinutes !== null && voiceMinutes !== undefined
            ? voiceCalls !== null && voiceCalls !== undefined
              ? `Voice usage: ${formatExactNumber(voiceMinutes)} minutes across ${formatExactNumber(voiceCalls)} calls`
              : `Voice usage: ${formatExactNumber(voiceMinutes)} minutes`
            : "Voice usage: —"}
        </span>
      </div>
    </div>
  );

  return (
    <ChartCard
      title="Acquisition usage"
      description="Billable actions by type"
      footer={footer}
      isLoading={isLoading}
      dataTable={
        <ChartDataTable
          caption="Billable acquisition usage breakdown"
          columns={COLUMNS}
          rows={tableRows}
        />
      }
    >
      <div className="space-y-3 py-1">
        {acquisitions.map((item) => {
          const ratio = Math.max(0, Math.min(1, item.billableUnits / maxUnits));
          const widthPct = Math.max(3, ratio * 100);

          return (
            <div key={item.action} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-600">{item.label}</span>
                <span className="font-mono text-neutral-500 tabular-nums">
                  {formatExactNumber(item.billableUnits)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-heat-100 rounded-full transition-all duration-300"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}

        {acquisitions.length === 0 && (
          <div className="h-[120px] flex items-center justify-center text-xs text-neutral-400">
            No billable acquisition actions in this period.
          </div>
        )}
      </div>
    </ChartCard>
  );
}
