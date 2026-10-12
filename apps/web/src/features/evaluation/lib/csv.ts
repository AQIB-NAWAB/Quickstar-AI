import type { EvaluationCase } from "./types";

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
function parseCsvRows(text: string): string[][] {
  // Strip UTF-8 BOM if present
  let cleanText = text;
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
        // Escaped quote
        currentField += '"';
        i += 2;
      } else if (char === '"') {
        // Closing quote
        inQuotes = false;
        i++;
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Opening quote
        inQuotes = true;
        i++;
      } else if (char === ",") {
        // Field delimiter
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
      } else if (char === "\r" && nextChar === "\n") {
        // CRLF line break
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i += 2;
      } else if (char === "\n") {
        // LF line break
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

  // Push remaining field & row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

export function parseEvaluationCasesCsv(
  csvText: string,
  datasetId: string,
  columnMapping: {
    input: string;
    expectedOutput: string;
    expectedTools: string;
    caseName?: string;
  }
): CsvParseResult {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      validCases: [],
      errors: [{ row: 1, message: "CSV file is empty or missing data rows." }],
      totalRows: 0,
    };
  }

  const headers = rows[0].map((h) => h.toLowerCase());
  const inputIdx = headers.indexOf(columnMapping.input.toLowerCase());
  const outputIdx = headers.indexOf(columnMapping.expectedOutput.toLowerCase());
  const toolsIdx = headers.indexOf(columnMapping.expectedTools.toLowerCase());
  const nameIdx = columnMapping.caseName
    ? headers.indexOf(columnMapping.caseName.toLowerCase())
    : -1;

  if (inputIdx === -1) {
    return {
      validCases: [],
      errors: [{ row: 1, message: `Mapped input column "${columnMapping.input}" not found in headers.` }],
      totalRows: rows.length - 1,
    };
  }

  const validCases: Partial<EvaluationCase>[] = [];
  const errors: CsvRowError[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip empty lines
    if (row.length === 1 && row[0] === "") continue;

    const rowNumber = r + 1;
    const input = row[inputIdx] || "";
    const expectedOutput = outputIdx !== -1 ? row[outputIdx] || "" : "";
    const toolsRaw = toolsIdx !== -1 ? row[toolsIdx] || "" : "";
    const caseName = nameIdx !== -1 ? row[nameIdx] || "" : `Case ${r}`;

    if (!input.trim()) {
      errors.push({ row: rowNumber, message: "Input prompt is required." });
      continue;
    }

    let parsedTools: string[] = [];
    if (toolsRaw.trim()) {
      try {
        const parsed = JSON.parse(toolsRaw);
        if (Array.isArray(parsed) && parsed.every((t) => typeof t === "string")) {
          parsedTools = parsed;
        } else {
          errors.push({
            row: rowNumber,
            message: `expected_tools must be a valid JSON array of strings e.g. ["tool_name"]. Got: ${toolsRaw}`,
          });
          continue;
        }
      } catch {
        errors.push({
          row: rowNumber,
          message: `expected_tools JSON syntax error. Got: ${toolsRaw}`,
        });
        continue;
      }
    }

    validCases.push({
      datasetId,
      name: caseName.trim(),
      input: input.trim(),
      expectedOutput: expectedOutput.trim(),
      expectedTools: parsedTools,
    });
  }

  return {
    validCases,
    errors,
    totalRows: rows.length - 1,
  };
}
