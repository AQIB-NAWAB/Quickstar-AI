import type { LeadSummary } from "./types";

export interface CsvFieldGroupSelection {
  contact: boolean;
  intent: boolean;
  qualification: boolean;
  sentiment: boolean;
  status: boolean;
  tags: boolean;
  capturedAt: boolean;
}

export const DEFAULT_CSV_FIELD_SELECTION: CsvFieldGroupSelection = {
  contact: true,
  intent: true,
  qualification: true,
  sentiment: true,
  status: true,
  tags: true,
  capturedAt: true,
};

function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);

  // Spreadsheet formula injection protection:
  // If value starts with =, +, -, @, \t, or \r, prefix with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If cell contains commas, double quotes, or newlines, quote it and double inner quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateLeadsCsv(
  leads: LeadSummary[],
  selection: CsvFieldGroupSelection
): string {
  const headers: string[] = [];

  if (selection.contact) {
    headers.push("Name", "Email", "Phone");
  }
  if (selection.intent) {
    headers.push("Intent");
  }
  if (selection.qualification) {
    headers.push("Qualification Score", "Qualification Max");
  }
  if (selection.sentiment) {
    headers.push("Sentiment");
  }
  if (selection.status) {
    headers.push("Status");
  }
  if (selection.tags) {
    headers.push("Tags");
  }
  if (selection.capturedAt) {
    headers.push("Captured At (UTC)");
  }

  const rows: string[] = [headers.map(sanitizeCsvCell).join(",")];

  for (const lead of leads) {
    const rowCells: string[] = [];

    if (selection.contact) {
      rowCells.push(
        sanitizeCsvCell(lead.name),
        sanitizeCsvCell(lead.email),
        sanitizeCsvCell(lead.phone)
      );
    }
    if (selection.intent) {
      rowCells.push(sanitizeCsvCell(lead.intent));
    }
    if (selection.qualification) {
      rowCells.push(
        sanitizeCsvCell(lead.qualificationScore),
        sanitizeCsvCell(lead.qualificationMax)
      );
    }
    if (selection.sentiment) {
      rowCells.push(sanitizeCsvCell(lead.sentiment));
    }
    if (selection.status) {
      rowCells.push(sanitizeCsvCell(lead.status));
    }
    if (selection.tags) {
      rowCells.push(sanitizeCsvCell(lead.tags.join("; ")));
    }
    if (selection.capturedAt) {
      rowCells.push(sanitizeCsvCell(lead.capturedAt));
    }

    rows.push(rowCells.join(","));
  }

  return rows.join("\r\n");
}

export function triggerCsvDownload(csvContent: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
