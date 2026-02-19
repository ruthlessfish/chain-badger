"use client";

import { useState } from "react";
import Link from "next/link";
import { TemplateFilters, TemplateGrid } from "~~/components/chainbadger/templates";
import type { FilterStatus, SortOrder } from "~~/components/chainbadger/templates";
import { useTemplates } from "~~/hooks/chainbadger/useTemplates";

export default function TemplatesPage() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const { templates, loading, error } = useTemplates({ includeArchived: false });

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Badge Gallery</h1>
            <p className="text-base-content/60 mt-1">Discover and claim on-chain achievement badges</p>
          </div>
          <Link href="/create-template" className="btn btn-primary btn-sm shrink-0">
            + Create Badge
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error text-sm">
            <span>Failed to load templates: {error.message}</span>
          </div>
        )}

        {/* Filters */}
        {!error && (
          <TemplateFilters
            filterStatus={filterStatus}
            sortOrder={sortOrder}
            onFilterChange={setFilterStatus}
            onSortChange={setSortOrder}
            totalCount={loading ? undefined : templates.length}
          />
        )}

        {/* Grid */}
        <TemplateGrid templates={templates} loading={loading} filterStatus={filterStatus} sortOrder={sortOrder} />
      </div>
    </main>
  );
}
