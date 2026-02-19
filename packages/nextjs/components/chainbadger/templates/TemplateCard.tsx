"use client";

import Image from "next/image";
import Link from "next/link";
import { SupplyIndicator } from "./SupplyIndicator";
import { TemplateStatusBadge } from "./TemplateStatusBadge";
import { useTemplateEligibility } from "~~/hooks/chainbadger/useTemplateEligibility";
import { BadgeTemplate, getTemplateStatus } from "~~/types/badge";

interface Props {
  template: BadgeTemplate;
}

export function TemplateCard({ template }: Props) {
  const status = getTemplateStatus(template);
  const { eligible, loading: eligLoading } = useTemplateEligibility(template);

  // Attempt to parse metadataURI as JSON (inline metadata) or use it as an image URL directly
  let name = `Badge #${template.badgeId.toString()}`;
  let description = "";
  let imageUri: string | null = null;

  try {
    if (template.metadataURI.startsWith("{")) {
      const meta = JSON.parse(template.metadataURI);
      name = meta.name ?? name;
      description = meta.description ?? "";
      imageUri = meta.image ?? null;
    } else if (template.metadataURI.startsWith("data:application/json;base64,")) {
      const json = JSON.parse(atob(template.metadataURI.slice("data:application/json;base64,".length)));
      name = json.name ?? name;
      description = json.description ?? "";
      imageUri = json.image ?? null;
    } else {
      // Treat as image URI directly
      imageUri = template.metadataURI;
    }
  } catch {
    imageUri = null;
  }

  const claimable = status === "claimable";

  return (
    <div
      className={`card bg-base-200 shadow-md border transition-all duration-200 hover:shadow-lg ${claimable ? "border-primary/30 hover:border-primary" : "border-base-300"}`}
    >
      {/* Image */}
      <figure className="h-40 bg-base-300 flex items-center justify-center overflow-hidden rounded-t-2xl">
        {imageUri ? (
          <img
            src={imageUri}
            alt={name}
            width={160}
            height={160}
            className="object-cover w-full h-full"
            // unoptimized={imageUri.startsWith("ipfs://") || imageUri.startsWith("data:")}
          />
        ) : (
          <span className="text-5xl">🏅</span>
        )}
      </figure>

      <div className="card-body p-4 gap-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="card-title text-base leading-tight line-clamp-2">{name}</h3>
          <TemplateStatusBadge status={status} className="shrink-0 mt-0.5" />
        </div>

        {/* Description */}
        {description && <p className="text-sm text-base-content/60 line-clamp-2">{description}</p>}

        {/* Creator */}
        <div className="flex items-center gap-1 text-xs text-base-content/50">
          <span>by</span>
          <span className="font-mono">{`${template.creator.slice(0, 6)}…${template.creator.slice(-4)}`}</span>
        </div>

        {/* Supply */}
        <SupplyIndicator claimCount={template.claimCount} maxClaims={template.maxClaims} />

        {/* Eligibility dot */}
        {!eligLoading && claimable && (
          <div className={`flex items-center gap-1 text-xs ${eligible ? "text-success" : "text-warning"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${eligible ? "bg-success" : "bg-warning"}`} />
            {eligible ? "You're eligible" : "Requirements not met"}
          </div>
        )}

        {/* CTA */}
        <div className="card-actions mt-1">
          <Link
            href={`/templates/${template.templateId.toString()}`}
            className={`btn btn-sm w-full ${claimable && eligible ? "btn-primary" : "btn-ghost"}`}
          >
            {claimable ? (eligible ? "Claim Badge" : "View Requirements") : "View Details"}
          </Link>
        </div>
      </div>
    </div>
  );
}
