import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chunkTextWithCoordinates, chunkText } from "../lib/chunk.js";

describe("chunkTextWithCoordinates", () => {
  test("generates exact contiguous coordinates matching sliced normalized text", () => {
    const text = [
      "The QuickStart AI Knowledge Base provides reliable ground-truth context for enterprise AI agents.",
      "Documents, company policies, and FAQs can be imported to ground agent interactions.",
      "Each document is split into paragraphs and indexed with deterministic chunk identifiers.",
      "Chunks can be inspected directly in the console with exact character boundaries.",
    ].join("\n\n");

    const chunks = chunkTextWithCoordinates(text, 150, 30);
    assert.ok(chunks.length > 0, "Should generate chunks");

    const normalized = text.replace(/\r\n/g, "\n");
    for (const chunk of chunks) {
      assert.ok(chunk.start_char !== null, "start_char should not be null");
      assert.ok(chunk.end_char !== null, "end_char should not be null");
      const slice = normalized.slice(chunk.start_char!, chunk.end_char!);
      assert.equal(
        slice,
        chunk.text,
        `Chunk text must exactly match normalized.slice(${chunk.start_char}, ${chunk.end_char})`
      );
    }
  });

  test("does not lose paragraphs during buffer flush or oversized paragraph splits", () => {
    const paragraph1 = "Alpha paragraph discussing introductory concepts.";
    const paragraph2 = "Beta paragraph that contains substantial details regarding ingestion workflows.";
    const paragraph3 = "Gamma paragraph summarizing final conclusions.";
    const text = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;

    const chunks = chunkTextWithCoordinates(text, 100, 20);
    const combinedChunkText = chunks.map((c) => c.text).join(" ");

    assert.ok(combinedChunkText.includes("Alpha paragraph"), "Must contain paragraph 1");
    assert.ok(combinedChunkText.includes("Beta paragraph"), "Must contain paragraph 2");
    assert.ok(combinedChunkText.includes("Gamma paragraph"), "Must contain paragraph 3");
  });

  test("handles short texts without unnecessary splitting", () => {
    const text = "A concise knowledge document that fits well within the default chunk window.";
    const chunks = chunkTextWithCoordinates(text, 800, 100);

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].chunk_index, 0);
    assert.equal(chunks[0].text, text);
    assert.equal(chunks[0].start_char, 0);
    assert.equal(chunks[0].end_char, text.length);
  });

  test("returns empty array for empty or whitespace-only inputs", () => {
    assert.deepEqual(chunkTextWithCoordinates("", 800, 100), []);
    assert.deepEqual(chunkTextWithCoordinates("   \n\n  \t ", 800, 100), []);
  });

  test("chunkText backward-compatible wrapper returns identical text strings", () => {
    const text = "First paragraph of content.\n\nSecond paragraph of content.";
    const stringChunks = chunkText(text, 200, 50);
    const coordChunks = chunkTextWithCoordinates(text, 200, 50);

    assert.equal(stringChunks.length, coordChunks.length);
    for (let i = 0; i < stringChunks.length; i++) {
      assert.equal(stringChunks[i], coordChunks[i].text);
    }
  });
});
