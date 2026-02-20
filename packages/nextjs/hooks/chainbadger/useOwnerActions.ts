"use client";

import { useCallback } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * useOwnerActions — write hooks for contract-owner administrative actions.
 *
 * setSigner and setBadgeTemplate target BadgeMinter (onlyOwner).
 * setAuthorizedMinter targets BadgeTemplate (onlyOwner).
 */
export function useOwnerActions() {
  const { writeContractAsync: writeMinter } = useScaffoldWriteContract({ contractName: "BadgeMinter" });
  const { writeContractAsync: writeTemplate } = useScaffoldWriteContract({ contractName: "BadgeTemplate" });

  const setSigner = useCallback(
    async (address: `0x${string}`) => {
      await writeMinter({
        functionName: "setSigner",
        args: [address],
      });
    },
    [writeMinter],
  );

  const setBadgeTemplate = useCallback(
    async (address: `0x${string}`) => {
      await writeMinter({
        functionName: "setBadgeTemplate",
        args: [address],
      });
    },
    [writeMinter],
  );

  const setAuthorizedMinter = useCallback(
    async (address: `0x${string}`) => {
      await writeTemplate({
        functionName: "setAuthorizedMinter",
        args: [address],
      });
    },
    [writeTemplate],
  );

  return { setSigner, setBadgeTemplate, setAuthorizedMinter };
}
