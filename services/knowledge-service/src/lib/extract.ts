import { inflateRawSync, inflateSync } from "node:zlib";
import { AppError, ErrorCode } from "@quickstart/errors";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB
export const MAX_EXTRACTED_CHARACTERS = 1_000_000;
export const MAX_UNCOMPRESSED_ZIP_BYTES = 50 * 1024 * 1024; // 50 MiB zip bomb protection

export type SupportedFileExtension = ".pdf" | ".txt" | ".md" | ".docx";

export interface ExtractionResult {
  text: string;
  charCount: number;
  detectedFormat: "txt" | "md" | "pdf" | "docx";
  ocrApplied?: boolean;
}

export interface OcrEngine {
  isAvailable(): Promise<boolean>;
  recognizeText(buffer: Buffer, mimeType?: string): Promise<string>;
}

export class TesseractOcrAdapter implements OcrEngine {
  private readonly enabled: boolean;

  constructor(options?: { enabled?: boolean }) {
    this.enabled =
      options?.enabled ??
      (process.env.TESSERACT_ENABLED === "true" || process.env.ENABLE_OCR === "true");
  }

  async isAvailable(): Promise<boolean> {
    return this.enabled;
  }

  async recognizeText(_buffer: Buffer, _mimeType?: string): Promise<string> {
    if (!this.enabled) return "";
    return "";
  }
}

export type ExtractDocumentInput =
  | {
      buffer: Buffer;
      filename?: string;
      fileName?: string;
      mimeType?: string;
    }
  | Buffer;

export type ExtractDocumentOptions = {
  ocrEngine?: OcrEngine;
};

/**
 * Validates file headers, format consistency, bounds, and extracts normalized text.
 */
export async function extractDocumentText(
  fileBufferOrOpts: ExtractDocumentInput,
  fileName?: string,
  _declaredMimeType?: string,
  options?: ExtractDocumentOptions,
): Promise<ExtractionResult> {
  let fileBuffer: Buffer;
  let resolvedFileName: string;

  if (Buffer.isBuffer(fileBufferOrOpts)) {
    fileBuffer = fileBufferOrOpts;
    resolvedFileName = fileName || "document.bin";
  } else {
    fileBuffer = fileBufferOrOpts.buffer;
    resolvedFileName = fileBufferOrOpts.filename || fileBufferOrOpts.fileName || fileName || "document.bin";
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Uploaded file is empty",
    });
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new AppError({
      code: "FILE_TOO_LARGE" as any,
      message: `File size exceeds the 25 MB limit (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB)`,
    });
  }

  const ext = getNormalizedExtension(resolvedFileName);
  if (!ext) {
    throw new AppError({
      code: "UNSUPPORTED_FILE_TYPE" as any,
      message: "Unsupported file type. Allowed formats: .pdf, .txt, .md, .docx",
    });
  }

  let extractedText: string;
  let detectedFormat: "txt" | "md" | "pdf" | "docx";

  switch (ext) {
    case ".txt":
    case ".md": {
      detectedFormat = ext === ".md" ? "md" : "txt";
      extractedText = extractPlainText(fileBuffer);
      break;
    }
    case ".docx": {
      detectedFormat = "docx";
      extractedText = extractDocxText(fileBuffer);
      break;
    }
    case ".pdf": {
      detectedFormat = "pdf";
      extractedText = extractPdfText(fileBuffer);
      break;
    }
    default:
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Unsupported file extension: ${ext}`,
      });
  }

  // Normalize line endings
  extractedText = extractedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  let ocrApplied = false;
  if (!extractedText && options?.ocrEngine) {
    if (await options.ocrEngine.isAvailable()) {
      const ocrResult = await options.ocrEngine.recognizeText(fileBuffer, _declaredMimeType);
      if (ocrResult && ocrResult.trim()) {
        extractedText = ocrResult.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
        ocrApplied = true;
      }
    }
  }

  if (!extractedText) {
    if (detectedFormat === "pdf") {
      throw new AppError({
        code: "NO_EXTRACTABLE_TEXT" as any,
        message: "Text extraction failed: No extractable text found. Scanned or image-only documents require OCR.",
      });
    }
    throw new AppError({
      code: "NO_EXTRACTABLE_TEXT" as any,
      message: "Text extraction failed: Document contains no text content",
    });
  }

  if (extractedText.length > MAX_EXTRACTED_CHARACTERS) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Extracted text exceeds the maximum limit of ${MAX_EXTRACTED_CHARACTERS.toLocaleString()} characters`,
    });
  }

  return {
    text: extractedText,
    charCount: extractedText.length,
    detectedFormat,
    ocrApplied,
  };
}

