import { normalizePhone } from "./format";

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface ValidationSummary {
  validRows: Record<string, string>[];
  invalidRows: { rowNumber: number; reason: string; raw: Record<string, string> }[];
  duplicateRows: { rowNumber: number; phone: string; raw: Record<string, string> }[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
}

/**
 * Standard RFC 4180 compliant CSV parser that handles:
 * - UTF-8 BOM
 * - CRLF and LF
 * - Quoted fields with escaped quotes ("")
 * - Commas and newlines inside quotes
 * - Trailing whitespace and empty lines
 */
export function parseCsvText(text: string): ParsedCsvResult {
  // Strip BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];
    const nextChar = i + 1 < len ? cleanText[i + 1] : "";

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (nextChar === "\n") {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push last remaining field and row
  if (currentField.length > 0 || inQuotes) {
    currentRow.push(currentField.trim());
  }
  if (currentRow.some((f) => f.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // First row is headers
  const rawHeaders = rows[0].map((h, idx) => h || `Column_${idx + 1}`);
  // Deduplicate headers if any duplicates
  const headerCount: Record<string, number> = {};
  const headers = rawHeaders.map((h) => {
    headerCount[h] = (headerCount[h] || 0) + 1;
    return headerCount[h] > 1 ? `${h}_${headerCount[h]}` : h;
  });

  const parsedDataRows: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip empty lines
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = row[c] ?? "";
    }
    parsedDataRows.push(rowObj);
  }

  return {
    headers,
    rows: parsedDataRows,
    totalRows: parsedDataRows.length,
  };
}

/**
 * Validates parsed CSV rows against column mappings:
 * - Phone is required and must match international format
 * - Checks for duplicates by normalized phone
 */
export function validateAudienceRows(
  rows: Record<string, string>[],
  phoneColumn: string,
  _nameColumn?: string,
  _emailColumn?: string
): ValidationSummary {
    void _nameColumn;
    void _emailColumn;
  const validRows: Record<string, string>[] = [];
  const invalidRows: { rowNumber: number; reason: string; raw: Record<string, string> }[] = [];
  const duplicateRows: { rowNumber: number; phone: string; raw: Record<string, string> }[] = [];
  const seenPhones = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for 1-based, +1 for header
    const rawPhone = row[phoneColumn]?.trim() || "";

    if (!rawPhone) {
      invalidRows.push({
        rowNumber: rowNum,
        reason: "Missing phone number",
        raw: row,
      });
      return;
    }

    const normalized = normalizePhone(rawPhone);
    // International E.164 check: starts with +, at least 7 digits, max 15 digits
    const isValidE164 = /^\+[1-9]\d{6,14}$/.test(normalized);

    if (!isValidE164) {
      invalidRows.push({
        rowNumber: rowNum,
        reason: `Invalid international phone format: "${rawPhone}". Must include country code starting with +`,
        raw: row,
      });
      return;
    }

    if (seenPhones.has(normalized)) {
      duplicateRows.push({
        rowNumber: rowNum,
        phone: normalized,
        raw: row,
      });
      return;
    }

    seenPhones.add(normalized);
    validRows.push(row);
  });

  return {
    validRows,
    invalidRows,
    duplicateRows,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    duplicateCount: duplicateRows.length,
  };
}
