import { formatExactNumber,formatHourIntervalUtc } from "../lib/format";
import type { HourlyConversationPoint } from "../lib/types";
import { ChartCard } from "./chart-card";
import { ChartDataTable,type DataTableColumn } from "./chart-data-table";
import { HourlyBars } from "./charts/hourly-bars";

interface PeakActivityChartProps {
  data: HourlyConversationPoint[];
  isLoading?: boolean;
}

const COLUMNS: DataTableColumn[] = [
  { key: "hour", header: "Hour Interval (UTC)" },
  { key: "conversations", header: "Conversation Starts", align: "right" },
];

export function PeakActivityChart({
  data,
  isLoading = false,
}: PeakActivityChartProps) {
  // Find busiest hour
  let busiestHour = 0;
  let maxConvs = -1;
  data.forEach((d) => {
    if (d.conversations > maxConvs) {
      maxConvs = d.conversations;
      busiestHour = d.hour;
    }
  });

  const tableRows = data.map((d) => ({
    hour: formatHourIntervalUtc(d.hour),
    conversations: formatExactNumber(d.conversations),
  }));

  const footer = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-neutral-400">
      <span>
        {maxConvs <= 0
          ? "No activity in this period"
          : `Busiest hour: ${formatHourIntervalUtc(busiestHour)}`}
      </span>
      <span>Hourly totals across the selected period.</span>
    </div>
  );

  return (
    <ChartCard
      title="Peak activity hours"
      description="Conversation starts by hour · UTC"
      footer={footer}
      isLoading={isLoading}
      dataTable={
        <ChartDataTable
          caption="Hourly conversation starts across selected period"
          columns={COLUMNS}
          rows={tableRows}
        />
      }
    >
      <HourlyBars data={data} />
    </ChartCard>
  );
}
