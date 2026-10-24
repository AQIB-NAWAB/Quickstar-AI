import { formatExactNumber,formatUtcFullDate } from "../lib/format";
import type { DailyConversationPoint } from "../lib/types";
import { ChartCard } from "./chart-card";
import { ChartDataTable,type DataTableColumn } from "./chart-data-table";
import { LineChart } from "./charts/line-chart";

interface ConversationVolumeChartProps {
  data: DailyConversationPoint[];
  isLoading?: boolean;
}

const COLUMNS: DataTableColumn[] = [
  { key: "date", header: "Date" },
  { key: "conversations", header: "Conversations Started", align: "right" },
];

export function ConversationVolumeChart({
  data,
  isLoading = false,
}: ConversationVolumeChartProps) {
  const tableRows = data.map((d) => ({
    date: formatUtcFullDate(d.date),
    conversations: formatExactNumber(d.conversations),
  }));

  return (
    <ChartCard
      title="Conversation volume"
      description="New conversations per day"
      isLoading={isLoading}
      dataTable={
        <ChartDataTable
          caption="Daily conversation volume data table"
          columns={COLUMNS}
          rows={tableRows}
        />
      }
    >
      <LineChart data={data} />
    </ChartCard>
  );
}
