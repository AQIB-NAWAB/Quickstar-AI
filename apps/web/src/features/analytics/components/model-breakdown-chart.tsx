import { formatExactNumber,formatPercentage } from "../lib/format";
import type { ModelUsageItem } from "../lib/types";
import { ChartCard } from "./chart-card";
import { ChartDataTable,type DataTableColumn } from "./chart-data-table";
import { DonutChart } from "./charts/donut-chart";

interface ModelBreakdownChartProps {
  models: ModelUsageItem[];
  totalTokens?: number;
  coverageNote?: string;
  isLoading?: boolean;
}

const COLUMNS: DataTableColumn[] = [
  { key: "model", header: "Model" },
  { key: "provider", header: "Provider" },
  { key: "tokens", header: "Tokens", align: "right" },
  { key: "share", header: "Share", align: "right" },
];

export function ModelBreakdownChart({
  models,
  totalTokens,
  coverageNote,
  isLoading = false,
}: ModelBreakdownChartProps) {
  const tableRows = models.map((m) => ({
    model: m.model,
    provider: m.provider,
    tokens: formatExactNumber(m.tokens),
    share: formatPercentage(m.percentage),
  }));

  return (
    <ChartCard
      title="Model breakdown"
      description="Token share by provider and model"
      isLoading={isLoading}
      dataTable={
        <ChartDataTable
          caption="Token breakdown by model and provider"
          columns={COLUMNS}
          rows={tableRows}
        />
      }
    >
      <DonutChart
        models={models}
        totalTokens={totalTokens}
        coverageNote={coverageNote}
      />
    </ChartCard>
  );
}
