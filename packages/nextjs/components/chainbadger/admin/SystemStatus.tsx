"use client";

import { Address } from "@scaffold-ui/components";
import { useAdminStatus } from "~~/hooks/chainbadger/useAdminStatus";
import { useDeployedContractInfo, useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export function SystemStatus() {
  const { minterOwner, templateOwner, signer, badgeTemplateRef, authorizedMinter, isLoading } = useAdminStatus();

  const { data: nextTemplateId } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "nextTemplateId",
  });

  const { data: claimEvents } = useScaffoldEventHistory({
    contractName: "BadgeMinter",
    eventName: "TemplateBadgeClaimed",
    fromBlock: 0n,
    watch: true,
  });

  const { data: minterInfo } = useDeployedContractInfo({ contractName: "BadgeMinter" });
  const { data: templateInfo } = useDeployedContractInfo({ contractName: "BadgeTemplate" });
  const { data: tokenInfo } = useDeployedContractInfo({ contractName: "BadgeToken" });

  const totalTemplates = nextTemplateId !== undefined ? Number(nextTemplateId as bigint) : null;
  const totalClaims = claimEvents ? claimEvents.length : null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-6 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Contract Addresses */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-4">
          <h3 className="font-semibold text-base">Contract Addresses</h3>
          <InfoRow label="BadgeMinter" value={minterInfo?.address} isAddress />
          <InfoRow label="BadgeTemplate" value={templateInfo?.address} isAddress />
          <InfoRow label="BadgeToken" value={tokenInfo?.address} isAddress />
        </div>
      </div>

      {/* Signer & Ownership */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-4">
          <h3 className="font-semibold text-base">Roles &amp; Authorization</h3>
          <InfoRow label="Active Signer" value={signer} isAddress />
          <InfoRow label="BadgeMinter Owner" value={minterOwner} isAddress />
          <InfoRow label="BadgeTemplate Owner" value={templateOwner} isAddress />
          <InfoRow label="Authorized Minter" value={authorizedMinter} isAddress />
          <InfoRow label="BadgeTemplate Ref (on Minter)" value={badgeTemplateRef} isAddress />
        </div>
      </div>

      {/* Stats */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body">
          <h3 className="font-semibold text-base mb-4">Statistics</h3>
          <div className="stats stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Total Templates</div>
              <div className="stat-value text-primary">
                {totalTemplates !== null ? totalTemplates : <span className="loading loading-dots loading-sm" />}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Claims</div>
              <div className="stat-value text-secondary">
                {totalClaims !== null ? totalClaims : <span className="loading loading-dots loading-sm" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
  isAddress: isAddr,
}: {
  label: string;
  value: string | undefined;
  isAddress?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-base-content/60 shrink-0">{label}</span>
      {value ? (
        isAddr ? (
          <Address address={value as `0x${string}`} />
        ) : (
          <span className="font-mono text-xs">{value}</span>
        )
      ) : (
        <span className="text-base-content/30 italic">Not set</span>
      )}
    </div>
  );
}
