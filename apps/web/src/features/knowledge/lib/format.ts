import type { KnowledgeSourcePresentationStatus, KnowledgeSourceStatus } from "./types";

/**
 * Format timestamp to "MMM DD, YYYY, HH:mm" (e.g., "Oct 10, 2026, 14:22").
 * Returns "—" for invalid or missing dates.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${month} ${day}, ${year}, ${hours}:${minutes} UTC`;
}

/**
 * Format timestamp to "MMM DD, YYYY" (e.g., "Oct 10, 2026").
 * Returns "—" for invalid or missing dates.
 */
export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();

  return `${month} ${day}, ${year}`;
}

/**
 * Map backend status string to normalized presentation status.
 * Note: backend "queued" must map to presentation "pending".
 */
export function mapBackendStatusToPresentation(
  status: KnowledgeSourceStatus | string,
): { presentation: KnowledgeSourcePresentationStatus; label: string } {
  switch (status) {
    case "queued":
      return { presentation: "pending", label: "Pending" };
    case "processing":
      return { presentation: "processing", label: "Processing" };
    case "ready":
      return { presentation: "ready", label: "Ready" };
    case "failed":
      return { presentation: "failed", label: "Failed" };
    default:
      return { presentation: "unknown", label: "Unknown" };
  }
}

/**
 * Map backend source kind to human-readable type label.
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
    return { typeKey: "url", label: "URL" };
  }
  return {
    typeKey: "unknown",
    label: normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Other",
  };
}
