/** Minimal HTML → plain text without a DOM dependency. */
export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<a\s+[^>]*href=["']mailto:([^"'>\s]+)["'][^>]*>([\s\S]*?)<\/a>/gi, " $2 ($1) ")
    .replace(/<a\s+[^>]*href=["']tel:([^"'>\s]+)["'][^>]*>([\s\S]*?)<\/a>/gi, " $2 ($1) ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

export function extractTitle(html: string): string | undefined {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return match?.[1]?.trim();
}
