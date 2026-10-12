import { normalizePhoneForSearch } from "./format";
import type { LeadSummary } from "./types";

export function filterLeads<T extends LeadSummary>(
  leads: T[],
  filters: { q?: string; status?: string; tag?: string }
): T[] {
  const query = (filters.q || "").trim().toLowerCase();
  const normalizedQueryPhone = normalizePhoneForSearch(query);
  const status = (filters.status || "all").toLowerCase();
  const tag = (filters.tag || "all").toLowerCase();

  return leads.filter((lead) => {
    // 1. Search Query
    if (query) {
      const matchName = lead.name ? lead.name.toLowerCase().includes(query) : false;
      const matchEmail = lead.email ? lead.email.toLowerCase().includes(query) : false;
      const matchPhoneRaw = lead.phone ? lead.phone.toLowerCase().includes(query) : false;
      const matchPhoneNormalized =
        normalizedQueryPhone.length > 0 && lead.phone
          ? normalizePhoneForSearch(lead.phone).includes(normalizedQueryPhone)
          : false;

      if (!matchName && !matchEmail && !matchPhoneRaw && !matchPhoneNormalized) {
        return false;
      }
    }

    // 2. Status
    if (status !== "all") {
      if (lead.status.toLowerCase() !== status) {
        return false;
      }
    }

    // 3. Tag
    if (tag !== "all") {
      const hasTag = lead.tags.some((t) => t.toLowerCase() === tag);
      if (!hasTag) {
        return false;
      }
    }

    return true;
  });
}
