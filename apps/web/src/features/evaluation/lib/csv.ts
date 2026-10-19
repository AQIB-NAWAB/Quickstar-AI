import type { EvaluationCase, ExpectedToolCall } from "./types";

export interface CsvRowError {
  row: number;
  message: string;
}

export interface CsvParseResult {
  validCases: Partial<EvaluationCase>[];
  errors: CsvRowError[];
  totalRows: number;
}

/**
 * RFC 4180 compliant CSV line tokenizer handling quotes, escaped quotes (""), and multiline fields.
 */
export function parseCsvRows(text: string): string[][] {
  let cleanText = text;
  // Strip UTF-8 BOM if present
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 2;
      } else if (char === '"') {
        inQuotes = false;
        i++;
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i += 2;
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

export function parseCsvRowsToObjects(fileContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const rawRows = parseCsvRows(fileContent);
  if (rawRows.length === 0) return { headers: [], rows: [] };
  const headers = rawRows[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (raw.length === 1 && raw[0] === "") continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) {
        obj[h] = raw[idx] ?? "";
      }
    });
    rows.push(obj);
  }
  return { headers: headers.filter(Boolean), rows };
}

export function parseEvaluationCasesJson(
  jsonText: string,
  datasetId: string,
): CsvParseResult {
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      return {
        validCases: [],
        errors: [{ row: 1, message: "JSON must be an array of case objects." }],
        totalRows: 0,
      };
    }

    const validCases: Partial<EvaluationCase>[] = [];
    const errors: CsvRowError[] = [];

    parsed.forEach((item, index) => {
      const rowNumber = index + 1;
      if (!item || typeof item !== "object") {
        errors.push({ row: rowNumber, message: "Item must be a JSON object." });
        return;
      }

      const input = String(item.input ?? item.user_message ?? item.message ?? "").trim();
      if (!input) {
        errors.push({ row: rowNumber, message: "input is required." });
        return;
      }

      const expectedOutput = String(
        item.expectedOutput ?? item.expected_output ?? item.expected_response ?? "",
      ).trim();
      const name = String(item.name ?? `Imported case ${rowNumber}`).trim();

      let expectedTools: ExpectedToolCall[] = [];
      const rawTools = item.expectedTools ?? item.expected_tools;
      if (Array.isArray(rawTools)) {
        expectedTools = rawTools.map((t: any) =>
          typeof t === "string" ? { name: t } : { name: t.name, arguments: t.arguments, order: t.order },
        );
      }

      const tags = Array.isArray(item.tags)
        ? item.tags.map(String)
        : typeof item.tags === "string"
          ? item.tags.split(/[;,]/).map((t: string) => t.trim())
          : [];

      validCases.push({
        datasetId,
        name,
        input,
        expectedOutput,
        expectedTools,
        tags,
      });
    });

    return {
      validCases,
      errors,
      totalRows: parsed.length,
    };
  } catch (err) {
    return {
      validCases: [],
      errors: [{ row: 1, message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}` }],
      totalRows: 0,
    };
  }
}
