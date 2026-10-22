import React from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  headerRight?: React.ReactNode;
  legend?: { label: string; color: string }[];
  footer?: React.ReactNode;
  children: React.ReactNode;
  dataTable?: React.ReactNode;
  isLoading?: boolean;
}

export function ChartCard({
  title,
  description,
  headerRight,
  legend,
  footer,
  children,
  dataTable,
  isLoading = false,
}: ChartCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-4 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-32 bg-neutral-100 rounded" />
            <div className="h-3 w-48 bg-neutral-100 rounded" />
          </div>
          <div className="h-4 w-16 bg-neutral-100 rounded" />
        </div>
        <div className="h-[180px] bg-neutral-50 rounded-8" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 p-4 flex flex-col justify-between space-y-3">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-accent-black tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-neutral-400">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {legend && (
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              {legend.map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          )}
          {headerRight && <div>{headerRight}</div>}
        </div>
      </div>

      {/* Chart Plotting Area */}
      <div className="w-full min-w-0">
        {children}
      </div>

      {/* Optional Card Footer */}
      {footer && (
        <div className="text-[11px] text-neutral-400 pt-1 border-t border-border-faint">
          {footer}
        </div>
      )}

      {/* Optional Accessible Data Table */}
      {dataTable}
    </div>
  );
}
