"use client";

import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export interface AdminStatus {
  /** Owner of the BadgeMinter contract */
  minterOwner: string | undefined;
  /** Owner of the BadgeTemplate contract */
  templateOwner: string | undefined;
  /** Authorized claim signer on BadgeMinter */
  signer: string | undefined;
  /** BadgeTemplate address stored on BadgeMinter */
  badgeTemplateRef: string | undefined;
  /** Authorized minter address on BadgeTemplate */
  authorizedMinter: string | undefined;
  /** True when connectedAddress === minterOwner */
  isOwner: boolean;
  isLoading: boolean;
}

/**
 * useAdminStatus — reads ownership, signer, and contract-reference state
 * needed to gate the Owner Controls panel.
 */
export function useAdminStatus(): AdminStatus {
  const { address: connectedAddress } = useAccount();

  const { data: minterOwner, isLoading: l1 } = useScaffoldReadContract({
    contractName: "BadgeMinter",
    functionName: "owner",
  });

  const { data: signer, isLoading: l2 } = useScaffoldReadContract({
    contractName: "BadgeMinter",
    functionName: "signer",
  });

  const { data: badgeTemplateRef, isLoading: l3 } = useScaffoldReadContract({
    contractName: "BadgeMinter",
    functionName: "badgeTemplate",
  });

  const { data: templateOwner, isLoading: l4 } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "owner",
  });

  const { data: authorizedMinter, isLoading: l5 } = useScaffoldReadContract({
    contractName: "BadgeTemplate",
    functionName: "authorizedMinter",
  });

  const isOwner =
    !!connectedAddress && !!minterOwner && connectedAddress.toLowerCase() === (minterOwner as string).toLowerCase();

  return {
    minterOwner: minterOwner as string | undefined,
    templateOwner: templateOwner as string | undefined,
    signer: signer as string | undefined,
    badgeTemplateRef: badgeTemplateRef as string | undefined,
    authorizedMinter: authorizedMinter as string | undefined,
    isOwner,
    isLoading: l1 || l2 || l3 || l4 || l5,
  };
}
