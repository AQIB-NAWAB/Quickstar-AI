import type { AuditEntry } from "./types";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Spreadsheet formula injection protection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateAuditCsv(entries: AuditEntry[]): string {
  const headers = [
    "Entry ID",
    "Actor ID",
    "Actor Type",
    "Actor Name",
    "Action",
    "Resource Type",
    "Resource ID",
    "Resource Name",
    "Timestamp UTC",
    "Request ID",
  ];

  const rows = entries.map((e) => [
    escapeCsvField(e.id),
    escapeCsvField(e.actor.id),
    escapeCsvField(e.actor.type),
    escapeCsvField(e.actor.name),
    escapeCsvField(e.action),
    escapeCsvField(e.resource.type),
    escapeCsvField(e.resource.id),
    escapeCsvField(e.resource.name),
    escapeCsvField(e.occurredAt),
    escapeCsvField(e.requestId || ""),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}
