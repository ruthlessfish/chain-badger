"use client";

import { SetContractRefForm } from "./SetContractRefForm";
import { UpdateSignerForm } from "./UpdateSignerForm";
import { useAdminStatus } from "~~/hooks/chainbadger/useAdminStatus";
import { useOwnerActions } from "~~/hooks/chainbadger/useOwnerActions";

/**
 * OwnerControls — panel shown only when the connected wallet is the contract owner.
 * Provides forms for updating the signer, BadgeTemplate reference, and authorized minter.
 */
export function OwnerControls() {
  const { signer, badgeTemplateRef, authorizedMinter, isOwner, isLoading } = useAdminStatus();
  const { setBadgeTemplate, setAuthorizedMinter } = useOwnerActions();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-24 w-full rounded" />
        ))}
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body items-center text-center gap-4 py-12">
          <span className="text-5xl">🔒</span>
          <p className="text-lg font-semibold">Owner access required</p>
          <p className="text-sm text-base-content/60">Connect the contract owner wallet to manage these settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Update Signer */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-4">
          <h3 className="font-semibold text-base">Update Authorized Signer</h3>
          <p className="text-sm text-base-content/60">
            The signer wallet authorizes badge claims via EIP-712 signatures.
          </p>
          <UpdateSignerForm currentSigner={signer} />
        </div>
      </div>

      {/* Set BadgeTemplate reference */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-4">
          <h3 className="font-semibold text-base">Set BadgeTemplate Contract</h3>
          <p className="text-sm text-base-content/60">
            Update the BadgeTemplate contract reference on BadgeMinter. Useful after redeploying BadgeTemplate.
          </p>
          <SetContractRefForm
            label="BadgeTemplate"
            currentAddress={badgeTemplateRef}
            actionLabel="Set BadgeTemplate"
            onSubmit={setBadgeTemplate}
          />
        </div>
      </div>

      {/* Set Authorized Minter */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-4">
          <h3 className="font-semibold text-base">Set Authorized Minter</h3>
          <p className="text-sm text-base-content/60">
            Update the authorized minter on BadgeTemplate. Useful after redeploying BadgeMinter.
          </p>
          <SetContractRefForm
            label="Authorized Minter"
            currentAddress={authorizedMinter}
            actionLabel="Set Minter"
            onSubmit={setAuthorizedMinter}
          />
        </div>
      </div>
    </div>
  );
}
