"use client";

import { useCallback } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import type { Requirements } from "~~/types/badge";
import { encodeRequirements } from "~~/utils/requirementsDecoder";

/**
 * useTemplateAdminActions — write hooks for creator-accessible template management.
 *
 * All actions target the BadgeTemplate contract. On-chain enforcement (onlyTemplateCreator)
 * ensures only the template creator can execute these.
 */
export function useTemplateAdminActions() {
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "BadgeTemplate" });

  const deactivate = useCallback(
    async (templateId: bigint) => {
      await writeContractAsync({
        functionName: "deactivateTemplate",
        args: [templateId],
      });
    },
    [writeContractAsync],
  );

  const reactivate = useCallback(
    async (templateId: bigint) => {
      await writeContractAsync({
        functionName: "reactivateTemplate",
        args: [templateId],
      });
    },
    [writeContractAsync],
  );

  const archive = useCallback(
    async (templateId: bigint) => {
      await writeContractAsync({
        functionName: "archiveTemplate",
        args: [templateId],
      });
    },
    [writeContractAsync],
  );

  const updateMetadataURI = useCallback(
    async (templateId: bigint, uri: string) => {
      await writeContractAsync({
        functionName: "updateMetadataURI",
        args: [templateId, uri],
      });
    },
    [writeContractAsync],
  );

  const updateRequirements = useCallback(
    async (templateId: bigint, requirements: Requirements) => {
      const encoded = encodeRequirements(requirements);
      await writeContractAsync({
        functionName: "updateRequirements",
        args: [templateId, encoded],
      });
    },
    [writeContractAsync],
  );

  return { deactivate, reactivate, archive, updateMetadataURI, updateRequirements };
}
