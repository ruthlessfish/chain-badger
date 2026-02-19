"use client";

import { TemplateCard } from "./TemplateCard";
import { BadgeTemplate, TemplateStatus, getTemplateStatus } from "~~/types/badge";

export type FilterStatus = "all" | TemplateStatus;
export type SortOrder = "newest" | "oldest" | "most-claimed";

interface Props {
  templates: BadgeTemplate[];
  loading?: boolean;
  filterStatus?: FilterStatus;
  sortOrder?: SortOrder;
}

export function TemplateGrid({ templates, loading = false, filterStatus = "all", sortOrder = "newest" }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card bg-base-200 border border-base-300">
            <div className="skeleton h-40 w-full rounded-t-2xl" />
            <div className="card-body p-4 gap-3">
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-8 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  let filtered = templates.filter(t => {
    if (filterStatus === "all") return true;
    return getTemplateStatus(t) === filterStatus;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortOrder === "newest") return Number(b.createdAt - a.createdAt);
    if (sortOrder === "oldest") return Number(a.createdAt - b.createdAt);
    if (sortOrder === "most-claimed") return Number(b.claimCount - a.claimCount);
    return 0;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-base-content/40 gap-3">
        <span className="text-5xl">🏅</span>
        <p className="text-lg font-medium">No badges found</p>
        {filterStatus !== "all" && <p className="text-sm">Try changing the filter or check back later.</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filtered.map(template => (
        <TemplateCard key={template.templateId.toString()} template={template} />
      ))}
    </div>
  );
}