function getNormalizedExtension(fileName: string): SupportedFileExtension | null {
  const lower = fileName.toLowerCase().trim();
  if (lower.endsWith(".pdf")) return ".pdf";
  if (lower.endsWith(".docx")) return ".docx";
  if (lower.endsWith(".txt")) return ".txt";
  if (lower.endsWith(".md")) return ".md";
  return null;
}

function extractPlainText(buffer: Buffer): string {
  // Reject binary files disguised as text
  let nullCount = 0;
  const checkLen = Math.min(buffer.length, 4096);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) nullCount++;
  }
  if (nullCount > 2) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "File contains invalid binary data and cannot be parsed as text",
    });
  }

  let text = buffer.toString("utf8");
  // Strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

/**
 * Extracts text from DOCX (PKZip format containing word/document.xml).
 * Strictly guards against zip bombs, invalid archives, and ignores macros.
 */
export function extractDocxText(buffer: Buffer): string {
  // PKZip magic bytes: 'PK\x03\x04'
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new AppError({
      code: "INVALID_DOCX" as any,
      message: "Text extraction failed: Invalid DOCX file header",
    });
  }

  const entries = parseZipEntries(buffer);
  const docEntry = entries.find(
    (e) => e.name.toLowerCase() === "word/document.xml" || e.name.toLowerCase() === "word/document2.xml",
  );

  if (!docEntry) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Text extraction failed: Invalid DOCX archive (missing word/document.xml)",
    });
  }

  const xmlBuffer = decompressZipEntry(buffer, docEntry);
  const xmlString = xmlBuffer.toString("utf8");

  return parseWordXml(xmlString);
}

interface ZipLocalEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  dataOffset: number;
}

function parseZipEntries(buffer: Buffer): ZipLocalEntry[] {
  const entries: ZipLocalEntry[] = [];
  let offset = 0;
  let totalUncompressedSize = 0;
  const maxEntries = 500; // Bound entry count to avoid resource exhaustion

  while (offset + 30 <= buffer.length && entries.length < maxEntries) {
    // Check local file header signature 0x04034b50 ('PK\x03\x04')
    if (
      buffer[offset] !== 0x50 ||
      buffer[offset + 1] !== 0x4b ||
      buffer[offset + 2] !== 0x03 ||
      buffer[offset + 3] !== 0x04
    ) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);

    totalUncompressedSize += uncompressedSize;
    if (totalUncompressedSize > MAX_UNCOMPRESSED_ZIP_BYTES) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Text extraction failed: DOCX archive exceeds uncompressed safety limit",
      });
    }

    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) break;

    const name = buffer.toString("utf8", nameStart, nameEnd);
    const dataOffset = nameEnd + extraLength;

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      dataOffset,
    });

    // Advance offset
    offset = dataOffset + compressedSize;
  }

  return entries;
}

function decompressZipEntry(buffer: Buffer, entry: ZipLocalEntry): Buffer {
  const end = entry.dataOffset + entry.compressedSize;
  if (end > buffer.length) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Text extraction failed: Corrupted DOCX entry data",
    });
  }

  const slice = buffer.subarray(entry.dataOffset, end);

  if (entry.compressionMethod === 0) {
    // Stored (no compression)
    return slice;
  } else if (entry.compressionMethod === 8) {
    // Deflate
    try {
      return inflateRawSync(slice);
    } catch {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Text extraction failed: Failed to decompress DOCX contents",
      });
    }
  }

  throw new AppError({
    code: ErrorCode.VALIDATION_FAILED,
    message: `Text extraction failed: Unsupported compression method (${entry.compressionMethod}) in DOCX`,
  });
}

function parseWordXml(xml: string): string {
  const paragraphs: string[] = [];
  // Match paragraphs <w:p>...</w:p>
  const paraRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let paraMatch: RegExpExecArray | null;

  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const paraContent = paraMatch[1];
    const textPieces: string[] = [];

    // Match text nodes <w:t>...</w:t>
    const textRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let textMatch: RegExpExecArray | null;

    while ((textMatch = textRegex.exec(paraContent)) !== null) {
      textPieces.push(decodeXmlEntities(textMatch[1]));
    }

    const combined = textPieces.join("").trim();
    if (combined) {
      paragraphs.push(combined);
    }
  }

  return paragraphs.join("\n\n");
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Extracts text from PDF documents.
 * Rejects encrypted files, image-only scanned files, and corrupted streams.
 */
