"use client";

import Image from "next/image";
import { EligibilityIndicator } from "./EligibilityIndicator";
import { SupplyIndicator } from "./SupplyIndicator";
import { TemplateClaimButton } from "./TemplateClaimButton";
import { TemplateStatusBadge } from "./TemplateStatusBadge";
import { useTemplateEligibility } from "~~/hooks/chainbadger/useTemplateEligibility";
import { BadgeTemplate, getTemplateStatus } from "~~/types/badge";
import { describeRequirements } from "~~/utils/requirementsDecoder";

interface Props {
  template: BadgeTemplate;
}

export function TemplateDetail({ template }: Props) {
  const status = getTemplateStatus(template);
  const { eligible, checks, loading: eligLoading } = useTemplateEligibility(template);

  // Parse metadata
  let name = `Badge #${template.badgeId.toString()}`;
  let description = "";
  let imageUri: string | null = null;
  let extraMeta: Record<string, string> = {};

  try {
    if (template.metadataURI.startsWith("{")) {
      const meta = JSON.parse(template.metadataURI);
      name = meta.name ?? name;
      description = meta.description ?? "";
      imageUri = meta.image ?? null;
      const { name: _n, description: _d, image: _i, ...rest } = meta;
      void _n;
      void _d;
      void _i;
      extraMeta = rest;
    } else if (template.metadataURI.startsWith("data:application/json;base64,")) {
      const json = JSON.parse(atob(template.metadataURI.slice("data:application/json;base64,".length)));
      name = json.name ?? name;
      description = json.description ?? "";
      imageUri = json.image ?? null;
    } else {
      imageUri = template.metadataURI;
    }
  } catch {
    imageUri = null;
  }

  const requirementLabels = describeRequirements(template.requirements);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header card */}
      <div className="card bg-base-200 border border-base-300 shadow-md">
        <div className="card-body p-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Image */}
            <div className="w-24 h-24 shrink-0 rounded-2xl bg-base-300 flex items-center justify-center overflow-hidden">
              {imageUri ? (
                <Image
                  src={imageUri}
                  alt={name}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  unoptimized={imageUri.startsWith("ipfs://") || imageUri.startsWith("data:")}
                />
              ) : (
                <span className="text-4xl">🏅</span>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{name}</h1>
                <TemplateStatusBadge status={status} />
              </div>
              {description && <p className="text-base-content/70 text-sm">{description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-base-content/50 mt-1">
                <span>Badge ID: {template.badgeId.toString()}</span>
                <span>Template ID: {template.templateId.toString()}</span>
                <span>
                  Creator:{" "}
                  <span className="font-mono">{`${template.creator.slice(0, 6)}…${template.creator.slice(-4)}`}</span>
                </span>
              </div>
              {/* Extra metadata fields */}
              {Object.entries(extraMeta).map(([k, v]) => (
                <div key={k} className="text-xs text-base-content/50">
                  <span className="capitalize font-medium">{k}</span>: {String(v)}
                </div>
              ))}
            </div>
          </div>

          {/* Supply */}
          <SupplyIndicator claimCount={template.claimCount} maxClaims={template.maxClaims} />
        </div>
      </div>

      {/* Requirements */}
      <div className="card bg-base-200 border border-base-300 shadow-sm">
        <div className="card-body p-5 gap-3">
          <h2 className="font-semibold text-base">Requirements</h2>
          {requirementLabels.length === 0 ? (
            <p className="text-sm text-base-content/60">No requirements — anyone can claim this badge.</p>
          ) : (
            <ul className="list-disc list-inside text-sm text-base-content/80 space-y-1">
              {requirementLabels.map((label, i) => (
                <li key={i}>{label}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Eligibility */}
      <div className="card bg-base-200 border border-base-300 shadow-sm">
        <div className="card-body p-5 gap-3">
          <h2 className="font-semibold text-base">Your Eligibility</h2>
          <EligibilityIndicator checks={checks} loading={eligLoading} />
        </div>
      </div>

      {/* Claim */}
      <TemplateClaimButton template={template} eligible={eligible} eligLoading={eligLoading} />
    </div>
  );
}
