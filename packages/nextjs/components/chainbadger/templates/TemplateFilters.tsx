"use client";

import { FilterStatus, SortOrder } from "./TemplateGrid";

interface Props {
  filterStatus: FilterStatus;
  sortOrder: SortOrder;
  onFilterChange: (f: FilterStatus) => void;
  onSortChange: (s: SortOrder) => void;
  totalCount?: number;
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "claimable", label: "Claimable" },
  { value: "paused", label: "Paused" },
  { value: "sold-out", label: "Sold Out" },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most-claimed", label: "Most Claimed" },
];

export function TemplateFilters({ filterStatus, sortOrder, onFilterChange, onSortChange, totalCount }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`btn btn-xs rounded-full ${filterStatus === opt.value ? "btn-primary" : "btn-ghost border border-base-300"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Count */}
      {totalCount !== undefined && (
        <span className="text-sm text-base-content/50">
          {totalCount} badge{totalCount !== 1 ? "s" : ""}
        </span>
      )}

      {/* Sort select */}
      <select
        className="select select-sm select-bordered"
        value={sortOrder}
        onChange={e => onSortChange(e.target.value as SortOrder)}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
