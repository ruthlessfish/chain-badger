"use client";

import { useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import { isAddress } from "viem";

interface Props {
  /** Human-readable label shown in the form (e.g. "BadgeTemplate Contract") */
  label: string;
  /** Current address from the contract */
  currentAddress: string | undefined;
  /** Button label */
  actionLabel: string;
  /** Called when the user submits a valid address */
  onSubmit: (address: `0x${string}`) => Promise<void>;
}

/**
 * SetContractRefForm — reusable form for updating a contract address reference.
 * Used for both setBadgeTemplate and setAuthorizedMinter actions.
 */
export function SetContractRefForm({ label, currentAddress, actionLabel, onSubmit }: Props) {
  const [newAddress, setNewAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid = isAddress(newAddress);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await onSubmit(newAddress as `0x${string}`);
      setSuccess(true);
      setNewAddress("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {currentAddress && (
        <p className="text-sm text-base-content/60">
          Current: <span className="font-mono text-xs">{currentAddress}</span>
        </p>
      )}
      <div className="form-control">
        <label className="label">
          <span className="label-text">New {label} address</span>
        </label>
        <AddressInput value={newAddress} onChange={setNewAddress} placeholder="0x…" />
      </div>

      {error && (
        <div className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success text-sm py-2">
          <span>Address updated successfully!</span>
        </div>
      )}

      <div className="card-actions justify-end">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!isValid || submitting}>
          {submitting && <span className="loading loading-spinner loading-xs" />}
          {actionLabel}
        </button>
      </div>
    </form>
  );
}
