"use client";

import { TemplateAdminCard } from "./TemplateAdminCard";
import { useAccount } from "wagmi";
import { useMyTemplates } from "~~/hooks/chainbadger/useMyTemplates";

/**
 * MyTemplatesPanel — shows all templates created by the connected wallet with
 * full lifecycle management controls (deactivate/reactivate/archive/edit).
 */
export function MyTemplatesPanel() {
  const { isConnected } = useAccount();
  const { templates, loading, error, refetch } = useMyTemplates();

  if (!isConnected) {
    return (
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body items-center text-center gap-4 py-12">
          <span className="text-5xl">🔒</span>
          <p className="text-lg font-semibold">Connect your wallet</p>
          <p className="text-sm text-base-content/60">Connect to manage your badge templates.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-28 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load templates: {error.message}</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body items-center text-center gap-4 py-12">
          <span className="text-5xl">🏅</span>
          <p className="text-lg font-semibold">No templates yet</p>
          <p className="text-sm text-base-content/60">
            You haven&apos;t created any badge templates. Head to{" "}
            <a href="/create-template" className="link link-primary">
              Create a Badge
            </a>{" "}
            to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-base-content/50">
        {templates.length} template{templates.length !== 1 ? "s" : ""} created by you
      </p>
      {templates.map(template => (
        <TemplateAdminCard key={template.templateId.toString()} template={template} onRefetch={refetch} />
      ))}
    </div>
  );
}
