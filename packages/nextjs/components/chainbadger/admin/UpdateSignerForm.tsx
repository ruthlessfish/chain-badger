"use client";

import { useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import { isAddress } from "viem";
import { useOwnerActions } from "~~/hooks/chainbadger/useOwnerActions";

interface Props {
  /** Current signer address read from the contract */
  currentSigner: string | undefined;
}

/**
 * UpdateSignerForm — lets the contract owner update the authorized claim signer
 * on the BadgeMinter contract.
 */
export function UpdateSignerForm({ currentSigner }: Props) {
  const [newSigner, setNewSigner] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { setSigner } = useOwnerActions();

  const isValid = isAddress(newSigner);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await setSigner(newSigner as `0x${string}`);
      setSuccess(true);
      setNewSigner("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {currentSigner && (
        <p className="text-sm text-base-content/60">
          Current: <span className="font-mono text-xs">{currentSigner}</span>
        </p>
      )}
      <div className="form-control">
        <label className="label">
          <span className="label-text">New signer address</span>
        </label>
        <AddressInput value={newSigner} onChange={setNewSigner} placeholder="0x…" />
        <label className="label">
          <span className="label-text-alt text-base-content/40">
            Ensure you control this address — it will sign all badge claims.
          </span>
        </label>
      </div>

      {error && (
        <div className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success text-sm py-2">
          <span>Signer updated successfully!</span>
        </div>
      )}

      <div className="card-actions justify-end">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!isValid || submitting}>
          {submitting && <span className="loading loading-spinner loading-xs" />}
          Update Signer
        </button>
      </div>
    </form>
  );
}
