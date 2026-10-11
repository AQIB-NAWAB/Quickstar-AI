/**
 * Derive 1-2 letter initials from workspace name for avatar display.
 */
export function getWorkspaceInitials(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "WS";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Format timestamp to "MMM DD, YYYY" (e.g., "Oct 10, 2026").
 * Returns "—" for invalid/missing dates.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

/**
 * Format timestamp to "MMM DD, YYYY, HH:mm" (e.g., "Oct 10, 2026, 14:22").
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month} ${day}, ${year}, ${hours}:${minutes}`;
}

/**
 * Validate and normalize an HTTP/HTTPS origin URL.
 * Returns the canonical origin string (e.g., "https://example.com" or "http://localhost:3000")
 * or an error string if invalid.
 */
export function validateAndNormalizeOrigin(input: string): { origin?: string; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { error: "Origin cannot be empty." };
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "Origin must use http:// or https:// protocol." };
    }

    if (url.username || url.password) {
      return { error: "Origin cannot contain credentials." };
    }

    if (url.hostname.includes("*")) {
      return { error: "Wildcard domains are not permitted." };
    }

    // Check if path has more than a root slash
    if (url.pathname !== "/" && url.pathname !== "") {
      return { error: "Origins cannot include paths (e.g. /app). Use origin only." };
    }

    if (url.search || url.hash) {
      return { error: "Origins cannot include query parameters or hashes." };
    }

    return { origin: url.origin };
  } catch {
    return { error: "Please enter a valid URL (e.g. https://example.com)." };
  }
}
