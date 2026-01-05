"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface ClaimButtonProps {
  badgeId: bigint;
  badgeName: string;
  onClaimSuccess?: () => void;
  disabled?: boolean;
}

export const ClaimButton = ({ badgeId, badgeName, onClaimSuccess, disabled = false }: ClaimButtonProps) => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStep, setClaimStep] = useState<"idle" | "requesting" | "signing" | "minting">("idle");

  // Check if already claimed
  const { data: hasClaimed } = useScaffoldReadContract({
    contractName: "BadgeMinter",
    functionName: "hasClaimed",
    args: [address, badgeId],
  });

  const { writeContractAsync } = useScaffoldWriteContract("BadgeMinter");

  const handleClaim = async () => {
    if (!address) {
      notification.error("Please connect your wallet first");
      return;
    }

    if (hasClaimed) {
      notification.warning("You have already claimed this badge");
      return;
    }

    // Get BadgeMinter address from deployed contracts
    const chainId = targetNetwork.id;
    const contracts = deployedContracts as any;
    const badgeMinterAddress = contracts[chainId]?.BadgeMinter?.address;

    if (!badgeMinterAddress) {
      notification.error("BadgeMinter contract not deployed on this network");
      return;
    }

    setIsClaiming(true);
    setClaimStep("requesting");

    try {
      // Step 1: Request signature from backend
      notification.info("Requesting signature...");

      const response = await fetch("/api/sign-claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: address,
          badgeId: Number(badgeId),
          chainId: chainId,
          verifyingContract: badgeMinterAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get signature");
      }

      const { signature } = await response.json();

      // Step 2: Submit claim to contract
      setClaimStep("signing");
      notification.info("Please confirm the transaction in your wallet...");

      await writeContractAsync({
        functionName: "claimBadge",
        args: [badgeId, signature],
      });

      // Step 3: Success!
      setClaimStep("idle");
      notification.success(`Successfully claimed "${badgeName}"! 🎉`);

      if (onClaimSuccess) {
        onClaimSuccess();
      }
    } catch (error) {
      console.error("Error claiming badge:", error);
      setClaimStep("idle");

      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          notification.error("Transaction cancelled");
        } else if (error.message.includes("AlreadyClaimed")) {
          notification.warning("You have already claimed this badge");
        } else {
          notification.error(`Failed to claim badge: ${error.message}`);
        }
      } else {
        notification.error("Failed to claim badge. Please try again.");
      }
    } finally {
      setIsClaiming(false);
    }
  };

  if (hasClaimed) {
    return (
      <button className="btn btn-success btn-sm w-full" disabled>
        ✓ Claimed
      </button>
    );
  }

  return (
    <button
      onClick={handleClaim}
      disabled={disabled || isClaiming || !address}
      className="btn btn-primary btn-sm w-full"
    >
      {isClaiming ? (
        <>
          <span className="loading loading-spinner loading-xs"></span>
          {claimStep === "requesting" && "Requesting..."}
          {claimStep === "signing" && "Confirm in wallet..."}
          {claimStep === "minting" && "Minting..."}
        </>
      ) : (
        "Claim Badge"
      )}
    </button>
  );
};
