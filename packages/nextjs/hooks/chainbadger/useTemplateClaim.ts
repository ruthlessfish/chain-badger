"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimStep = "idle" | "requesting-signature" | "awaiting-transaction" | "success" | "error";

export interface TemplateClaimResult {
  /** Current step in the claim flow */
  step: ClaimStep;
  /** Call this to start the claim flow */
  claimBadge: (templateId: bigint) => Promise<void>;
  /** Error message if step === "error" */
  error: string | null;
  /** Transaction hash once confirmed */
  txHash: string | null;
  /** Reset back to idle */
  reset: () => void;
}

interface SignApiResponse {
  signature: `0x${string}`;
  deadline: number;
  badgeId: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full template badge claim flow:
 *  1. Request EIP-712 signature from `/api/sign-template-claim`
 *  2. Submit `BadgeMinter.claimTemplateBadge(templateId, deadline, signature)` on-chain
 *
 * Emits the `TemplateBadgeClaimed` event on success.
 */
export function useTemplateClaim(): TemplateClaimResult {
  const { address } = useAccount();
  const [step, setStep] = useState<ClaimStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "BadgeMinter" });

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }, []);

  const claimBadge = useCallback(
    async (templateId: bigint) => {
      if (!address) {
        setError("Connect your wallet first.");
        setStep("error");
        return;
      }

      setError(null);
      setTxHash(null);

      // ── Step 1: request backend signature ─────────────────────────────────
      setStep("requesting-signature");
      let signature: `0x${string}`;
      let deadline: number;

      try {
        const res = await fetch("/api/sign-template-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: address, templateId: templateId.toString() }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? `Server error: ${res.status}`);
        }

        ({ signature, deadline } = json as SignApiResponse);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to get signature.");
        setStep("error");
        return;
      }

      // ── Step 2: submit on-chain transaction ───────────────────────────────
      setStep("awaiting-transaction");
      try {
        const hash = await writeContractAsync({
          functionName: "claimTemplateBadge",
          args: [templateId, BigInt(deadline), signature],
        });

        setTxHash(hash ?? null);
        setStep("success");
      } catch (err: unknown) {
        // Surface user-friendly messages for common revert reasons
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("AlreadyClaimed")) {
          setError("You have already claimed this badge.");
        } else if (msg.includes("SupplyCapReached")) {
          setError("This badge has sold out.");
        } else if (msg.includes("TemplateNotActive")) {
          setError("This template is no longer active.");
        } else if (msg.includes("SignatureExpired")) {
          setError("Signature expired — please try again.");
        } else {
          setError(msg);
        }
        setStep("error");
      }
    },
    [address, writeContractAsync],
  );

  return { step, claimBadge, error, txHash, reset };
}
