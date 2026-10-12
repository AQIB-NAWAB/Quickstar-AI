"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface DataTableColumn {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
}

interface ChartDataTableProps {
  caption: string;
  columns: DataTableColumn[];
  rows: Record<string, string | number>[];
}

export function ChartDataTable({
  caption,
  columns,
  rows,
}: ChartDataTableProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-3 border-t border-border-faint text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-accent-black transition-colors"
        aria-expanded={isOpen}
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
        <span>{isOpen ? "Hide data table" : "View data"}</span>
      </button>

      {isOpen && (
        <div className="mt-3 max-h-56 overflow-auto border border-border-faint rounded-8">
          <table className="w-full text-left border-collapse text-[11px]">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-neutral-50 sticky top-0 z-10 border-b border-border-faint text-neutral-600 font-semibold">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`py-2 px-3 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint bg-white font-mono text-neutral-700">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-neutral-50/50">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-1.5 px-3 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
