import type { AudienceFieldRole, ColumnMapping } from "./types";
import { normalizePhone } from "./format";

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export function slugifyHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "field";
}

export function guessRole(header: string): AudienceFieldRole {
  const h = header.toLowerCase();
  if (h.includes("phone") || h.includes("mobile") || h.includes("msisdn") || h === "tel") {
    return "dial";
  }
  if (h.includes("email") || h.includes("e-mail")) {
    return "contact_email";
  }
  if (
    h === "name" ||
    h.includes("full_name") ||
    h.includes("firstname") ||
    h.includes("first_name") ||
    h.includes("lastname") ||
    h.includes("last_name") ||
    h.includes("contact_name")
  ) {
    return "identity";
  }
  return "custom";
}

export function buildDefaultMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedKeys = new Set<string>();
  let dialAssigned = false;
  let identityAssigned = false;
  let emailAssigned = false;

  for (const header of headers) {
    let role = guessRole(header);
    if (role === "dial" && dialAssigned) role = "custom";
    if (role === "identity" && identityAssigned) role = "custom";
    if (role === "contact_email" && emailAssigned) role = "custom";

    let key = slugifyHeader(header);
    if (role === "dial") key = "phone";
    if (role === "identity") key = "name";
    if (role === "contact_email") key = "email";

    let unique = key;
    let i = 2;
    while (usedKeys.has(unique)) {
      unique = `${key}_${i++}`;
    }
    usedKeys.add(unique);

    if (role === "dial") dialAssigned = true;
    if (role === "identity") identityAssigned = true;
    if (role === "contact_email") emailAssigned = true;

    mappings.push({ sourceColumn: header, key: unique, role });
  }

  if (!dialAssigned && headers.length > 0) {
    mappings[0] = { ...mappings[0], role: "dial", key: "phone" };
  }

  return mappings;
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
 * - Dial role column is required and must match international E.164
 * - Checks for duplicates by normalized phone
 * - All other mapped columns become flexible attributes
 */
export function validateAudienceRows(
  rows: Record<string, string>[],
  phoneColumn: string,
  _nameColumn?: string,
  _emailColumn?: string,
): ValidationSummary {
  void _nameColumn;
  void _emailColumn;
  return validateAudienceWithMappings(rows, [
    { sourceColumn: phoneColumn, key: "phone", role: "dial" },
  ]);
}

export type PreparedAudienceRow = {
  phone: string;
  name?: string | null;
  email?: string | null;
  attributes: Record<string, string>;
  raw: Record<string, string>;
};

export type AudienceValidationOptions = {
  telephonyMode?: "required" | "none";
};

function isLooseEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateAudienceWithMappings(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  options?: AudienceValidationOptions,
): ValidationSummary & { prepared: PreparedAudienceRow[] } {
  const telephonyRequired = options?.telephonyMode !== "none";
  const dial = mappings.find((m) => m.role === "dial");
  const identity = mappings.find((m) => m.role === "identity");
  const emailMap = mappings.find((m) => m.role === "contact_email");

  const validRows: Record<string, string>[] = [];
  const prepared: PreparedAudienceRow[] = [];
  const invalidRows: { rowNumber: number; reason: string; raw: Record<string, string> }[] = [];
  const duplicateRows: { rowNumber: number; phone: string; raw: Record<string, string> }[] = [];
  const seenKeys = new Set<string>();

  if (telephonyRequired && !dial) {
    return {
      validRows: [],
      invalidRows: rows.map((raw, idx) => ({
        rowNumber: idx + 2,
        reason: "No dial (phone) column mapped",
        raw,
      })),
      duplicateRows: [],
      validCount: 0,
      invalidCount: rows.length,
      duplicateCount: 0,
      prepared: [],
    };
  }

  if (!telephonyRequired && !identity && !emailMap) {
    return {
      validRows: [],
      invalidRows: rows.map((raw, idx) => ({
        rowNumber: idx + 2,
        reason: "Map a name or email column for audience-only campaigns",
        raw,
      })),
      duplicateRows: [],
      validCount: 0,
      invalidCount: rows.length,
      duplicateCount: 0,
      prepared: [],
    };
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const rawPhone = dial ? row[dial.sourceColumn]?.trim() || "" : "";
    const name = identity ? row[identity.sourceColumn]?.trim() || "" : "";
    const email = emailMap ? row[emailMap.sourceColumn]?.trim() || "" : "";

    let normalized = "";
    if (rawPhone) {
      normalized = normalizePhone(rawPhone);
      const isValidE164 = /^\+[1-9]\d{6,14}$/.test(normalized);
      if (!isValidE164) {
        if (telephonyRequired) {
          invalidRows.push({
            rowNumber: rowNum,
            reason: `Invalid international phone format: "${rawPhone}". Must include country code starting with +`,
            raw: row,
          });
          return;
        }
        normalized = "";
      }
    } else if (telephonyRequired) {
      invalidRows.push({ rowNumber: rowNum, reason: "Missing phone number", raw: row });
      return;
    }

    if (!telephonyRequired && !normalized && !name && !isLooseEmail(email)) {
      invalidRows.push({
        rowNumber: rowNum,
        reason: "Each row needs a name or email when telephony is off",
        raw: row,
      });
      return;
    }

    const dedupeKey = normalized || email.toLowerCase() || name.toLowerCase();
    if (seenKeys.has(dedupeKey)) {
      duplicateRows.push({
        rowNumber: rowNum,
        phone: normalized || dedupeKey,
        raw: row,
      });
      return;
    }

    seenKeys.add(dedupeKey);
    validRows.push(row);

    const attributes: Record<string, string> = {};
    for (const m of mappings) {
      if (m.role === "dial") continue;
      const value = row[m.sourceColumn]?.trim() ?? "";
      if (value) attributes[m.key] = value;
    }
    if (!telephonyRequired && !normalized) {
      attributes.telephony_mode = "none";
    }

    prepared.push({
      phone: normalized,
      name: name || null,
      email: email || null,
      attributes,
      raw: row,
    });
  });

  return {
    validRows,
    invalidRows,
    duplicateRows,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    duplicateCount: duplicateRows.length,
    prepared,
  };
}