export function extractPdfText(buffer: Buffer): string {
  // Check PDF header '%PDF-'
  const header = buffer.subarray(0, 8).toString("latin1");
  if (!header.startsWith("%PDF-")) {
    throw new AppError({
      code: "INVALID_PDF" as any,
      message: "Text extraction failed: Invalid PDF header",
    });
  }

  const rawLatin = buffer.toString("latin1");

  // Check for encryption dictionary (/Encrypt)
  if (/\/Encrypt\s+\d+\s+\d+\s+R/i.test(rawLatin) || /\/Encrypt\s*<</i.test(rawLatin)) {
    throw new AppError({
      code: "PDF_ENCRYPTED" as any,
      message: "Text extraction failed: Password-protected or encrypted PDF documents are not supported",
    });
  }

  const extractedBlocks: string[] = [];

  // Match objects containing streams
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamRegex.exec(rawLatin)) !== null) {
    const streamStart = streamMatch.index + streamMatch[0].indexOf("stream") + 6;
    // Skip any trailing \r or \n
    let actualStart = streamStart;
    if (buffer[actualStart] === 0x0d) actualStart++;
    if (buffer[actualStart] === 0x0a) actualStart++;

    const streamRaw = streamMatch[1];
    const streamLen = streamRaw.length;
    const streamBuf = buffer.subarray(actualStart, actualStart + streamLen);

    // Look for previous dictionary to see if FlateDecode
    const dictStart = Math.max(0, streamMatch.index - 300);
    const dictSlice = rawLatin.slice(dictStart, streamMatch.index);
    const isFlate = /Filter\s*(\/FlateDecode|\[\s*\/FlateDecode\s*\])/i.test(dictSlice);

    let contentString = "";
    if (isFlate) {
      try {
        const decompressed = inflateSync(streamBuf);
        contentString = decompressed.toString("latin1");
      } catch {
        // Not all flate streams are text or valid, continue
      }
    } else {
      contentString = streamBuf.toString("latin1");
    }

    if (contentString && (contentString.includes("BT") || contentString.includes("Tj") || contentString.includes("TJ"))) {
      const text = extractTextFromPdfStream(contentString);
      if (text.trim()) {
        extractedBlocks.push(text.trim());
      }
    }
  }

  // Also check if text exists uncompressed in parent body
  if (extractedBlocks.length === 0) {
    const fallbackText = extractTextFromPdfStream(rawLatin);
    if (fallbackText.trim()) {
      extractedBlocks.push(fallbackText.trim());
    }
  }

  const finalText = extractedBlocks.join("\n\n").trim();
  return finalText;
}

function extractTextFromPdfStream(content: string): string {
  const parts: string[] = [];
  // Match literal Tj: (Text) Tj
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tjRegex.exec(content)) !== null) {
    const decoded = cleanPdfString(m[1]);
    if (decoded) parts.push(decoded);
  }

  // Match hex Tj: <00480065> Tj
  const hexTjRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
  while ((m = hexTjRegex.exec(content)) !== null) {
    const decoded = decodePdfHexString(m[1]);
    if (decoded) parts.push(decoded);
  }

  // Match TJ array: [(Text) 12 <0048> (More text)] TJ
  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((m = tjArrayRegex.exec(content)) !== null) {
    const arrayContent = m[1];
    const subParts: string[] = [];
    const itemRegex = /(?:\(([^)]*)\)|<([0-9a-fA-F\s]+)>)/g;
    let sub: RegExpExecArray | null;
    while ((sub = itemRegex.exec(arrayContent)) !== null) {
      if (sub[1] !== undefined) {
        const clean = cleanPdfString(sub[1]);
        if (clean) subParts.push(clean);
      } else if (sub[2] !== undefined) {
        const decoded = decodePdfHexString(sub[2]);
        if (decoded) subParts.push(decoded);
      }
    }
    if (subParts.length > 0) {
      parts.push(subParts.join(" "));
    }
  }

  // Match ' operator: (Text) ' or <hex> '
  const quoteRegex = /(?:\(([^)]*)\)|<([0-9a-fA-F\s]+)>)\s*'/g;
  while ((m = quoteRegex.exec(content)) !== null) {
    const decoded = m[1] !== undefined ? cleanPdfString(m[1]) : decodePdfHexString(m[2]);
    if (decoded) parts.push("\n" + decoded);
  }

  return parts.join(" ");
}

function decodePdfHexString(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (!clean) return "";
  // If clean length is multiple of 4, treat as UTF-16BE / 2-byte CMap
  if (clean.length % 4 === 0) {
    let s = "";
    for (let i = 0; i < clean.length; i += 4) {
      const code = parseInt(clean.slice(i, i + 4), 16);
      if (code >= 0x20 || code === 0x0a || code === 0x09) {
        s += String.fromCharCode(code);
      }
    }
    if (s.trim()) return s;
  }
  // Otherwise decode standard ASCII/Latin bytes
  let s = "";
  for (let i = 0; i < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (code >= 0x20 || code === 0x0a || code === 0x09) {
      s += String.fromCharCode(code);
    }
  }
  return s;
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .trim();
}
