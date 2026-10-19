import { test, describe } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import {
  extractDocumentText,
  MAX_FILE_SIZE_BYTES,
} from "../lib/extract.js";

describe("extractDocumentText", () => {
  test("extracts and normalizes UTF-8 text from .txt and .md files", async () => {
    const rawContent = "Line 1 with Windows CRLF\r\nLine 2 with trailing spaces   \r\nLine 3";
    const buffer = Buffer.from(rawContent, "utf8");

    const txtResult = await extractDocumentText({
      filename: "sample.txt",
      mimeType: "text/plain",
      buffer,
    });
    assert.equal(txtResult.charCount, txtResult.text.length);
    assert.ok(!txtResult.text.includes("\r\n"), "Should normalize CRLF to LF");
    assert.ok(txtResult.text.includes("Line 1 with Windows CRLF\nLine 2"));

    const mdResult = await extractDocumentText({
      filename: "readme.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Heading\n\nContent paragraph", "utf8"),
    });
    assert.ok(mdResult.text.includes("# Heading"));
  });

  test("rejects files exceeding 25 MiB limit", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
    await assert.rejects(
      async () => {
        await extractDocumentText({
          filename: "huge.txt",
          mimeType: "text/plain",
          buffer: oversizedBuffer,
        });
      },
      (err: any) => {
        assert.equal(err.code, "FILE_TOO_LARGE");
        return true;
      }
    );
  });

  test("rejects unsupported extensions", async () => {
    await assert.rejects(
      async () => {
        await extractDocumentText({
          filename: "script.exe",
          mimeType: "application/octet-stream",
          buffer: Buffer.from("MZ...", "utf8"),
        });
      },
      (err: any) => {
        assert.equal(err.code, "UNSUPPORTED_FILE_TYPE");
        return true;
      }
    );
  });

  test("rejects invalid PDF lacking %PDF header", async () => {
    await assert.rejects(
      async () => {
        await extractDocumentText({
          filename: "corrupt.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("Not a real PDF", "utf8"),
        });
      },
      (err: any) => {
        assert.equal(err.code, "INVALID_PDF");
        return true;
      }
    );
  });

  test("rejects encrypted PDFs", async () => {
    const encryptedPdfHeader = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n/Encrypt 3 0 R\n%%EOF",
      "utf8"
    );
    await assert.rejects(
      async () => {
        await extractDocumentText({
          filename: "locked.pdf",
          mimeType: "application/pdf",
          buffer: encryptedPdfHeader,
        });
      },
      (err: any) => {
        assert.equal(err.code, "PDF_ENCRYPTED");
        return true;
      }
    );
  });

  test("rejects PDFs with no extractable text (e.g. scanned images)", async () => {
    const emptyPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n%%EOF",
      "utf8"
    );
    await assert.rejects(
      async () => {
        await extractDocumentText({
          filename: "scanned.pdf",
          mimeType: "application/pdf",
          buffer: emptyPdf,
        });
      },
      (err: any) => {
        assert.equal(err.code, "NO_EXTRACTABLE_TEXT");
        return true;
      }
    );
  });

  test("extracts text from valid DOCX PKZip payload", async () => {
    const xmlContent = Buffer.from(
      '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>QuickStart AI Knowledge Extraction &amp; Processing</w:t></w:r></w:p></w:body></w:document>',
      "utf8"
    );
    const deflatedXml = zlib.deflateRawSync(xmlContent);

    // Build minimal PKZip header for word/document.xml
    const fileName = "word/document.xml";
    const fileNameBuffer = Buffer.from(fileName, "utf8");

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // general flags
    localHeader.writeUInt16LE(8, 8); // compression = deflate
    localHeader.writeUInt32LE(0, 10); // mod time/date
    localHeader.writeUInt32LE(0, 14); // crc32
    localHeader.writeUInt32LE(deflatedXml.length, 18); // comp size
    localHeader.writeUInt32LE(xmlContent.length, 22); // uncomp size
    localHeader.writeUInt16LE(fileNameBuffer.length, 26); // name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const docxBuffer = Buffer.concat([localHeader, fileNameBuffer, deflatedXml]);

    const result = await extractDocumentText({
      filename: "test-policy.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: docxBuffer,
    });

    assert.ok(result.text.includes("QuickStart AI Knowledge Extraction & Processing"));
  });

  test("rejects invalid DOCX lacking PKZip header", async () => {
    await assert.rejects(
      async () => {
        await extractDocumentText({
          filename: "corrupt.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: Buffer.from("Corrupted non-zip payload", "utf8"),
        });
      },
      (err: any) => {
        assert.equal(err.code, "INVALID_DOCX");
        return true;
      }
    );
  });
});
