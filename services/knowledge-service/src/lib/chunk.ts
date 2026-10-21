export const MAX_CHUNK_SIZE = 800;
export const CHUNK_OVERLAP = 100;

export interface ChunkSpan {
  text: string;
  chunk_index: number;
  start_char: number;
  end_char: number;
}

/**
 * Splits text into contiguous chunks with start_char and end_char coordinates.
 * Coordinates strictly satisfy: normalized.slice(chunk.start_char, chunk.end_char) === chunk.text.
 * Long paragraphs and buffer flushes never drop content.
 */
export function chunkTextWithCoordinates(
  rawText: string,
  maxChunkSize: number = MAX_CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP,
): ChunkSpan[] {
  const normalized = rawText.replace(/\r\n/g, "\n");
  if (!normalized || !normalized.trim()) {
    return [];
  }

  const chunks: ChunkSpan[] = [];
  let chunkIndex = 0;

  // Split into paragraph segments while tracking their exact start/end indices in normalized
  const paragraphRegex = /\S+(?:[^\n]|\n(?!\n))*/g;
  const paragraphSpans: { start: number; end: number; text: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = paragraphRegex.exec(normalized)) !== null) {
    paragraphSpans.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  if (paragraphSpans.length === 0) {
    return [];
  }

  let currentStart = paragraphSpans[0].start;
  let currentEnd = paragraphSpans[0].end;

  for (let i = 0; i < paragraphSpans.length; i++) {
    const para = paragraphSpans[i];
    const paraLength = para.end - para.start;

    // Case 1: Oversized single paragraph that exceeds maxChunkSize on its own
    if (paraLength > maxChunkSize) {
      // First flush whatever was accumulated prior to this oversized paragraph
      if (currentEnd > currentStart && currentStart !== para.start) {
        chunks.push({
          chunk_index: chunkIndex++,
          start_char: currentStart,
          end_char: currentEnd,
          text: normalized.slice(currentStart, currentEnd),
        });
      }

      // Slice the oversized paragraph into overlapping sliding window spans
      const step = Math.max(1, maxChunkSize - overlap);
      for (let offset = para.start; offset < para.end; offset += step) {
        const sliceEnd = Math.min(offset + maxChunkSize, para.end);
        chunks.push({
          chunk_index: chunkIndex++,
          start_char: offset,
          end_char: sliceEnd,
          text: normalized.slice(offset, sliceEnd),
        });
        if (sliceEnd === para.end) {
          break;
        }
      }

      // Reset current pointer for subsequent paragraphs
      if (i + 1 < paragraphSpans.length) {
        currentStart = paragraphSpans[i + 1].start;
        currentEnd = paragraphSpans[i + 1].end;
      } else {
        currentStart = currentEnd;
      }
      continue;
    }

    // Case 2: Normal paragraph fits into current buffer
    const candidateEnd = para.end;
    const candidateLength = candidateEnd - currentStart;

    if (candidateLength <= maxChunkSize) {
      currentEnd = candidateEnd;
    } else {
      // Exceeds maxChunkSize: flush current buffer
      if (currentEnd > currentStart) {
        chunks.push({
          chunk_index: chunkIndex++,
          start_char: currentStart,
          end_char: currentEnd,
          text: normalized.slice(currentStart, currentEnd),
        });
      }
      // Start next buffer with the current paragraph
      currentStart = para.start;
      currentEnd = para.end;
    }
  }

  // Flush remaining buffer
  if (currentEnd > currentStart) {
    // Only push if not already covered by previous chunk
    if (chunks.length === 0 || chunks[chunks.length - 1].end_char !== currentEnd || chunks[chunks.length - 1].start_char !== currentStart) {
      chunks.push({
        chunk_index: chunkIndex++,
        start_char: currentStart,
        end_char: currentEnd,
        text: normalized.slice(currentStart, currentEnd),
      });
    }
  }

  return chunks;
}

/** Legacy string[] wrapper for callers */
export function chunkText(
  text: string,
  maxChunkSize: number = MAX_CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP,
): string[] {
  return chunkTextWithCoordinates(text, maxChunkSize, overlap).map((c) => c.text);
}
