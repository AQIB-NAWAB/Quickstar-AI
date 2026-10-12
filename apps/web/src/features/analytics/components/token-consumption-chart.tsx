import { formatExactNumber,formatUtcFullDate } from "../lib/format";
import type { DailyTokensPoint } from "../lib/types";
import { ChartCard } from "./chart-card";
import { ChartDataTable,type DataTableColumn } from "./chart-data-table";
import { StackedBars } from "./charts/stacked-bars";

interface TokenConsumptionChartProps {
  data: DailyTokensPoint[];
  isLoading?: boolean;
}

const COLUMNS: DataTableColumn[] = [
  { key: "date", header: "Date" },
  { key: "input", header: "Input Tokens", align: "right" },
  { key: "output", header: "Output Tokens", align: "right" },
  { key: "total", header: "Total Tokens", align: "right" },
];

export function TokenConsumptionChart({
  data,
  isLoading = false,
}: TokenConsumptionChartProps) {
  const tableRows = data.map((d) => ({
    date: formatUtcFullDate(d.date),
    input: formatExactNumber(d.inputTokens),
    output: formatExactNumber(d.outputTokens),
    total: formatExactNumber(d.totalTokens),
  }));

  const legend = (
    <div className="flex items-center gap-4 text-[11px] font-medium text-neutral-500">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-heat-100 shrink-0" />
        <span>Input</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 shrink-0" />
        <span>Output</span>
      </div>
    </div>
  );

  return (
    <ChartCard
      title="Token consumption"
      description="Input and output tokens by day"
      headerRight={legend}
      isLoading={isLoading}
      dataTable={
        <ChartDataTable
          caption="Daily token consumption data table"
          columns={COLUMNS}
          rows={tableRows}
        />
      }
    >
      <StackedBars data={data} />
    </ChartCard>
  );
}
