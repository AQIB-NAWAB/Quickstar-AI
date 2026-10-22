import type { KnowledgeSourcePresentationStatus, KnowledgeSourceStatus } from "./types";

/**
 * Format timestamp into relative display string (e.g. "Just now", "2 hours ago", "Yesterday", "Oct 16").
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (Number.isNaN(diffMs)) return "—";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();

  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${date.getFullYear()}`;
}

/**
 * Format timestamp to "MMM DD, YYYY, HH:mm" (e.g., "Oct 17, 2026, 14:22").
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
 * Map backend status string to normalized presentation status.
 * queued / processing -> Indexing (amber)
 * ready -> Ready (green)
 * failed -> Failed (red)
 */
export function mapBackendStatusToPresentation(
  status: KnowledgeSourceStatus | string | null | undefined,
): { presentation: KnowledgeSourcePresentationStatus; label: string; isTerminal: boolean } {
  switch (status) {
    case "queued":
    case "processing":
      return { presentation: "indexing", label: "Indexing", isTerminal: false };
    case "ready":
      return { presentation: "ready", label: "Ready", isTerminal: true };
    case "failed":
      return { presentation: "failed", label: "Failed", isTerminal: true };
    default:
      return { presentation: "unknown", label: "Unknown", isTerminal: true };
  }
}

/**
 * Map backend source kind to human-readable type label.
 * kind "text" -> "Text"
 * kind "document" | "file" -> "File"
 * kind "url" -> "Web page"
 */
export function mapSourceKindToType(kind: string | null | undefined): {
  typeKey: "file" | "url" | "text" | "unknown";
  label: string;
} {
  const normalized = (kind || "").toLowerCase().trim();
  if (normalized === "document" || normalized === "file") {
    return { typeKey: "file", label: "File" };
  }
  if (normalized === "text" || normalized === "plain_text") {
    return { typeKey: "text", label: "Text" };
  }
  if (normalized === "url") {
    return { typeKey: "url", label: "Web page" };
  }
  return {
    typeKey: "unknown",
    label: normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Other",
  };
}

/**
 * Format byte count to human-readable size (e.g. "248 KB", "1.2 MB").
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Lightweight token estimate (approx 4 chars per token).
 */
export function estimateTokens(charCount: number | null | undefined): number {
  if (!charCount || charCount <= 0) return 0;
  return Math.ceil(charCount / 4);
}
