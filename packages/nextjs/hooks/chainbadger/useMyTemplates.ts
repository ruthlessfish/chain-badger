"use client";

import { useTemplates } from "./useTemplates";
import { useAccount } from "wagmi";
import type { BadgeTemplate } from "~~/types/badge";

export interface UseMyTemplatesResult {
  templates: BadgeTemplate[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * useMyTemplates — returns all templates created by the connected wallet.
 * Delegates to useTemplates with creatorFilter set to the connected address.
 * Includes archived templates so the creator can see their full history.
 */
export function useMyTemplates(): UseMyTemplatesResult {
  const { address } = useAccount();

  const result = useTemplates({
    creatorFilter: address,
    includeArchived: true,
  });

  return result;
}
