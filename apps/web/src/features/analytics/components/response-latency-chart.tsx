import { formatExactNumber,formatSeconds,formatUtcFullDate } from "../lib/format";
import type { DailyLatencyPoint } from "../lib/types";
import { ChartCard } from "./chart-card";
import { ChartDataTable,type DataTableColumn } from "./chart-data-table";
import { LatencyLineChart } from "./charts/latency-line-chart";

interface ResponseLatencyChartProps {
  data: DailyLatencyPoint[];
  isLoading?: boolean;
}

const COLUMNS: DataTableColumn[] = [
  { key: "date", header: "Date" },
  { key: "p50", header: "P50 Median", align: "right" },
  { key: "p95", header: "P95 (95th %ile)", align: "right" },
  { key: "samples", header: "Measured Turns", align: "right" },
];

export function ResponseLatencyChart({
  data,
  isLoading = false,
}: ResponseLatencyChartProps) {
  const tableRows = data.map((d) => ({
    date: formatUtcFullDate(d.date),
    p50: formatSeconds(d.p50Ms),
    p95: formatSeconds(d.p95Ms),
    samples:
      d.sampleCount !== null && d.sampleCount !== undefined
        ? formatExactNumber(d.sampleCount)
        : "—",
  }));

  const legend = (
    <div className="flex items-center gap-4 text-[11px] font-medium text-neutral-500">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-heat-100 shrink-0" />
        <span>P50</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-0.5 border-t-2 border-dashed border-neutral-500 shrink-0" />
        <span>P95</span>
      </div>
    </div>
  );

  return (
    <ChartCard
      title="Response latency"
      description="Daily response time percentiles"
      headerRight={legend}
      footer="P50 is the median. P95 covers 95% of responses."
      isLoading={isLoading}
      dataTable={
        <ChartDataTable
          caption="Daily response time percentiles data table"
          columns={COLUMNS}
          rows={tableRows}
        />
      }
    >
      <LatencyLineChart data={data} />
    </ChartCard>
  );
}
