"use client";

import { useAccount } from "wagmi";
import { ClaimStep, useTemplateClaim } from "~~/hooks/chainbadger/useTemplateClaim";
import { BadgeTemplate, getTemplateStatus } from "~~/types/badge";

interface Props {
  template: BadgeTemplate;
  eligible: boolean;
  eligLoading?: boolean;
}

const STEP_LABEL: Record<ClaimStep, string> = {
  idle: "Claim Badge",
  "requesting-signature": "Requesting signature…",
  "awaiting-transaction": "Confirming transaction…",
  success: "Claimed! 🎉",
  error: "Try Again",
};

export function TemplateClaimButton({ template, eligible, eligLoading = false }: Props) {
  const { address, isConnected } = useAccount();
  const { step, claimBadge, error, txHash, reset } = useTemplateClaim();

  const status = getTemplateStatus(template);
  const isPending = step === "requesting-signature" || step === "awaiting-transaction";
  const isSuccess = step === "success";
  const isError = step === "error";

  if (!isConnected || !address) {
    return (
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-5 items-center text-center gap-2">
          <p className="text-sm text-base-content/60">Connect your wallet to claim this badge</p>
        </div>
      </div>
    );
  }

  if (status !== "claimable") {
    return (
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-5 items-center text-center gap-2">
          <p className="text-sm text-base-content/60">
            This badge is currently <span className="font-semibold capitalize">{status.replace("-", " ")}</span> and
            cannot be claimed.
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="card bg-success/10 border border-success/30">
        <div className="card-body p-5 items-center text-center gap-3">
          <div className="text-4xl">🎉</div>
          <p className="font-semibold text-success">Badge claimed successfully!</p>
          {txHash && <p className="text-xs text-base-content/50 font-mono break-all">tx: {txHash}</p>}
          <button className="btn btn-sm btn-ghost mt-1" onClick={reset}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 border border-base-300 shadow-sm">
      <div className="card-body p-5 gap-3">
        {/* Progress stepper */}
        {isPending && (
          <ul className="steps steps-horizontal w-full text-xs mb-2">
            <li
              className={`step ${step === "requesting-signature" || step === "awaiting-transaction" ? "step-primary" : ""}`}
            >
              Signature
            </li>
            <li className={`step ${step === "awaiting-transaction" ? "step-primary" : ""}`}>On-chain</li>
          </ul>
        )}

        {/* Error message */}
        {isError && error && (
          <div className="alert alert-error text-sm py-2 px-3">
            <span>{error}</span>
          </div>
        )}

        {/* Eligibility gate */}
        {!eligLoading && !eligible && !isPending && (
          <p className="text-sm text-warning text-center">You don&apos;t meet the requirements to claim this badge.</p>
        )}

        <button
          className={`btn w-full ${isError ? "btn-warning" : "btn-primary"} ${isPending ? "btn-disabled" : ""}`}
          disabled={isPending || eligLoading || (!eligible && !isError)}
          onClick={() => {
            if (isError) reset();
            else claimBadge(template.templateId);
          }}
        >
          {isPending && <span className="loading loading-spinner loading-sm mr-2" />}
          {STEP_LABEL[step]}
        </button>
      </div>
    </div>
  );
}
