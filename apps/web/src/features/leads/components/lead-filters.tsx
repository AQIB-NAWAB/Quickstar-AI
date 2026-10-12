import { Search,X } from "lucide-react";

interface LeadFiltersProps {
  search: string;
  status: string;
  tag: string;
  availableTags: string[];
  totalLoaded: number;
  isSampleData?: boolean;
  onSearchChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onTagChange: (val: string) => void;
  onClearFilters: () => void;
}

export function LeadFilters({
  search,
  status,
  tag,
  availableTags,
  totalLoaded,
  isSampleData = false,
  onSearchChange,
  onStatusChange,
  onTagChange,
  onClearFilters,
}: LeadFiltersProps) {
  const hasActiveFilters = search.trim() !== "" || status !== "all" || tag !== "all";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, or phone"
            className="w-full pl-9 pr-3 py-1.5 border border-border-faint rounded-8 bg-white focus:outline-none focus:border-heat-100 text-neutral-700"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-1.5">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-2.5 py-1.5 border border-border-faint rounded-8 bg-white text-neutral-700 focus:outline-none focus:border-heat-100"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="disqualified">Disqualified</option>
          </select>
        </div>

        {/* Tags Dropdown */}
        <div className="flex items-center gap-1.5">
          <select
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
            className="px-2.5 py-1.5 border border-border-faint rounded-8 bg-white text-neutral-700 focus:outline-none focus:border-heat-100"
            aria-label="Filter by tag"
          >
            <option value="all">All tags</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-accent-black px-2 py-1 rounded hover:bg-neutral-100 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Loaded Count */}
      <div className="text-[11px] text-neutral-400 font-medium shrink-0 self-start sm:self-center">
        {totalLoaded} {isSampleData ? "sample leads" : "leads"}
      </div>
    </div>
  );
}
