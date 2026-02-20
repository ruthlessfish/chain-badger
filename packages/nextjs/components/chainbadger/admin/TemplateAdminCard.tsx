"use client";

import { useState } from "react";
import { ArchiveConfirmModal } from "./ArchiveConfirmModal";
import { EditMetadataForm } from "./EditMetadataForm";
import { EditRequirementsForm } from "./EditRequirementsForm";
import { SupplyIndicator } from "~~/components/chainbadger/templates/SupplyIndicator";
import { TemplateStatusBadge } from "~~/components/chainbadger/templates/TemplateStatusBadge";
import { useTemplateAdminActions } from "~~/hooks/chainbadger/useTemplateAdminActions";
import type { BadgeTemplate } from "~~/types/badge";
import { getTemplateStatus } from "~~/types/badge";

type Expand = "metadata" | "requirements" | null;

interface Props {
  template: BadgeTemplate;
  onRefetch: () => void;
}

/**
 * TemplateAdminCard — displays a single template with lifecycle controls for its creator.
 */
export function TemplateAdminCard({ template, onRefetch }: Props) {
  const [expand, setExpand] = useState<Expand>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { deactivate, reactivate, archive } = useTemplateAdminActions();

  const status = getTemplateStatus(template);

  // Parse badge name from metadataURI
  let name = `Template #${template.templateId.toString()}`;
  try {
    if (template.metadataURI.startsWith("{")) {
      const meta = JSON.parse(template.metadataURI);
      if (meta.name) name = meta.name;
    }
  } catch {
    // Ignore parse failures — metadata may be a plain IPFS URI or malformed JSON; use fallback name
  }

  async function handleToggleActive() {
    setActionError(null);
    setToggling(true);
    try {
      if (template.active) {
        await deactivate(template.templateId);
      } else {
        await reactivate(template.templateId);
      }
      onRefetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setToggling(false);
    }
  }

  async function handleArchive() {
    setActionError(null);
    setArchiving(true);
    try {
      await archive(template.templateId);
      setShowArchiveModal(false);
      onRefetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setArchiving(false);
    }
  }

  function toggleExpand(section: Expand) {
    setExpand(prev => (prev === section ? null : section));
  }

  return (
    <div className="card bg-base-200 border border-base-300">
      <div className="card-body gap-3">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{name}</span>
              <span className="text-xs text-base-content/40">#{template.templateId.toString()}</span>
              <TemplateStatusBadge status={status} />
            </div>
            <SupplyIndicator claimCount={template.claimCount} maxClaims={template.maxClaims} />
          </div>

          {/* Action buttons */}
          {!template.archived && (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-xs btn-outline" onClick={handleToggleActive} disabled={toggling}>
                {toggling && <span className="loading loading-spinner loading-xs" />}
                {template.active ? "Deactivate" : "Reactivate"}
              </button>
              <button className="btn btn-xs btn-error btn-outline" onClick={() => setShowArchiveModal(true)}>
                Archive
              </button>
            </div>
          )}
        </div>

        {actionError && (
          <div className="alert alert-error text-xs py-1">
            <span>{actionError}</span>
          </div>
        )}

        {/* Edit actions — only when not archived */}
        {!template.archived && (
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-xs btn-ghost" onClick={() => toggleExpand("metadata")}>
              {expand === "metadata" ? "▲" : "▼"} Edit Metadata URI
            </button>
            <button className="btn btn-xs btn-ghost" onClick={() => toggleExpand("requirements")}>
              {expand === "requirements" ? "▲" : "▼"} Update Requirements
            </button>
          </div>
        )}

        {/* Inline edit panels */}
        {expand === "metadata" && (
          <div className="border-t border-base-300 pt-3">
            <EditMetadataForm
              templateId={template.templateId}
              currentURI={template.metadataURI}
              onSuccess={() => {
                setExpand(null);
                onRefetch();
              }}
            />
          </div>
        )}
        {expand === "requirements" && (
          <div className="border-t border-base-300 pt-3">
            <EditRequirementsForm
              templateId={template.templateId}
              currentRequirements={template.requirements}
              onSuccess={() => {
                setExpand(null);
                onRefetch();
              }}
            />
          </div>
        )}
      </div>

      {/* Archive confirmation modal */}
      <ArchiveConfirmModal
        isOpen={showArchiveModal}
        templateId={template.templateId}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveModal(false)}
        isSubmitting={archiving}
      />
    </div>
  );
}
