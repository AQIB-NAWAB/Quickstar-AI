const MAX_CHUNK = 800;
const OVERLAP = 100;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if (buffer.length + para.length + 1 <= MAX_CHUNK) {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
      continue;
    }
    if (buffer) {
      chunks.push(buffer);
      buffer = para.length <= MAX_CHUNK ? para : "";
    }
    if (!buffer && para.length > MAX_CHUNK) {
      for (let i = 0; i < para.length; i += MAX_CHUNK - OVERLAP) {
        chunks.push(para.slice(i, i + MAX_CHUNK));
      }
    }
  }
  if (buffer) {
    chunks.push(buffer);
  }
  return chunks.length > 0 ? chunks : [normalized.slice(0, MAX_CHUNK)];
}
